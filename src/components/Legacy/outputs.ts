import { proto } from '@/components/SettingsContext/config';
import { ConvertedInput, INT16_OFFSET, LegacyImportContext } from './context';
import { convertInput } from './inputs';
import { legacy } from './legacy';

export type LegacyOutputKind = NonNullable<legacy.SerializedOutput['subtype']>;
export type OutputConverter = (ctx: LegacyImportContext, output: legacy.ISerializedOutput) => void;

const ST = proto.SubType;
const LIB = legacy.InstrumentButtonType;

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

// The old configurator's axis calculation (OutputAxis.Calculate), used to work out what a digital
// input driving an axis produced. Returns the old output value: 0 - 65535 for triggers,
// -32767 - 32767 otherwise.
export function oldCalculate(
  value: number,
  min: number,
  max: number,
  deadZone: number,
  trigger: boolean,
  inputIsUint: boolean
) {
  const map = (x: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
    inMax === inMin ? outMin : ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  let [val, fmin, fmax] = [value, min, max];
  let fcenter = (min + max) / 2;
  const inverted = fmin > fmax;
  if (trigger) {
    if (!inputIsUint) {
      [val, fmin, fmax] = [val + 32767, fmin + 32767, fmax + 32767];
    }
    if (inverted) {
      fmin -= deadZone;
      if (val > fmin) {
        return 0;
      }
      if (val < fmax) {
        val = fmax;
      }
    } else {
      fmin += deadZone;
      if (val < fmin) {
        return 0;
      }
      if (val > fmax) {
        val = fmax;
      }
    }
    return Math.max(0, Math.min(65535, map(val, fmin, fmax, 0, 65535)));
  }
  if (inputIsUint) {
    [val, fmin, fmax, fcenter] = [val - 32767, fmin - 32767, fmax - 32767, fcenter - 32767];
  }
  if (val < fcenter) {
    if (fcenter - val < deadZone) {
      return 0;
    }
    val = inverted
      ? map(val, fcenter - deadZone, fmax, 0, 32767)
      : map(val, fmin, fcenter - deadZone, -32767, 0);
  } else {
    if (val - fcenter < deadZone) {
      return 0;
    }
    val = inverted
      ? map(val, fmin, fcenter + deadZone, -32767, 0)
      : map(val, fcenter + deadZone, fmax, 0, 32767);
  }
  return Math.max(-32767, Math.min(32767, val));
}

interface AxisCalibration {
  min?: number | null;
  max?: number | null;
  deadzone?: number | null;
  // whether the old output was a trigger (unsigned) or a stick (signed)
  trigger: boolean;
}

function debounceFor(ctx: LegacyImportContext, local: number | null | undefined, strum = false) {
  const old = ctx.old;
  let debounce = local ?? 0;
  if (!old.localDebounceMode) {
    debounce = strum && (old.strumDebounce ?? 0) > 0 ? old.strumDebounce! : (old.debounce ?? 0);
  }
  // Without queued inputs the old firmware worked in whole milliseconds
  if (!old.queueBasedInputs) {
    debounce = Math.floor(debounce / 10) * 10;
  }
  return debounce;
}

export function addButton(
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput | null | undefined,
  output: proto.IOutput | undefined,
  debounce: number | null | undefined,
  options: { strum?: boolean; enabled?: boolean | null } = {}
) {
  if (!output || options.enabled === false) {
    return;
  }
  const converted = convertInput(ctx, input);
  if (!converted) {
    return;
  }
  addButtonMapping(ctx, converted, output, debounceFor(ctx, debounce, options.strum));
}

export function addButtonMapping(
  ctx: LegacyImportContext,
  converted: ConvertedInput,
  output: proto.IOutput,
  debounce100us?: number
) {
  const mapping: proto.IMapping = { mapping: output, input: converted.input, ...converted.mapping };
  if (converted.analog && mapping.trigger == null) {
    // An analog input on a button, treat it as pressed past half way like the old firmware did
    mapping.trigger = proto.AnalogToDigitalTriggerType.JoyHigh;
    mapping.triggerValue = converted.isUint ? 32767 : INT16_OFFSET;
  }
  if (debounce100us) {
    mapping.debounce100us = debounce100us;
  }
  ctx.mappings.push(mapping);
}

export function addAxis(
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput | null | undefined,
  output: proto.IOutput | undefined,
  calibration: AxisCalibration,
  enabled?: boolean | null
) {
  if (!output || enabled === false) {
    return;
  }
  const converted = convertInput(ctx, input);
  if (!converted) {
    return;
  }
  addAxisMapping(ctx, converted, output, calibration);
}

export function addAxisMapping(
  ctx: LegacyImportContext,
  converted: ConvertedInput,
  output: proto.IOutput,
  { min, max, deadzone, trigger }: AxisCalibration
): proto.IMapping {
  const mapping: proto.IMapping = { mapping: output, input: converted.input, ...converted.mapping };
  const offset = converted.isUint ? 0 : INT16_OFFSET;
  const scale = converted.scale ?? 1;
  const oldMin = min ?? (converted.isUint ? 0 : -32767);
  const oldMax = max ?? (converted.isUint ? 65535 : 32767);
  const toNewInput = (v: number) => Math.round(v * scale) + offset;
  const toNew = (v: number) => (trigger ? Math.round(v) : Math.round(v) + INT16_OFFSET);
  if (converted.digitalToAnalog) {
    // The old firmware put the digital value through the axis calibration, so do the same here
    const { on } = converted.digitalToAnalog;
    const calc = (v: number) =>
      oldCalculate(v, oldMin, oldMax, deadzone ?? 0, trigger, converted.isUint);
    mapping.pressed = Math.max(0, Math.min(65535, toNew(calc(on))));
    mapping.released = Math.max(0, Math.min(65535, toNew(calc(0))));
    mapping.center = mapping.released;
  } else if (!converted.analog) {
    mapping.min = 0;
    mapping.max = 65535;
    mapping.center = trigger ? 0 : 32767;
  } else {
    mapping.min = toNewInput(oldMin);
    mapping.max = toNewInput(oldMax);
    mapping.center = trigger ? 0 : toNewInput((oldMin + oldMax) / 2);
    mapping.deadzone = Math.round((deadzone ?? 0) * scale);
  }
  ctx.mappings.push(mapping);
  return mapping;
}

// ---------------------------------------------------------------------------
// Output types for the emulated controller
// ---------------------------------------------------------------------------

const GAMEPAD_BUTTONS: Record<legacy.StandardButtonType, proto.GamepadButtonType> = {
  [legacy.StandardButtonType.StandardButtonType_A]: proto.GamepadButtonType.Gamepad_A,
  [legacy.StandardButtonType.StandardButtonType_B]: proto.GamepadButtonType.Gamepad_B,
  [legacy.StandardButtonType.StandardButtonType_X]: proto.GamepadButtonType.Gamepad_X,
  [legacy.StandardButtonType.StandardButtonType_Y]: proto.GamepadButtonType.Gamepad_Y,
  [legacy.StandardButtonType.StandardButtonType_LeftShoulder]:
    proto.GamepadButtonType.Gamepad_LeftShoulder,
  [legacy.StandardButtonType.StandardButtonType_RightShoulder]:
    proto.GamepadButtonType.Gamepad_RightShoulder,
  [legacy.StandardButtonType.StandardButtonType_DpadUp]: proto.GamepadButtonType.Gamepad_DpadUp,
  [legacy.StandardButtonType.StandardButtonType_DpadDown]: proto.GamepadButtonType.Gamepad_DpadDown,
  [legacy.StandardButtonType.StandardButtonType_DpadLeft]: proto.GamepadButtonType.Gamepad_DpadLeft,
  [legacy.StandardButtonType.StandardButtonType_DpadRight]:
    proto.GamepadButtonType.Gamepad_DpadRight,
  [legacy.StandardButtonType.StandardButtonType_Start]: proto.GamepadButtonType.Gamepad_Start,
  [legacy.StandardButtonType.StandardButtonType_Back]: proto.GamepadButtonType.Gamepad_Back,
  [legacy.StandardButtonType.StandardButtonType_Guide]: proto.GamepadButtonType.Gamepad_Guide,
  [legacy.StandardButtonType.StandardButtonType_Capture]: proto.GamepadButtonType.Gamepad_Capture,
  [legacy.StandardButtonType.StandardButtonType_LeftThumbClick]:
    proto.GamepadButtonType.Gamepad_LeftThumbClick,
  [legacy.StandardButtonType.StandardButtonType_RightThumbClick]:
    proto.GamepadButtonType.Gamepad_RightThumbClick,
};

const GAMEPAD_AXES: Record<legacy.StandardAxisType, proto.GamepadAxisType> = {
  [legacy.StandardAxisType.StandardAxisType_LeftStickX]: proto.GamepadAxisType.Gamepad_LeftStickX,
  [legacy.StandardAxisType.StandardAxisType_LeftStickY]: proto.GamepadAxisType.Gamepad_LeftStickY,
  [legacy.StandardAxisType.StandardAxisType_RightStickX]: proto.GamepadAxisType.Gamepad_RightStickX,
  [legacy.StandardAxisType.StandardAxisType_RightStickY]: proto.GamepadAxisType.Gamepad_RightStickY,
  [legacy.StandardAxisType.StandardAxisType_LeftTrigger]: proto.GamepadAxisType.Gamepad_LeftTrigger,
  [legacy.StandardAxisType.StandardAxisType_RightTrigger]:
    proto.GamepadAxisType.Gamepad_RightTrigger,
};

const COLOURS = ['Green', 'Red', 'Yellow', 'Blue', 'Orange'] as const;

// The old 5 fret / solo button types, by colour index
function fretIndex(
  type: legacy.InstrumentButtonType
): { index: number; solo: boolean } | undefined {
  if (type >= LIB.InstrumentButtonType_Green && type <= LIB.InstrumentButtonType_Orange) {
    return { index: type - LIB.InstrumentButtonType_Green, solo: false };
  }
  if (type >= LIB.InstrumentButtonType_SoloGreen && type <= LIB.InstrumentButtonType_SoloOrange) {
    return { index: type - LIB.InstrumentButtonType_SoloGreen, solo: true };
  }
  return undefined;
}

const FACE_BUTTONS = [
  proto.GamepadButtonType.Gamepad_A,
  proto.GamepadButtonType.Gamepad_B,
  proto.GamepadButtonType.Gamepad_Y,
  proto.GamepadButtonType.Gamepad_X,
  proto.GamepadButtonType.Gamepad_LeftShoulder,
];

export function guitarButtonOutput(
  ctx: LegacyImportContext,
  type: legacy.InstrumentButtonType
): proto.IOutput | undefined {
  if (type === LIB.InstrumentButtonType_StrumUp || type === LIB.InstrumentButtonType_StrumDown) {
    const up = type === LIB.InstrumentButtonType_StrumUp;
    if (ctx.subType === ST.LiveGuitar) {
      return {
        ghlButton: up
          ? proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumUp
          : proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumDown,
      };
    }
    return {
      gamepadButton: up
        ? proto.GamepadButtonType.Gamepad_DpadUp
        : proto.GamepadButtonType.Gamepad_DpadDown,
    };
  }
  if (type >= LIB.InstrumentButtonType_Black1 && type <= LIB.InstrumentButtonType_White3) {
    const ghl = proto.GuitarHeroLiveGuitarButtonType;
    const buttons = [
      ghl.GuitarHeroLiveGuitar_Black1,
      ghl.GuitarHeroLiveGuitar_Black2,
      ghl.GuitarHeroLiveGuitar_Black3,
      ghl.GuitarHeroLiveGuitar_White1,
      ghl.GuitarHeroLiveGuitar_White2,
      ghl.GuitarHeroLiveGuitar_White3,
    ];
    return { ghlButton: buttons[type - LIB.InstrumentButtonType_Black1] };
  }
  const fret = fretIndex(type);
  if (!fret) {
    ctx.warn('GH5 slider bindings were skipped, set the slider up again with the GH5 neck.');
    return undefined;
  }
  const colour = COLOURS[fret.index];
  switch (ctx.subType) {
    case ST.GuitarHeroGuitar:
      return {
        ghButton:
          proto.GuitarHeroGuitarButtonType[
            `GuitarHeroGuitar_${fret.solo ? 'Tap' : ''}${colour}` as keyof typeof proto.GuitarHeroGuitarButtonType
          ],
      };
    case ST.RockBandGuitar:
      return {
        rbButton:
          proto.RockBandGuitarButtonType[
            `RockBandGuitar_${fret.solo ? 'Solo' : ''}${colour}` as keyof typeof proto.RockBandGuitarButtonType
          ],
      };
    case ST.ProGuitarMustang:
    case ST.ProGuitarSquire:
      return {
        proButton:
          proto.ProGuitarButtonType[
            `ProGuitar_${fret.solo ? 'Solo' : ''}${colour}` as keyof typeof proto.ProGuitarButtonType
          ],
      };
    default:
      return { gamepadButton: FACE_BUTTONS[fret.index] };
  }
}

function guitarAxisOutput(
  ctx: LegacyImportContext,
  type: legacy.GuitarAxisType
): proto.IOutput | undefined {
  const GA = legacy.GuitarAxisType;
  switch (type) {
    case GA.GuitarAxisType_Whammy:
      switch (ctx.subType) {
        case ST.GuitarHeroGuitar:
          return { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy };
        case ST.LiveGuitar:
          return { ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy };
        case ST.RockBandGuitar:
          return { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy };
        default:
          return { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX };
      }
    case GA.GuitarAxisType_Tilt:
      switch (ctx.subType) {
        case ST.GuitarHeroGuitar:
          return { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt };
        case ST.LiveGuitar:
          return { ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt };
        case ST.RockBandGuitar:
          return { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Tilt };
        case ST.ProGuitarMustang:
        case ST.ProGuitarSquire:
          return { proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt };
        default:
          return { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY };
      }
    case GA.GuitarAxisType_Pickup:
      if (ctx.subType === ST.RockBandGuitar) {
        return { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup };
      }
      ctx.warn('A pickup selector binding was skipped, only Rock Band guitars have one.');
      return undefined;
    default:
      ctx.warn('GH5 slider bindings were skipped, set the slider up again with the GH5 neck.');
      return undefined;
  }
}

const DRUMS = legacy.DrumAxisType;

function drumOutput(
  ctx: LegacyImportContext,
  type: legacy.DrumAxisType
): { output: proto.IOutput; button: boolean } | undefined {
  if (ctx.subType === ST.GuitarHeroDrums) {
    const gh = proto.GuitarHeroDrumsAxisType;
    const outputs: Partial<Record<legacy.DrumAxisType, proto.GuitarHeroDrumsAxisType>> = {
      [DRUMS.DrumAxisType_Green]: gh.GuitarHeroDrums_GreenPad,
      [DRUMS.DrumAxisType_Red]: gh.GuitarHeroDrums_RedPad,
      [DRUMS.DrumAxisType_Yellow]: gh.GuitarHeroDrums_YellowPad,
      [DRUMS.DrumAxisType_Blue]: gh.GuitarHeroDrums_BluePad,
      [DRUMS.DrumAxisType_Orange]: gh.GuitarHeroDrums_OrangePad,
      [DRUMS.DrumAxisType_Kick]: gh.GuitarHeroDrums_KickPedal,
      [DRUMS.DrumAxisType_Kick2]: gh.GuitarHeroDrums_KickPedal,
    };
    const output = outputs[type];
    return output == null ? undefined : { output: { ghDrumAxis: output }, button: false };
  }
  const rb = proto.RockBandDrumsAxisType;
  if (type === DRUMS.DrumAxisType_Kick || type === DRUMS.DrumAxisType_Kick2) {
    return {
      output: {
        rbDrumButton:
          type === DRUMS.DrumAxisType_Kick
            ? proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal
            : proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal,
      },
      button: true,
    };
  }
  const outputs: Partial<Record<legacy.DrumAxisType, proto.RockBandDrumsAxisType>> = {
    [DRUMS.DrumAxisType_Green]: rb.RockBandDrums_GreenPad,
    [DRUMS.DrumAxisType_Red]: rb.RockBandDrums_RedPad,
    [DRUMS.DrumAxisType_Yellow]: rb.RockBandDrums_YellowPad,
    [DRUMS.DrumAxisType_Blue]: rb.RockBandDrums_BluePad,
    [DRUMS.DrumAxisType_GreenCymbal]: rb.RockBandDrums_GreenCymbal,
    [DRUMS.DrumAxisType_YellowCymbal]: rb.RockBandDrums_YellowCymbal,
    [DRUMS.DrumAxisType_BlueCymbal]: rb.RockBandDrums_BlueCymbal,
  };
  const output = outputs[type];
  return output == null ? undefined : { output: { rbDrumAxis: output }, button: false };
}

const DJ_BUTTONS: Partial<Record<legacy.DjInputType, proto.DJHTurntableButtonType>> = {
  [legacy.DjInputType.DjInputType_LeftGreen]: proto.DJHTurntableButtonType.DJHTurntable_LeftGreen,
  [legacy.DjInputType.DjInputType_LeftRed]: proto.DJHTurntableButtonType.DJHTurntable_LeftRed,
  [legacy.DjInputType.DjInputType_LeftBlue]: proto.DJHTurntableButtonType.DJHTurntable_LeftBlue,
  [legacy.DjInputType.DjInputType_RightGreen]: proto.DJHTurntableButtonType.DJHTurntable_RightGreen,
  [legacy.DjInputType.DjInputType_RightRed]: proto.DJHTurntableButtonType.DJHTurntable_RightRed,
  [legacy.DjInputType.DjInputType_RightBlue]: proto.DJHTurntableButtonType.DJHTurntable_RightBlue,
};

const DJ_AXES: Record<legacy.DjAxisType, proto.DJHTurntableAxisType> = {
  [legacy.DjAxisType.DjAxisType_EffectsKnob]: proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob,
  [legacy.DjAxisType.DjAxisType_Crossfader]: proto.DJHTurntableAxisType.DJHTurntable_Crossfader,
  [legacy.DjAxisType.DjAxisType_LeftTableVelocity]:
    proto.DJHTurntableAxisType.DJHTurntable_LeftVelocity,
  [legacy.DjAxisType.DjAxisType_RightTableVelocity]:
    proto.DJHTurntableAxisType.DJHTurntable_RightVelocity,
};

const PRO_GUITAR_AXES: Record<legacy.ProGuitarType, proto.ProGuitarAxisType> = {
  [legacy.ProGuitarType.ProGuitarType_LowEFret]: proto.ProGuitarAxisType.ProGuitar_LowEFret,
  [legacy.ProGuitarType.ProGuitarType_AFret]: proto.ProGuitarAxisType.ProGuitar_AFret,
  [legacy.ProGuitarType.ProGuitarType_DFret]: proto.ProGuitarAxisType.ProGuitar_DFret,
  [legacy.ProGuitarType.ProGuitarType_GFret]: proto.ProGuitarAxisType.ProGuitar_GFret,
  [legacy.ProGuitarType.ProGuitarType_BFret]: proto.ProGuitarAxisType.ProGuitar_BFret,
  [legacy.ProGuitarType.ProGuitarType_HighEFret]: proto.ProGuitarAxisType.ProGuitar_HighEFret,
  [legacy.ProGuitarType.ProGuitarType_LowEFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_LowEFretVelocity,
  [legacy.ProGuitarType.ProGuitarType_AFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_AFretVelocity,
  [legacy.ProGuitarType.ProGuitarType_DFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_DFretVelocity,
  [legacy.ProGuitarType.ProGuitarType_GFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_GFretVelocity,
  [legacy.ProGuitarType.ProGuitarType_BFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_BFretVelocity,
  [legacy.ProGuitarType.ProGuitarType_HighEFretVelocity]:
    proto.ProGuitarAxisType.ProGuitar_HighEFretVelocity,
};

const MOUSE_BUTTONS: Record<legacy.MouseButtonType, proto.MouseButtonType> = {
  [legacy.MouseButtonType.MouseButtonType_Left]: proto.MouseButtonType.Mouse_Left,
  [legacy.MouseButtonType.MouseButtonType_Right]: proto.MouseButtonType.Mouse_Right,
  [legacy.MouseButtonType.MouseButtonType_Middle]: proto.MouseButtonType.Mouse_Middle,
};

const MOUSE_AXES: Record<legacy.MouseAxisType, proto.MouseAxisType> = {
  [legacy.MouseAxisType.MouseAxisType_X]: proto.MouseAxisType.Mouse_MoveX,
  [legacy.MouseAxisType.MouseAxisType_Y]: proto.MouseAxisType.Mouse_MoveY,
  [legacy.MouseAxisType.MouseAxisType_ScrollX]: proto.MouseAxisType.Mouse_ScrollX,
  [legacy.MouseAxisType.MouseAxisType_ScrollY]: proto.MouseAxisType.Mouse_ScrollY,
};

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

const CORE_OUTPUTS: Partial<Record<LegacyOutputKind, OutputConverter>> = {
  serializedControllerButton: (ctx, { serializedControllerButton: o }) =>
    addButton(ctx, o!.input, { gamepadButton: GAMEPAD_BUTTONS[o!.type ?? 0] }, o!.debounce, {
      enabled: o!.enabled,
    }),

  serializedControllerAxis: (ctx, { serializedControllerAxis: o }) => {
    const type = o!.type ?? legacy.StandardAxisType.StandardAxisType_LeftStickX;
    const trigger =
      type === legacy.StandardAxisType.StandardAxisType_LeftTrigger ||
      type === legacy.StandardAxisType.StandardAxisType_RightTrigger;
    if (o!.enabled === false) {
      return;
    }
    const converted = convertInput(ctx, o!.input);
    if (!converted) {
      return;
    }
    // A half axis drives the axis from its centre to one end, calibrated like a trigger
    const section =
      o!.section === legacy.SectionType.SectionType_TopHalf
        ? proto.AxisSection.AxisSectionPositive
        : o!.section === legacy.SectionType.SectionType_BottomHalf
          ? proto.AxisSection.AxisSectionNegative
          : undefined;
    const mapping = addAxisMapping(
      ctx,
      converted,
      { gamepadAxis: GAMEPAD_AXES[type] },
      {
        min: o!.min,
        max: o!.max,
        deadzone: o!.deadzone,
        trigger: trigger || section != null,
      }
    );
    if (section != null) {
      mapping.section = section;
    }
  },

  serializedGuitarButton: (ctx, binding) => {
    const o = binding.serializedGuitarButton;
    const type = o!.type ?? LIB.InstrumentButtonType_Green;
    if (
      (type === LIB.InstrumentButtonType_Slider ||
        type === LIB.InstrumentButtonType_SliderToFrets) &&
      convertTapBar(ctx, binding)
    ) {
      return;
    }
    const strum =
      type === LIB.InstrumentButtonType_StrumUp || type === LIB.InstrumentButtonType_StrumDown;
    addButton(ctx, o!.input, guitarButtonOutput(ctx, type), o!.debounce, {
      strum,
      enabled: o!.enabled,
    });
  },

  serializedGuitarAxis: (ctx, binding) => {
    const o = binding.serializedGuitarAxis;
    if (o!.enabled === false) {
      return;
    }
    const type = o!.type ?? legacy.GuitarAxisType.GuitarAxisType_Whammy;
    if (type === legacy.GuitarAxisType.GuitarAxisType_Slider && convertTapBar(ctx, binding)) {
      return;
    }
    const output = guitarAxisOutput(ctx, type);
    const converted = output && convertInput(ctx, o!.input);
    if (!output || !converted) {
      return;
    }
    if (type === legacy.GuitarAxisType.GuitarAxisType_Pickup) {
      // The old firmware compared the raw value against the notches, the new one calibrates first,
      // so a full range calibration keeps the same notches
      const offset = converted.isUint ? 0 : INT16_OFFSET;
      const notches = [
        o!.pickupSelectorNotch2,
        o!.pickupSelectorNotch3,
        o!.pickupSelectorNotch4,
        o!.pickupSelectorNotch5,
      ];
      ctx.mappings.push({
        mapping: output,
        input: converted.input,
        ...converted.mapping,
        min: 0,
        max: 65535,
        center: 0,
        ...(notches.every((n) => n != null)
          ? { pickupThresholds: notches.map((n) => n! + offset) }
          : {}),
      });
      return;
    }
    const trigger = type === legacy.GuitarAxisType.GuitarAxisType_Whammy;
    addAxisMapping(ctx, converted, output, {
      min: o!.min,
      max: o!.max,
      deadzone: type === legacy.GuitarAxisType.GuitarAxisType_Tilt ? 0 : o!.deadzone,
      trigger,
    });
  },

  serializedDrumAxis: (ctx, { serializedDrumAxis: o }) => {
    if (o!.enabled === false) {
      return;
    }
    const target = drumOutput(ctx, o!.type ?? DRUMS.DrumAxisType_Green);
    if (!target) {
      ctx.warn("A drum binding that the emulated drum kit doesn't have was skipped.");
      return;
    }
    if (o!.sensitivityInput) {
      ctx.warn('Drum sensitivity inputs were skipped.');
    }
    const converted = convertInput(ctx, o!.input);
    if (!converted) {
      return;
    }
    const debounce = debounceFor(ctx, o!.debounce);
    if (target.button) {
      // Kick pedals are buttons now, so an analog (piezo) kick uses its old threshold
      const mapping: proto.IMapping = {
        mapping: target.output,
        input: converted.input,
        ...converted.mapping,
      };
      if (converted.analog && mapping.trigger == null) {
        mapping.trigger = proto.AnalogToDigitalTriggerType.JoyHigh;
        mapping.triggerValue =
          (o!.min ?? 0) + (o!.deadzone ?? 0) + (converted.isUint ? 0 : INT16_OFFSET);
      }
      if (debounce) {
        mapping.debounce100us = debounce;
      }
      ctx.mappings.push(mapping);
      return;
    }
    const added = addAxisMapping(ctx, converted, target.output, {
      min: o!.min,
      max: o!.max,
      deadzone: o!.deadzone,
      trigger: true,
    });
    if (debounce) {
      added.debounce100us = debounce;
    }
  },

  serializedDjButton: (ctx, { serializedDjButton: o }) => {
    const output = DJ_BUTTONS[o!.type ?? 0];
    if (output == null) {
      ctx.warn('A turntable binding was skipped.');
      return;
    }
    addButton(ctx, o!.input, { djhButton: output }, o!.debounce, { enabled: o!.enabled });
  },

  serializedDjAxis: (ctx, { serializedDjAxis: o }) => {
    const type = o!.type ?? legacy.DjAxisType.DjAxisType_EffectsKnob;
    const velocity =
      type === legacy.DjAxisType.DjAxisType_LeftTableVelocity ||
      type === legacy.DjAxisType.DjAxisType_RightTableVelocity;
    if (velocity && (o!.deadzoneOrMultiplier ?? 0) > 1) {
      ctx.warn('Turntable velocity multipliers were skipped.');
    }
    addAxis(
      ctx,
      o!.input,
      { djhAxis: DJ_AXES[type] },
      {
        min: o!.min,
        max: o!.max,
        deadzone: velocity ? 0 : o!.deadzoneOrMultiplier,
        trigger: false,
      },
      o!.enabled
    );
  },

  serializedProGuitarAxis: (ctx, { serializedProGuitarAxis: o }) =>
    addAxis(
      ctx,
      o!.input,
      { proAxis: PRO_GUITAR_AXES[o!.type ?? 0] },
      { min: o!.min, max: o!.max, deadzone: o!.deadzone, trigger: true },
      o!.enabled
    ),

  serializedPianoKey: (ctx, { serializedPianoKey: o }) =>
    pianoKey(ctx, o!.input, o!.type, o!.enabled),
  serializedPianoKeyButton: (ctx, { serializedPianoKeyButton: o }) =>
    pianoKey(ctx, o!.input, o!.type, o!.enabled),

  serializedMouseButton: (ctx, { serializedMouseButton: o }) =>
    addButton(ctx, o!.input, { mouseButton: MOUSE_BUTTONS[o!.type ?? 0] }, o!.debounce, {
      enabled: o!.enabled,
    }),

  serializedMouseAxis: (ctx, { serializedMouseAxis: o }) =>
    addAxis(
      ctx,
      o!.input,
      { mouseAxis: MOUSE_AXES[o!.type ?? 0] },
      { min: o!.min, max: o!.max, deadzone: o!.deadzone, trigger: false },
      o!.enabled
    ),

  serializedPs3Axis: (ctx) =>
    ctx.warn(
      'PS3 pressure bindings were skipped, the new firmware works out button pressure itself.'
    ),

  serializedReset: (ctx, { serializedReset: o }) =>
    addButton(ctx, o!.input, { action: proto.ActionType.ActionBootloader }, 0, {
      enabled: o!.enabled,
    }),

  serializedWakeup360: (ctx) => ctx.warn('The Xbox 360 wakeup binding was skipped.'),
};

function pianoKey(
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput | null | undefined,
  type: legacy.ProKeyType | null | undefined,
  enabled: boolean | null | undefined
) {
  const K = legacy.ProKeyType;
  const key = type ?? K.ProKeyType_Key1;
  if (key <= K.ProKeyType_Key25) {
    addButton(ctx, input, { proKeySingle: key - K.ProKeyType_Key1 + 1 }, 0, { enabled });
  } else if (key === K.ProKeyType_Overdrive) {
    addButton(
      ctx,
      input,
      { proKeyboardButton: proto.ProKeyboardButtonType.ProKeyboardOverdrive },
      0,
      { enabled }
    );
  } else {
    const axis =
      key === K.ProKeyType_TouchPad
        ? proto.ProKeyboardAxisType.ProKeyboardTouchPad
        : proto.ProKeyboardAxisType.ProKeyboardPedal;
    addAxis(
      ctx,
      input,
      { proKeyboardAxis: axis },
      { trigger: axis === proto.ProKeyboardAxisType.ProKeyboardPedal },
      enabled
    );
  }
}

const familyOutputs: Partial<Record<LegacyOutputKind, OutputConverter>> = {};

// Tap bar (GH5 slider) bindings depend on what the tap bar was read from, so the families that
// know about tap bars convert them. Each returns true when it handled the binding.
type TapBarConverter = (ctx: LegacyImportContext, output: legacy.ISerializedOutput) => boolean;
const tapBarConverters: TapBarConverter[] = [];

export function registerTapBarConverter(converter: TapBarConverter) {
  tapBarConverters.push(converter);
}

function convertTapBar(ctx: LegacyImportContext, output: legacy.ISerializedOutput) {
  return tapBarConverters.some((converter) => converter(ctx, output));
}

export function registerOutputConverters(
  converters: Partial<Record<LegacyOutputKind, OutputConverter>>
) {
  Object.assign(familyOutputs, converters);
}

export function convertOutput(
  ctx: LegacyImportContext,
  output: legacy.ISerializedOutput | null | undefined
) {
  const kind =
    output && (legacy.SerializedOutput.fromObject(output).subtype as LegacyOutputKind | undefined);
  if (!kind) {
    return;
  }
  if (ctx.combined) {
    ctx.combinedSources.set(output, ctx.combined);
  }
  const converter = familyOutputs[kind] ?? CORE_OUTPUTS[kind];
  if (!converter) {
    ctx.warn(
      `Bindings of type ${kind.replace(/^serialized/, '')} can't be imported yet, so they were skipped.`
    );
    return;
  }
  converter(ctx, output);
}

// Converts the bindings inside a combined output, with combined inputs reading from `source`
export function convertCombinedChildren(
  ctx: LegacyImportContext,
  source: { kind: string; deviceid: number },
  outputs: legacy.ISerializedOutput[] | null | undefined
) {
  const previous = ctx.combined;
  ctx.combined = source;
  for (const child of outputs ?? []) {
    convertOutput(ctx, child);
  }
  ctx.combined = previous;
}
