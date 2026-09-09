import { proto } from '@/components/SettingsContext/config';

export interface DeviceStatusLike {
  id?: string;
  type?: string;
  wiiExtType?: proto.WiiExtType;
  ps2CntType?: proto.PS2ControllerType;
}

// Helper builders for consistent mapping objects
function gpioButton(output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      gpio: {
        pin: -1,
        pinMode: proto.PinMode.PullUp,
        analog: false,
      },
    },
  };
}

function gpioAxis(output: proto.IOutput, center = 0, debounce?: number): proto.IMapping {
  return {
    mapping: output,
    input: {
      gpio: {
        pin: -1,
        pinMode: proto.PinMode.PullUp,
        analog: true,
      },
    },
    min: 0,
    max: 65535,
    center,
    debounce,
  };
}

function wiiButton(button: proto.WiiButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      wiiButton: {
        button,
        deviceid,
      },
    },
  };
}

function wiiAxis(axis: proto.WiiAxisType, deviceid: number, output: proto.IOutput, center = 0): proto.IMapping {
  return {
    mapping: output,
    input: {
      wiiAxis: {
        axis,
        deviceid,
      },
    },
    min: 0,
    max: 65535,
    center,
  };
}

function ps2Button(button: proto.PS2ButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      ps2Button: {
        button,
        deviceid,
      },
    },
  };
}
function ps2TriggerButton(button: proto.PS2ButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      ps2Button: {
        button,
        deviceid,
      },
    },
    min: 0,
    max: 65535,
  };
}

function ps2Axis(axis: proto.PS2AxisType, deviceid: number, output: proto.IOutput, center = 0): proto.IMapping {
  return {
    mapping: output,
    input: {
      ps2Axis: {
        axis,
        deviceid,
      },
    },
    min: 0,
    max: 65535,
    center,
  };
}

function crkdNeckButton(button: proto.CrkdNeckButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      crkd: {
        button,
        deviceid,
      },
    },
  };
}

function crkdDrumAxis(axis: proto.CrkdDrumAxisType, deviceid: number, output: proto.IOutput, center = 0): proto.IMapping {
  return {
    mapping: output,
    input: {
      crkdDrum: {
        axis,
        deviceid,
      },
    },
    min: 0,
    max: 65535,
    center,
  };
}

function gh5NeckButton(button: proto.Gh5NeckButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      gh5Neck: {
        button,
        deviceid,
      },
    },
  };
}

function midiNoteAxis(note: number, deviceid: number, output: proto.IOutput, channel = 10): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiNote: {
          note,
          channel,
        },
      },
    },
    min: 0,
    max: 65535,
    center: 0,
  };
}

function midiNoteButton(note: number, deviceid: number, output: proto.IOutput, channel = 10): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiNote: {
          note,
          channel,
        },
      },
    },
  };
}

function midiCcAxis(cc: number, deviceid: number, output: proto.IOutput, channel = 1): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiControlChange: {
          cc,
          channel,
        },
      },
    },
    min: 0,
    max: 65535,
    center: 0,
  };
}

function midiPitchBendAxis(deviceid: number, output: proto.IOutput, channel = 1): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiPitchBend: {
          channel,
        },
      },
    },
    min: 0,
    max: 65535,
    center: 32767,
  };
}

function protarNeckButton(button: proto.ProGuitarNeckButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      protarNeckButton: {
        button,
        deviceid,
      },
    },
  };
}

function protarNeckAxis(axis: proto.ProGuitarNeckAxisType, deviceid: number, output: proto.IOutput, center = 0): proto.IMapping {
  return {
    mapping: output,
    input: {
      protarNeckAxis: {
        axis,
        deviceid,
      },
    },
    min: 0,
    max: 65535,
    center,
  };
}

function midiProGuitarButton(button: proto.ProGuitarMidiButtonType, deviceid: number, output: proto.IOutput): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiProGuitarButton: {
          button,
        },
      },
    },
  };
}

function midiProGuitarAxis(axis: proto.ProGuitarAxisType, deviceid: number, output: proto.IOutput, center = 0): proto.IMapping {
  return {
    mapping: output,
    input: {
      midi: {
        deviceid,
        midiProGuitarAxis: {
          axis,
        },
      },
    },
    min: 0,
    max: 65535,
    center,
  };
}

// ---------------------------------------------------------------------------
// 1. GPIO Defaults (Hardware-agnostic templates for all SubTypes)
// ---------------------------------------------------------------------------
export function getGpioDefaults(subType: proto.SubType): proto.IMapping[] {
  switch (subType) {
    case proto.SubType.GuitarHeroGuitar:
      return [
        gpioAxis({ ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy }, 0),
        gpioAxis({ ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt }, 0),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Pedal }),
      ];

    case proto.SubType.RockBandGuitar:
      return [
        gpioAxis({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy }, 0),
        gpioAxis({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Tilt }, 0),
        gpioAxis({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup }, 0),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Pedal }),
      ];

    case proto.SubType.GuitarHeroDrums:
      return [
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad }, 0, 30),
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad }, 0, 30),
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }, 0, 30),
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad }, 0, 30),
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad }, 0, 30),
        gpioAxis({ ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal }, 0, 0),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_X }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
      ];

    case proto.SubType.RockBandDrums:
      return [
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal }, 0, 30),
        gpioAxis({ rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal }, 0, 30),
        gpioButton({ rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal }),
        gpioButton({ rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_X }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
      ];

    case proto.SubType.LiveGuitar:
      return [
        gpioAxis({ ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy }, 0),
        gpioAxis({ ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt }, 0),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_White1 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_White2 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_White3 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_Black1 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_Black2 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_Black3 }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumUp }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumDown }),
        gpioButton({ ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_GHTV }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      ];

    case proto.SubType.DjHeroTurntable:
      return [
        gpioAxis({ djhAxis: proto.DJHTurntableAxisType.DJHTurntable_LeftVelocity }, 32767),
        gpioAxis({ djhAxis: proto.DJHTurntableAxisType.DJHTurntable_RightVelocity }, 32767),
        gpioAxis({ djhAxis: proto.DJHTurntableAxisType.DJHTurntable_Crossfader }, 32767),
        gpioAxis({ djhAxis: proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob }, 32767),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftGreen }),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftRed }),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftBlue }),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightGreen }),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightRed }),
        gpioButton({ djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightBlue }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      ];

    case proto.SubType.Taiko:
      return [
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      ];

    case proto.SubType.Dancepad:
      return [
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      ];

    case proto.SubType.ProKeys:
      return [
        gpioButton({ proKeyMultiple: 25 }),
        gpioButton({ proKeyboardButton: proto.ProKeyboardButtonType.ProKeyboardOverdrive }),
        gpioAxis({ proKeyboardAxis: proto.ProKeyboardAxisType.ProKeyboardPedal }, 0),
        gpioAxis({ proKeyboardAxis: proto.ProKeyboardAxisType.ProKeyboardTouchPad }, 32767),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_X }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
      ];

    case proto.SubType.ProGuitarMustang:
    case proto.SubType.ProGuitarSquire:
      return [
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_LowEFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_AFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_DFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_GFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_BFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_HighEFret }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_LowEFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_AFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_DFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_GFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_BFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_HighEFretVelocity }, 0),
        gpioAxis({ proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt }, 0),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Green }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Red }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Yellow }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Blue }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Orange }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_SoloGreen }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_SoloRed }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_SoloYellow }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_SoloBlue }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_SoloOrange }),
        gpioButton({ proButton: proto.ProGuitarButtonType.ProGuitar_Pedal }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_X }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
      ];

    case proto.SubType.Gamepad:
    default:
      return [
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX }, 32767),
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY }, 32767),
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger }, 0),
        gpioAxis({ gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger }, 0),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_A }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_B }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_X }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_LeftThumbClick }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_RightThumbClick }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
        gpioButton({ gamepadButton: proto.GamepadButtonType.Gamepad_Capture }),
      ];
  }
}

// ---------------------------------------------------------------------------
// 2. Wii Extension Defaults
// ---------------------------------------------------------------------------
export function getWiiDefaults(
  subType: proto.SubType,
  deviceId: number,
  deviceStatus?: DeviceStatusLike
): proto.IMapping[] {
  const ext = deviceStatus?.wiiExtType;

  const isGuitarExt = ext === proto.WiiExtType.WiiGuitarHeroGuitar;
  const isDrumExt = ext === proto.WiiExtType.WiiGuitarHeroDrums;
  const isTaikoExt = ext === proto.WiiExtType.WiiTaikoNoTatsujinController;
  const isDjExt = ext === proto.WiiExtType.WiiDjHeroTurntable;
  const isClassicExt =
    ext === proto.WiiExtType.WiiClassicController ||
    ext === proto.WiiExtType.WiiClassicControllerPro ||
    ext === proto.WiiExtType.WiiNunchuk;

  // 1. Guitar Extension (or Guitar SubTypes if not specifically detected otherwise)
  if (
    isGuitarExt ||
    (!isDrumExt && !isTaikoExt && !isDjExt && !isClassicExt && (subType === proto.SubType.GuitarHeroGuitar || subType === proto.SubType.RockBandGuitar))
  ) {
    if (subType === proto.SubType.RockBandGuitar) {
      return [
        wiiAxis(proto.WiiAxisType.WiiAxisGuitarWhammy, deviceId, { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy }, 0),
        wiiAxis(proto.WiiAxisType.WiiAxisGuitarJoystickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
        wiiAxis(proto.WiiAxisType.WiiAxisGuitarJoystickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarTapGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarTapRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarTapYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarTapBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarTapOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarStrumUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarStrumDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
        wiiButton(proto.WiiButtonType.WiiButtonGuitarPedal, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Pedal }),
      ];
    }
    return [
      wiiAxis(proto.WiiAxisType.WiiAxisGuitarWhammy, deviceId, { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy }, 0),
      wiiAxis(proto.WiiAxisType.WiiAxisGuitarJoystickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisGuitarJoystickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarTapGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarTapRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarTapYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarTapBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarTapOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarStrumUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarStrumDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      wiiButton(proto.WiiButtonType.WiiButtonGuitarPedal, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Pedal }),
    ];
  }

  // 2. Drum Extension (or Drum SubTypes)
  if (isDrumExt || subType === proto.SubType.GuitarHeroDrums || subType === proto.SubType.RockBandDrums) {
    return [
      wiiAxis(proto.WiiAxisType.WiiAxisDrumJoystickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDrumJoystickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
      wiiButton(proto.WiiButtonType.WiiButtonClassicA, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicB, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicX, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicY, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicDPadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicDPadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicDPadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicDPadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
      wiiButton(proto.WiiButtonType.WiiButtonDrumMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      wiiButton(proto.WiiButtonType.WiiButtonDrumPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicHome, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
    ];
  }

  // 3. Taiko Extension (or Taiko SubType)
  if (isTaikoExt || subType === proto.SubType.Taiko) {
    return [
      wiiButton(proto.WiiButtonType.WiiButtonTaTaConLeftDrumRim, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
      wiiButton(proto.WiiButtonType.WiiButtonTaTaConLeftDrumCenter, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      wiiButton(proto.WiiButtonType.WiiButtonTaTaConRightDrumCenter, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
      wiiButton(proto.WiiButtonType.WiiButtonTaTaConRightDrumRim, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      wiiButton(proto.WiiButtonType.WiiButtonClassicPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
    ];
  }

  // 4. DJ Hero Extension (or DJ Hero SubType)
  if (isDjExt || subType === proto.SubType.DjHeroTurntable) {
    return [
      wiiAxis(proto.WiiAxisType.WiiAxisDjTurntableLeft, deviceId, { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_LeftVelocity }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDjTurntableRight, deviceId, { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_RightVelocity }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDjCrossfadeSlider, deviceId, { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_Crossfader }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDjEffectDial, deviceId, { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDjStickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
      wiiAxis(proto.WiiAxisType.WiiAxisDjStickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroLeftGreen, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftGreen }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroLeftRed, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftRed }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroLeftBlue, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_LeftBlue }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroRightGreen, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightGreen }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroRightRed, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightRed }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroRightBlue, deviceId, { djhButton: proto.DJHTurntableButtonType.DJHTurntable_RightBlue }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroEuphoria, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      wiiButton(proto.WiiButtonType.WiiButtonDjHeroPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
    ];
  }

  // 5. Default / Classic Controller (Full Gamepad)
  return [
    wiiAxis(proto.WiiAxisType.WiiAxisClassicLeftStickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
    wiiAxis(proto.WiiAxisType.WiiAxisClassicLeftStickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
    wiiAxis(proto.WiiAxisType.WiiAxisClassicRightStickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX }, 32767),
    wiiAxis(proto.WiiAxisType.WiiAxisClassicRightStickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY }, 32767),
    wiiAxis(proto.WiiAxisType.WiiAxisClassicLeftTrigger, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger }, 0),
    wiiAxis(proto.WiiAxisType.WiiAxisClassicRightTrigger, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger }, 0),
    wiiButton(proto.WiiButtonType.WiiButtonClassicA, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicB, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicX, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicY, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicDPadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicDPadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicDPadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicDPadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicZl, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicZr, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicPlus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicMinus, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
    wiiButton(proto.WiiButtonType.WiiButtonClassicHome, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
  ];
}

// ---------------------------------------------------------------------------
// 3. PS1/PS2 Port Defaults (`psx`)
// ---------------------------------------------------------------------------
export function getPs2Defaults(
  subType: proto.SubType,
  deviceId: number,
  deviceStatus?: DeviceStatusLike
): proto.IMapping[] {
  const cntType = deviceStatus?.ps2CntType;
  const isGuitar = cntType === proto.PS2ControllerType.PS2ControllerTypeGuitar;
  const isTaiko = cntType === proto.PS2ControllerType.PS2ControllerTypeTaiko;

  if (isGuitar || subType === proto.SubType.GuitarHeroGuitar || subType === proto.SubType.RockBandGuitar) {
    if (subType === proto.SubType.RockBandGuitar) {
      return [
        ps2Axis(proto.PS2AxisType.PS2AxisGuitarWhammy, deviceId, { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy }, 0),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStrumUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStrumDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarSelect, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
        ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStart, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      ];
    }
    return [
      ps2Axis(proto.PS2AxisType.PS2AxisGuitarWhammy, deviceId, { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy }, 0),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStrumUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStrumDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarSelect, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      ps2Button(proto.PS2ButtonType.PS2ButtonGuitarStart, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
    ];
  }

  if (isTaiko || subType === proto.SubType.Taiko) {
    return [
      ps2Button(proto.PS2ButtonType.PS2ButtonTaikoRimLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
      ps2Button(proto.PS2ButtonType.PS2ButtonTaikoCenterLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      ps2Button(proto.PS2ButtonType.PS2ButtonTaikoCenterRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
      ps2Button(proto.PS2ButtonType.PS2ButtonTaikoRimRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
      ps2Button(proto.PS2ButtonType.PS2ButtonSelect, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      ps2Button(proto.PS2ButtonType.PS2ButtonStart, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
    ];
  }

  // Standard PS2 DualShock / Gamepad
  return [
    ps2Axis(proto.PS2AxisType.PS2AxisLeftStickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, 32767),
    ps2Axis(proto.PS2AxisType.PS2AxisLeftStickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, 32767),
    ps2Axis(proto.PS2AxisType.PS2AxisRightStickX, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX }, 32767),
    ps2Axis(proto.PS2AxisType.PS2AxisRightStickY, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY }, 32767),
    ps2Button(proto.PS2ButtonType.PS2ButtonCross, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    ps2Button(proto.PS2ButtonType.PS2ButtonCircle, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    ps2Button(proto.PS2ButtonType.PS2ButtonSquare, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    ps2Button(proto.PS2ButtonType.PS2ButtonTriangle, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    ps2Button(proto.PS2ButtonType.PS2ButtonDpadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
    ps2Button(proto.PS2ButtonType.PS2ButtonDpadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
    ps2Button(proto.PS2ButtonType.PS2ButtonDpadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
    ps2Button(proto.PS2ButtonType.PS2ButtonDpadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
    ps2Button(proto.PS2ButtonType.PS2ButtonL1, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
    ps2Button(proto.PS2ButtonType.PS2ButtonR1, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
    ps2TriggerButton(proto.PS2ButtonType.PS2ButtonL2, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger }),
    ps2TriggerButton(proto.PS2ButtonType.PS2ButtonR2, deviceId, { gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger }),
    ps2Button(proto.PS2ButtonType.PS2ButtonL3, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftThumbClick }),
    ps2Button(proto.PS2ButtonType.PS2ButtonR3, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightThumbClick }),
    ps2Button(proto.PS2ButtonType.PS2ButtonSelect, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
    ps2Button(proto.PS2ButtonType.PS2ButtonStart, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
  ];
}

// ---------------------------------------------------------------------------
// 4. CRKD Hardware Defaults (`crkdNeck`, `crkdDrum`)
// ---------------------------------------------------------------------------
export function getCrkdNeckDefaults(subType: proto.SubType, deviceId: number): proto.IMapping[] {
  if (subType === proto.SubType.RockBandGuitar) {
    return [
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
    ];
  }

  if (subType === proto.SubType.GuitarHeroGuitar) {
    return [
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdSoloOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
    ];
  }

  // Fallback to Gamepad
  return [
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdGreen, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdRed, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdYellow, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdBlue, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdOrange, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
    crkdNeckButton(proto.CrkdNeckButtonType.CrkdDpadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
  ];
}

export function getCrkdDrumDefaults(subType: proto.SubType, deviceId: number): proto.IMapping[] {
  if (subType === proto.SubType.RockBandDrums) {
    return [
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdRedPad, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdYellowPad, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdBluePad, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdGreenPad, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdYellowCymbal, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdBlueCymbal, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdGreenCymbal, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal }, 0),
      {
        mapping: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal },
        input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdKick1, deviceid: deviceId } },
      },
      {
        mapping: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal },
        input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdKick2, deviceid: deviceId } },
      },
    ];
  }

  if (subType === proto.SubType.GuitarHeroDrums) {
    return [
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdGreenPad, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdRedPad, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdYellowPad, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdBluePad, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdGreenCymbal, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdBlueCymbal, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdYellowCymbal, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdKick1, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal }, 0),
      crkdDrumAxis(proto.CrkdDrumAxisType.CrkdKick2, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal }, 0),
    ];
  }

  // Fallback to Gamepad
  return [
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_B },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdRedPad, deviceid: deviceId } },
    },
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_X },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdYellowPad, deviceid: deviceId } },
    },
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_Y },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdBluePad, deviceid: deviceId } },
    },
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdGreenPad, deviceid: deviceId } },
    },
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdKick1, deviceid: deviceId } },
    },
    {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder },
      input: { crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdKick2, deviceid: deviceId } },
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. GH5 Neck Defaults (`gh5Neck`)
// ---------------------------------------------------------------------------
export function getGh5NeckDefaults(subType: proto.SubType, deviceId: number): proto.IMapping[] {
  if (subType === proto.SubType.RockBandGuitar) {
    return [
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Green, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Red, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Yellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Blue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Orange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange }),
    ];
  }

  if (subType === proto.SubType.GuitarHeroGuitar) {
    return [
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Green, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Red, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Yellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Blue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5Orange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue }),
      gh5NeckButton(proto.Gh5NeckButtonType.Gh5TapOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange }),
    ];
  }

  // Fallback to Gamepad
  return [
    gh5NeckButton(proto.Gh5NeckButtonType.Gh5Green, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    gh5NeckButton(proto.Gh5NeckButtonType.Gh5Red, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    gh5NeckButton(proto.Gh5NeckButtonType.Gh5Yellow, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    gh5NeckButton(proto.Gh5NeckButtonType.Gh5Blue, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    gh5NeckButton(proto.Gh5NeckButtonType.Gh5Orange, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
  ];
}

// ---------------------------------------------------------------------------
// 5.5. Protar Neck Defaults (`protarNeck`)
// ---------------------------------------------------------------------------
export function getProtarNeckDefaults(subType: proto.SubType, deviceId: number): proto.IMapping[] {
  if (subType === proto.SubType.ProGuitarMustang || subType === proto.SubType.ProGuitarSquire) {
    return [
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckLowEFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_LowEFret }),
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckAFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_AFret }),
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckDFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_DFret }),
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckGFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_GFret }),
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckBFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_BFret }),
      protarNeckAxis(proto.ProGuitarNeckAxisType.ProGuitarNeckHighEFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_HighEFret }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckGreen, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Green }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckRed, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Red }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckYellow, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Yellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckBlue, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Blue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckOrange, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Orange }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloGreen, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_SoloGreen }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloRed, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_SoloRed }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloYellow, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_SoloYellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloBlue, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_SoloBlue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloOrange, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_SoloOrange }),
    ];
  }

  if (subType === proto.SubType.RockBandGuitar) {
    return [
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Green }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Orange }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloGreen, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloRed, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloYellow, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloBlue, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloOrange, deviceId, { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange }),
    ];
  }

  if (subType === proto.SubType.GuitarHeroGuitar) {
    return [
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloGreen, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloRed, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloYellow, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloBlue, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue }),
      protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckSoloOrange, deviceId, { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange }),
    ];
  }

  // Fallback to Gamepad
  return [
    protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckGreen, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckRed, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckYellow, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckBlue, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    protarNeckButton(proto.ProGuitarNeckButtonType.ProGuitarNeckOrange, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
  ];
}

// ---------------------------------------------------------------------------
// 6. MIDI Drum Defaults (`midiSerial`, `bhDrum`, `worldTourDrum`)
// ---------------------------------------------------------------------------
export function getMidiDrumDefaults(subType: proto.SubType, deviceId: number): proto.IMapping[] {
  if (subType === proto.SubType.RockBandDrums) {
    return [
      // Red Pad (Snare - Note 38, Rimshot 40)
      midiNoteAxis(38, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad }),
      midiNoteAxis(40, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad }),
      // Yellow Pad (High Tom - Note 48, 50)
      midiNoteAxis(48, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad }),
      midiNoteAxis(50, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad }),
      // Yellow Cymbal (Hi-Hat - Note 46 Open, 42 Closed)
      midiNoteAxis(46, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal }),
      midiNoteAxis(42, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal }),
      // Blue Pad (Mid Tom - Note 45, 47)
      midiNoteAxis(45, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad }),
      midiNoteAxis(47, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad }),
      // Blue Cymbal (Ride Cymbal - Note 51, 59)
      midiNoteAxis(51, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal }),
      midiNoteAxis(59, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal }),
      // Green Pad (Floor Tom - Note 43, 41)
      midiNoteAxis(43, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad }),
      midiNoteAxis(41, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad }),
      // Green Cymbal (Crash Cymbal - Note 49, 57)
      midiNoteAxis(49, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal }),
      midiNoteAxis(57, deviceId, { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal }),
      // Kick 1 (Bass Drum - Note 36, 35)
      midiNoteButton(36, deviceId, { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal }),
      midiNoteButton(35, deviceId, { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal }),
      // Kick 2 (Hi-Hat Pedal / Secondary Kick - Note 44)
      midiNoteButton(44, deviceId, { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal }),
    ];
  }

  if (subType === proto.SubType.GuitarHeroDrums) {
    return [
      // Red Pad (Snare - Note 38, Rimshot 40)
      midiNoteAxis(38, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad }),
      midiNoteAxis(40, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad }),
      // Yellow Cymbal (Hi-Hat - Note 46 Open, 42 Closed)
      midiNoteAxis(46, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad }),
      midiNoteAxis(42, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad }),
      // Blue Pad (Tom 1 / Mid Tom - Note 48, 50, 45)
      midiNoteAxis(48, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }),
      midiNoteAxis(50, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }),
      midiNoteAxis(45, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad }),
      // Orange Cymbal (Crash / Ride - Note 49, 51, 57)
      midiNoteAxis(49, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad }),
      midiNoteAxis(51, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad }),
      midiNoteAxis(57, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad }),
      // Green Pad (Floor Tom - Note 43, 41)
      midiNoteAxis(43, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad }),
      midiNoteAxis(41, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad }),
      // Kick Pedal (Bass Drum - Note 36, 35)
      midiNoteAxis(36, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal }),
      midiNoteAxis(35, deviceId, { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal }),
    ];
  }

  if (subType === proto.SubType.Taiko) {
    return [
      midiNoteButton(38, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      midiNoteButton(43, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
      midiNoteButton(42, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
      midiNoteButton(46, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
      midiNoteButton(49, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
      midiNoteButton(51, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
    ];
  }
    
  if (subType === proto.SubType.ProKeys) {
    return [
      // 25 Keys starting from root MIDI note 48 (C3), Channel 1
      midiNoteButton(48, deviceId, { proKeyMultiple: 25 }, 1),
      // Pedal: CC 64 (Sustain) on Channel 1
      midiCcAxis(64, deviceId, { proKeyboardAxis: proto.ProKeyboardAxisType.ProKeyboardPedal }, 1),
      // Touch Strip: Pitch Bend on Channel 1
      midiPitchBendAxis(deviceId, { proKeyboardAxis: proto.ProKeyboardAxisType.ProKeyboardTouchPad }, 1),
      // Overdrive: Note 116 on Channel 1
      midiNoteButton(116, deviceId, { proKeyboardButton: proto.ProKeyboardButtonType.ProKeyboardOverdrive }, 1),
      // Gamepad navigation buttons
      midiNoteButton(0, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }, 1),
      midiNoteButton(1, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }, 1),
      midiNoteButton(2, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }, 1),
      midiNoteButton(3, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }, 1),
      midiNoteButton(4, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }, 1),
      midiNoteButton(5, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }, 1),
      midiNoteButton(6, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }, 1),
      midiNoteButton(7, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }, 1),
      midiNoteButton(8, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }, 1),
      midiNoteButton(9, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }, 1),
      midiNoteButton(10, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Guide }, 1),
    ];
  }

  if (subType === proto.SubType.ProGuitarMustang || subType === proto.SubType.ProGuitarSquire) {
    return [
      // Fret axes
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_LowEFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_LowEFret }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_AFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_AFret }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_DFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_DFret }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_GFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_GFret }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_BFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_BFret }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_HighEFret, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_HighEFret }),
      // Velocity axes
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_LowEFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_LowEFretVelocity }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_AFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_AFretVelocity }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_DFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_DFretVelocity }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_GFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_GFretVelocity }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_BFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_BFretVelocity }),
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_HighEFretVelocity, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_HighEFretVelocity }),
      // Tilt
      midiProGuitarAxis(proto.ProGuitarAxisType.ProGuitar_Tilt, deviceId, { proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt }, 32767),
      // Pedal
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Pedal, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Pedal }),
      // 5-fret buttons
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Green, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Green }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Red, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Red }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Yellow, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Yellow }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Blue, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Blue }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Orange, deviceId, { proButton: proto.ProGuitarButtonType.ProGuitar_Orange }),
      // Navigation / Gamepad buttons
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_A, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_B, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_X, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Y, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_DpadUp, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_DpadDown, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_DpadLeft, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_DpadRight, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Back, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Back }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Start, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Start }),
      midiProGuitarButton(proto.ProGuitarMidiButtonType.ProGuitarMidi_Guide, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Guide }),
    ];
  }

  // Fallback to Gamepad
  return [
    midiNoteButton(38, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_B }),
    midiNoteButton(46, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    midiNoteButton(48, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_Y }),
    midiNoteButton(45, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    midiNoteButton(51, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_X }),
    midiNoteButton(43, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    midiNoteButton(49, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_A }),
    midiNoteButton(36, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder }),
    midiNoteButton(44, deviceId, { gamepadButton: proto.GamepadButtonType.Gamepad_RightShoulder }),
  ];
}

export const getMidiDefaults = getMidiDrumDefaults;

// ---------------------------------------------------------------------------
// 7. Central Defaults Dispatcher
// ---------------------------------------------------------------------------
export function getDefaultMappings(
  deviceType: string,
  subType: proto.SubType,
  deviceId = 0,
  deviceStatus?: DeviceStatusLike
): proto.IMapping[] {
  switch (deviceType) {
    case 'wii':
      return getWiiDefaults(subType, deviceId, deviceStatus);
    case 'psx':
      return getPs2Defaults(subType, deviceId, deviceStatus);
    case 'crkdNeck':
      return getCrkdNeckDefaults(subType, deviceId);
    case 'crkdDrum':
      return getCrkdDrumDefaults(subType, deviceId);
    case 'gh5Neck':
      return getGh5NeckDefaults(subType, deviceId);
    case 'protarNeck':
      return getProtarNeckDefaults(subType, deviceId);
    case 'midiSerial':
    case 'bhDrum':
    case 'worldTourDrum':
      return getMidiDrumDefaults(subType, deviceId);
    case 'gpio':
    default:
      return getGpioDefaults(subType);
  }
}
