import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
import { MIDI_PERCUSSION_CHANNEL } from '@/devices/midi';
import { DeviceStatusLike, getDefaultMappings } from './defaultMappings';

// A preset generates an instrument's default mappings for a device, then rewrites their
// outputs for a different kind of emulated device (e.g. guitar frets -> keyboard keys).
export type MappingPreset = {
  id: string;
  // profile subtypes the preset can be loaded into
  subTypes: proto.SubType[];
  // the instrument whose defaults get converted
  source: proto.SubType;
  convert: (mapping: proto.IMapping) => proto.IMapping[];
  extra?: (deviceId: number) => proto.IMapping[];
};

const key = (code: keyof typeof CODE_TO_HID) => ({ keycode: CODE_TO_HID[code] });

function withOutput(mapping: proto.IMapping, output: proto.IOutput): proto.IMapping {
  return { ...mapping, mapping: output };
}

// Turn an analog mapping into a button that is held once the input is `fraction` of the way
// through its calibrated range, using the raw input like the firmware's trigger does
function analogAsButton(mapping: proto.IMapping, output: proto.IOutput, fraction: number) {
  const min = mapping.min ?? 0;
  const max = mapping.max ?? 65535;
  const inverted = min > max;
  return {
    mapping: output,
    input: mapping.input,
    trigger: inverted
      ? proto.AnalogToDigitalTriggerType.JoyLow
      : proto.AnalogToDigitalTriggerType.JoyHigh,
    triggerValue: Math.round(min + (max - min) * fraction),
  };
}

const FRET_OUTPUTS = (keys: (keyof typeof CODE_TO_HID)[]) => ({
  gh: {
    [proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green]: keys[0],
    [proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red]: keys[1],
    [proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow]: keys[2],
    [proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue]: keys[3],
    [proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange]: keys[4],
  } as Record<number, keyof typeof CODE_TO_HID>,
  rb: {
    [proto.RockBandGuitarButtonType.RockBandGuitar_Green]: keys[0],
    [proto.RockBandGuitarButtonType.RockBandGuitar_Red]: keys[1],
    [proto.RockBandGuitarButtonType.RockBandGuitar_Yellow]: keys[2],
    [proto.RockBandGuitarButtonType.RockBandGuitar_Blue]: keys[3],
    [proto.RockBandGuitarButtonType.RockBandGuitar_Orange]: keys[4],
    [proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen]: keys[0],
    [proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed]: keys[1],
    [proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow]: keys[2],
    [proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue]: keys[3],
    [proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange]: keys[4],
  } as Record<number, keyof typeof CODE_TO_HID>,
});

// Fortnite Festival's keyboard bindings, as santroller v1 used them
function festivalGuitar(pro: boolean) {
  const frets = FRET_OUTPUTS(
    pro
      ? ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']
      : ['KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']
  );
  const strumUp = pro ? 'ShiftRight' : 'ArrowUp';
  const strumDown = pro ? 'ControlRight' : 'ArrowDown';
  return (mapping: proto.IMapping): proto.IMapping[] => {
    const out = mapping.mapping ?? {};
    if (out.ghButton != null && frets.gh[out.ghButton]) {
      return [withOutput(mapping, key(frets.gh[out.ghButton]))];
    }
    if (out.rbButton != null && frets.rb[out.rbButton]) {
      return [withOutput(mapping, key(frets.rb[out.rbButton]))];
    }
    switch (out.gamepadButton) {
      case proto.GamepadButtonType.Gamepad_DpadUp:
        return [withOutput(mapping, key(strumUp))];
      case proto.GamepadButtonType.Gamepad_DpadDown:
        return [withOutput(mapping, key(strumDown))];
      case proto.GamepadButtonType.Gamepad_Back:
        return [withOutput(mapping, key('Space'))];
    }
    if (pro) {
      const tilt =
        out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt ||
        out.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Tilt;
      const whammy =
        out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy ||
        out.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Whammy;
      if (tilt) {
        return [analogAsButton(mapping, key('PageDown'), 240 / 255)];
      }
      if (whammy) {
        return [analogAsButton(mapping, key('Slash'), 0.5)];
      }
    }
    return [];
  };
}

// Festival only has Rock Band's four lanes, so a Guitar Hero kit's five are laid out the way games
// usually convert them: the yellow and orange cymbals as Rock Band's yellow and green cymbals, and
// the green pad as Rock Band's
const GH_DRUMS_AS_RB: Partial<Record<proto.GuitarHeroDrumsAxisType, proto.RockBandDrumsAxisType>> =
  {
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad]:
      proto.RockBandDrumsAxisType.RockBandDrums_RedPad,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad]:
      proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad]:
      proto.RockBandDrumsAxisType.RockBandDrums_BluePad,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad]:
      proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad]:
      proto.RockBandDrumsAxisType.RockBandDrums_GreenPad,
  };

function festivalDrums(pro: boolean) {
  const pads: Partial<Record<proto.RockBandDrumsAxisType, keyof typeof CODE_TO_HID>> = pro
    ? {
        [proto.RockBandDrumsAxisType.RockBandDrums_RedPad]: 'KeyD',
        [proto.RockBandDrumsAxisType.RockBandDrums_YellowPad]: 'KeyF',
        [proto.RockBandDrumsAxisType.RockBandDrums_BluePad]: 'KeyJ',
        [proto.RockBandDrumsAxisType.RockBandDrums_GreenPad]: 'KeyK',
        [proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal]: 'KeyR',
        [proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal]: 'KeyU',
        [proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal]: 'KeyI',
      }
    : {
        [proto.RockBandDrumsAxisType.RockBandDrums_RedPad]: 'KeyF',
        [proto.RockBandDrumsAxisType.RockBandDrums_YellowPad]: 'KeyG',
        [proto.RockBandDrumsAxisType.RockBandDrums_BluePad]: 'KeyH',
        [proto.RockBandDrumsAxisType.RockBandDrums_GreenPad]: 'KeyJ',
        // without pro, cymbals play as their matching pad
        [proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal]: 'KeyG',
        [proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal]: 'KeyH',
        [proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal]: 'KeyJ',
      };
  const kicks: Partial<Record<proto.RockBandDrumsButtonType, keyof typeof CODE_TO_HID>> = pro
    ? {
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal]: 'Space',
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal]: 'ControlRight',
      }
    : {
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal]: 'KeyK',
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal]: 'KeyK',
      };
  return (mapping: proto.IMapping): proto.IMapping[] => {
    const out = mapping.mapping ?? {};
    const lane = out.rbDrumAxis ?? (out.ghDrumAxis != null ? GH_DRUMS_AS_RB[out.ghDrumAxis] : null);
    const pad = lane != null ? pads[lane] : undefined;
    if (pad) {
      // any hit at all counts, the debounce keeps the key down long enough to register
      return [{ ...analogAsButton(mapping, key(pad), 0.1), debounce: mapping.debounce }];
    }
    // A Guitar Hero kit's kick is an axis, so it's a hit like the pads
    if (out.ghDrumAxis === proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal) {
      const kickKey = kicks[proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal]!;
      return [{ ...analogAsButton(mapping, key(kickKey), 0.1), debounce: mapping.debounce }];
    }
    const kick = out.rbDrumButton != null ? kicks[out.rbDrumButton] : undefined;
    if (kick) {
      return [withOutput(mapping, key(kick))];
    }
    return [];
  };
}

// General MIDI percussion, which is what drum modules send and what games and DAWs expect
export const GM_DRUMS = {
  kick: 36,
  snare: 38,
  floorTom: 43,
  closedHiHat: 42,
  lowTom: 45,
  highTom: 48,
  crash: 49,
  ride: 51,
} as const;

const drumNote = (note: number): proto.IOutput => ({
  midiNote: { channel: MIDI_PERCUSSION_CHANNEL, note },
});

// Drum pads as General MIDI notes. Pads keep their calibration, which the firmware uses to scale
// how hard they're hit into the velocity
function midiDrums(
  pads: Partial<Record<number, number>>,
  padOf: (out: proto.IOutput) => number | null | undefined,
  kicks: Partial<Record<number, number>>,
  kickOf: (out: proto.IOutput) => number | null | undefined
) {
  return (mapping: proto.IMapping): proto.IMapping[] => {
    const out = mapping.mapping ?? {};
    const padId = padOf(out);
    const pad = padId != null ? pads[padId] : undefined;
    if (pad != null) {
      return [
        {
          ...analogAsButton(mapping, drumNote(pad), 0.1),
          min: mapping.min,
          max: mapping.max,
          deadzone: mapping.deadzone,
          debounce: mapping.debounce,
        },
      ];
    }
    const kickId = kickOf(out);
    const kick = kickId != null ? kicks[kickId] : undefined;
    if (kick != null) {
      return [withOutput(mapping, drumNote(kick))];
    }
    return [];
  };
}

const rbMidiDrums = midiDrums(
  {
    [proto.RockBandDrumsAxisType.RockBandDrums_RedPad]: GM_DRUMS.snare,
    [proto.RockBandDrumsAxisType.RockBandDrums_YellowPad]: GM_DRUMS.highTom,
    [proto.RockBandDrumsAxisType.RockBandDrums_BluePad]: GM_DRUMS.lowTom,
    [proto.RockBandDrumsAxisType.RockBandDrums_GreenPad]: GM_DRUMS.floorTom,
    [proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal]: GM_DRUMS.closedHiHat,
    [proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal]: GM_DRUMS.ride,
    [proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal]: GM_DRUMS.crash,
  },
  (out) => out.rbDrumAxis,
  {
    [proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal]: GM_DRUMS.kick,
    [proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal]: GM_DRUMS.kick,
  },
  (out) => out.rbDrumButton
);

// The GH kick is an axis, so it goes through as a pad
const ghMidiDrums = midiDrums(
  {
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad]: GM_DRUMS.snare,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad]: GM_DRUMS.closedHiHat,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad]: GM_DRUMS.highTom,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad]: GM_DRUMS.crash,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad]: GM_DRUMS.floorTom,
    [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal]: GM_DRUMS.kick,
  },
  (out) => out.ghDrumAxis,
  {},
  () => undefined
);

// A PS2 Guitar Hero guitar as it appears on a PS3 through a PS2 adapter, for PS2 classics
function ps2GuitarOnPs3(mapping: proto.IMapping): proto.IMapping[] {
  const out = mapping.mapping ?? {};
  const button = (b: proto.GamepadButtonType) => [withOutput(mapping, { gamepadButton: b })];
  switch (out.ghButton) {
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green:
      return [
        {
          ...withOutput(mapping, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger }),
          pressed: 65535,
        },
      ];
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red:
      return button(proto.GamepadButtonType.Gamepad_B);
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow:
      return button(proto.GamepadButtonType.Gamepad_Y);
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue:
      return button(proto.GamepadButtonType.Gamepad_A);
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange:
      return button(proto.GamepadButtonType.Gamepad_X);
    case proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Pedal:
      return button(proto.GamepadButtonType.Gamepad_RightShoulder);
  }
  if (out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt) {
    return [withOutput(mapping, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger })];
  }
  if (out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy) {
    // The whammy rests at the top of the stick and goes down when pressed
    const rest = mapping.min ?? 0;
    const pressed = mapping.max ?? 65535;
    return [
      {
        ...withOutput(mapping, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }),
        min: pressed,
        max: rest,
        center: Math.round((rest + pressed) / 2),
        deadzone: 0,
      },
    ];
  }
  switch (out.gamepadButton) {
    // d-pad left is always held, it's how the PS2 identifies a guitar
    case proto.GamepadButtonType.Gamepad_DpadLeft:
    case proto.GamepadButtonType.Gamepad_DpadRight:
      return [];
    case undefined:
    case null:
      return [];
    default:
      return [mapping];
  }
}

export const MAPPING_PRESETS: MappingPreset[] = [
  {
    id: 'festival_guitar',
    subTypes: [proto.SubType.KeyboardMouse],
    source: proto.SubType.GuitarHeroGuitar,
    convert: festivalGuitar(false),
  },
  {
    id: 'festival_pro_guitar',
    subTypes: [proto.SubType.KeyboardMouse],
    source: proto.SubType.GuitarHeroGuitar,
    convert: festivalGuitar(true),
  },
  {
    id: 'festival_drums',
    subTypes: [proto.SubType.KeyboardMouse],
    source: proto.SubType.RockBandDrums,
    convert: festivalDrums(false),
  },
  {
    id: 'festival_pro_drums',
    subTypes: [proto.SubType.KeyboardMouse],
    source: proto.SubType.RockBandDrums,
    convert: festivalDrums(true),
  },
  {
    id: 'midi_drums_rb',
    subTypes: [proto.SubType.Midi],
    source: proto.SubType.RockBandDrums,
    convert: rbMidiDrums,
  },
  {
    id: 'midi_drums_gh',
    subTypes: [proto.SubType.Midi],
    source: proto.SubType.GuitarHeroDrums,
    convert: ghMidiDrums,
  },
  {
    id: 'ps2_guitar_on_ps3',
    subTypes: [proto.SubType.Gamepad],
    source: proto.SubType.GuitarHeroGuitar,
    convert: ps2GuitarOnPs3,
    extra: () => [
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft },
        input: { fixed: { value: 65535 } },
      },
    ],
  },
];

export function presetsFor(subType: proto.SubType): MappingPreset[] {
  return MAPPING_PRESETS.filter((preset) => preset.subTypes.includes(subType));
}

export function getPresetMappings(
  preset: MappingPreset,
  deviceType: string,
  deviceId = 0,
  deviceStatus?: DeviceStatusLike
): proto.IMapping[] {
  const source = getDefaultMappings(deviceType, preset.source, deviceId, deviceStatus);
  return [...source.flatMap(preset.convert), ...(preset.extra?.(deviceId) ?? [])];
}

// Translation key naming what an instrument mapping does, for labelling the keys a preset sends.
// Guitars send strum and star power as gamepad buttons, so those are named here.
function sourceOutputName(out: proto.IOutput): string | undefined {
  const named: [number | null | undefined, Record<number, string>][] = [
    [out.ghButton, proto.GuitarHeroGuitarButtonType],
    [out.ghAxis, proto.GuitarHeroGuitarAxisType],
    [out.rbButton, proto.RockBandGuitarButtonType],
    [out.rbAxis, proto.RockBandGuitarAxisType],
    [out.ghDrumAxis, proto.GuitarHeroDrumsAxisType],
    [out.rbDrumButton, proto.RockBandDrumsButtonType],
    [out.rbDrumAxis, proto.RockBandDrumsAxisType],
  ];
  for (const [value, names] of named) {
    if (value != null && names[value]) {
      return `outputs.${names[value]}`;
    }
  }
  switch (out.gamepadButton) {
    case proto.GamepadButtonType.Gamepad_DpadUp:
      return 'keyboard.presetLabels.strumUp';
    case proto.GamepadButtonType.Gamepad_DpadDown:
      return 'keyboard.presetLabels.strumDown';
    case proto.GamepadButtonType.Gamepad_Back:
      return 'keyboard.presetLabels.starPower';
  }
  return undefined;
}

// The keys a preset sends, with translation keys for everything each one is sent for
export function getPresetKeyLabels(
  preset: MappingPreset,
  deviceType: string,
  deviceId = 0,
  deviceStatus?: DeviceStatusLike
): { key: number; names: string[] }[] {
  const labels = new Map<number, string[]>();
  for (const mapping of getDefaultMappings(deviceType, preset.source, deviceId, deviceStatus)) {
    const name = mapping.mapping ? sourceOutputName(mapping.mapping) : undefined;
    if (!name) {
      continue;
    }
    for (const converted of preset.convert(mapping)) {
      const key = converted.mapping?.keycode;
      if (key == null) {
        continue;
      }
      const names = labels.get(key) ?? [];
      if (!names.includes(name)) {
        names.push(name);
      }
      labels.set(key, names);
    }
  }
  return [...labels].map(([key, names]) => ({ key, names }));
}
