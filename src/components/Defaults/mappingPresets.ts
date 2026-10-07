import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
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
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal]: 'AltLeft',
      }
    : {
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal]: 'KeyK',
        [proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal]: 'KeyK',
      };
  return (mapping: proto.IMapping): proto.IMapping[] => {
    const out = mapping.mapping ?? {};
    const pad = out.rbDrumAxis != null ? pads[out.rbDrumAxis] : undefined;
    if (pad) {
      // any hit at all counts, the debounce keeps the key down long enough to register
      return [{ ...analogAsButton(mapping, key(pad), 0.1), debounce: mapping.debounce }];
    }
    const kick = out.rbDrumButton != null ? kicks[out.rbDrumButton] : undefined;
    if (kick) {
      return [withOutput(mapping, key(kick))];
    }
    return [];
  };
}

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
