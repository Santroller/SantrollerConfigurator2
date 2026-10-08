import { USB_HOST_SUBTYPES } from '@/components/Defaults/defaultMappings';
import { proto } from '@/components/SettingsContext/config';
import { ConvertedInput, LegacyImportContext, setUart } from '../context';
import { registerInputConverters } from '../inputs';
import { legacy } from '../legacy';
import { addButton, convertOutput, registerOutputConverters } from '../outputs';
import { legacyDrumMidiSlots, legacyDrumNotes } from './instrumentPeripherals';

const ST = proto.SubType;
const UT = legacy.UsbHostInputType;
const GB = proto.GamepadButtonType;
const GA = proto.GamepadAxisType;

// ---------------------------------------------------------------------------
// Keyboard keys
// ---------------------------------------------------------------------------

// Old keyboard keys are Avalonia `Key` values, which use the same numbers as WPF's Key enum. This
// is the HID usage the old firmware sent for each of them (KeyboardButton.KeyCodes in the old
// configurator, indexed by usage).
const AVALONIA_KEY_TO_HID: Record<number, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [44 + i, 0x04 + i])), // A - Z
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [35 + i, 0x1e + i])), // D1 - D9
  34: 0x27, // D0
  6: 0x28, // Enter
  13: 0x29, // Escape
  2: 0x2a, // Back
  3: 0x2b, // Tab
  18: 0x2c, // Space
  143: 0x2d, // OemMinus
  141: 0x2e, // OemPlus
  149: 0x2f, // OemOpenBrackets
  151: 0x30, // OemCloseBrackets
  150: 0x31, // OemPipe
  140: 0x33, // OemSemicolon
  152: 0x34, // OemQuotes
  146: 0x35, // OemTilde
  142: 0x36, // OemComma
  144: 0x37, // OemPeriod
  145: 0x38, // OemQuestion
  8: 0x39, // CapsLock
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [90 + i, 0x3a + i])), // F1 - F12
  30: 0x46, // PrintScreen
  115: 0x47, // Scroll
  7: 0x48, // Pause
  31: 0x49, // Insert
  22: 0x4a, // Home
  19: 0x4b, // PageUp
  32: 0x4c, // Delete
  21: 0x4d, // End
  20: 0x4e, // PageDown
  25: 0x4f, // Right
  23: 0x50, // Left
  26: 0x51, // Down
  24: 0x52, // Up
  114: 0x53, // NumLock
  89: 0x54, // Divide
  84: 0x55, // Multiply
  87: 0x56, // Subtract
  85: 0x57, // Add
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [75 + i, 0x59 + i])), // NumPad1 - 9
  74: 0x62, // NumPad0
  88: 0x63, // Decimal
  72: 0x65, // Apps
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [102 + i, 0x68 + i])), // F13 - F24
  118: 0xe0, // LeftCtrl
  116: 0xe1, // LeftShift
  120: 0xe2, // LeftAlt
  70: 0xe3, // LWin
  119: 0xe4, // RightCtrl
  117: 0xe5, // RightShift
  121: 0xe6, // RightAlt
  71: 0xe7, // RWin
};

// Media keys were sent as consumer page usages
const AVALONIA_KEY_TO_CONSUMER: Record<number, number> = {
  132: 0xb5, // MediaNextTrack
  133: 0xb6, // MediaPreviousTrack
  134: 0xb7, // MediaStop
  135: 0xcd, // MediaPlayPause
  129: 0xe2, // VolumeMute
  131: 0xe9, // VolumeUp
  130: 0xea, // VolumeDown
};

export function keyboardOutput(key: number): proto.IOutput | undefined {
  if (key in AVALONIA_KEY_TO_HID) {
    return { keycode: AVALONIA_KEY_TO_HID[key] };
  }
  if (key in AVALONIA_KEY_TO_CONSUMER) {
    return { consumerKey: AVALONIA_KEY_TO_CONSUMER[key] };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// USB host / Bluetooth inputs
// ---------------------------------------------------------------------------

// Old USB host and Bluetooth inputs read one combined report that every plugged in controller was
// merged into, so the type of controller isn't stored. The new firmware reads each controller as
// its own type, so assume it is the type being emulated, which is what an adapter is used for.
function hostType(ctx: LegacyImportContext): proto.SubType {
  return USB_HOST_SUBTYPES.includes(ctx.subType) && ctx.subType !== ST.KeyboardMouse
    ? ctx.subType
    : ST.Gamepad;
}

interface HostOutput {
  output: proto.IOutput;
  analog: boolean;
  isUint: boolean;
  // Pressure inputs are buttons that also have an analog value
  pressure?: boolean;
  // Values on a different scale than the old firmware's, so the old calibration can't be kept
  rescaled?: boolean;
}

const GAMEPAD_BUTTONS: Partial<Record<legacy.UsbHostInputType, proto.GamepadButtonType>> = {
  [UT.UsbHostInputType_A]: GB.Gamepad_A,
  [UT.UsbHostInputType_B]: GB.Gamepad_B,
  [UT.UsbHostInputType_X]: GB.Gamepad_X,
  [UT.UsbHostInputType_Y]: GB.Gamepad_Y,
  [UT.UsbHostInputType_LeftShoulder]: GB.Gamepad_LeftShoulder,
  [UT.UsbHostInputType_RightShoulder]: GB.Gamepad_RightShoulder,
  [UT.UsbHostInputType_Back]: GB.Gamepad_Back,
  [UT.UsbHostInputType_Start]: GB.Gamepad_Start,
  [UT.UsbHostInputType_LeftThumbClick]: GB.Gamepad_LeftThumbClick,
  [UT.UsbHostInputType_RightThumbClick]: GB.Gamepad_RightThumbClick,
  [UT.UsbHostInputType_Guide]: GB.Gamepad_Guide,
  [UT.UsbHostInputType_Capture]: GB.Gamepad_Capture,
  [UT.UsbHostInputType_DpadUp]: GB.Gamepad_DpadUp,
  [UT.UsbHostInputType_DpadDown]: GB.Gamepad_DpadDown,
  [UT.UsbHostInputType_DpadLeft]: GB.Gamepad_DpadLeft,
  [UT.UsbHostInputType_DpadRight]: GB.Gamepad_DpadRight,
};

const GAMEPAD_AXES: Partial<Record<legacy.UsbHostInputType, [proto.GamepadAxisType, boolean]>> = {
  [UT.UsbHostInputType_LeftTrigger]: [GA.Gamepad_LeftTrigger, true],
  [UT.UsbHostInputType_RightTrigger]: [GA.Gamepad_RightTrigger, true],
  [UT.UsbHostInputType_LeftStickX]: [GA.Gamepad_LeftStickX, false],
  [UT.UsbHostInputType_LeftStickY]: [GA.Gamepad_LeftStickY, false],
  [UT.UsbHostInputType_RightStickX]: [GA.Gamepad_RightStickX, false],
  [UT.UsbHostInputType_RightStickY]: [GA.Gamepad_RightStickY, false],
};

// The PS3 pressure values, read from the matching button
const PRESSURE: Partial<Record<legacy.UsbHostInputType, proto.GamepadButtonType>> = {
  [UT.UsbHostInputType_PressureDpadUp]: GB.Gamepad_DpadUp,
  [UT.UsbHostInputType_PressureDpadRight]: GB.Gamepad_DpadRight,
  [UT.UsbHostInputType_PressureDpadLeft]: GB.Gamepad_DpadLeft,
  [UT.UsbHostInputType_PressureDpadDown]: GB.Gamepad_DpadDown,
  [UT.UsbHostInputType_PressureL1]: GB.Gamepad_LeftShoulder,
  [UT.UsbHostInputType_PressureR1]: GB.Gamepad_RightShoulder,
  [UT.UsbHostInputType_PressureTriangle]: GB.Gamepad_Y,
  [UT.UsbHostInputType_PressureCircle]: GB.Gamepad_B,
  [UT.UsbHostInputType_PressureCross]: GB.Gamepad_A,
  [UT.UsbHostInputType_PressureSquare]: GB.Gamepad_X,
};

const COLOURS = ['Green', 'Red', 'Yellow', 'Blue', 'Orange'] as const;
// The old firmware set the five frets from these buttons on anything that wasn't a guitar
const FRET_BUTTONS = [
  GB.Gamepad_A,
  GB.Gamepad_B,
  GB.Gamepad_Y,
  GB.Gamepad_X,
  GB.Gamepad_LeftShoulder,
];

function fretOutput(host: proto.SubType, index: number, solo: boolean): proto.IOutput | undefined {
  const colour = COLOURS[index];
  switch (host) {
    case ST.GuitarHeroGuitar:
      // the tap frets are the closest thing GH has to the solo frets
      return {
        ghButton:
          proto.GuitarHeroGuitarButtonType[
            `GuitarHeroGuitar_${solo ? 'Tap' : ''}${colour}` as keyof typeof proto.GuitarHeroGuitarButtonType
          ],
      };
    case ST.RockBandGuitar:
      return {
        rbButton:
          proto.RockBandGuitarButtonType[
            `RockBandGuitar_${solo ? 'Solo' : ''}${colour}` as keyof typeof proto.RockBandGuitarButtonType
          ],
      };
    case ST.ProGuitarMustang:
    case ST.ProGuitarSquire:
      return {
        proButton:
          proto.ProGuitarButtonType[
            `ProGuitar_${solo ? 'Solo' : ''}${colour}` as keyof typeof proto.ProGuitarButtonType
          ],
      };
    default:
      if (solo) {
        return undefined;
      }
      // GH drums have their orange cymbal on the right shoulder
      if (host === ST.GuitarHeroDrums && index === 4) {
        return { gamepadButton: GB.Gamepad_RightShoulder };
      }
      return { gamepadButton: FRET_BUTTONS[index] };
  }
}

const DJ_BUTTONS: Partial<Record<legacy.UsbHostInputType, proto.DJHTurntableButtonType>> = {
  [UT.UsbHostInputType_LeftBlue]: proto.DJHTurntableButtonType.DJHTurntable_LeftBlue,
  [UT.UsbHostInputType_LeftRed]: proto.DJHTurntableButtonType.DJHTurntable_LeftRed,
  [UT.UsbHostInputType_LeftGreen]: proto.DJHTurntableButtonType.DJHTurntable_LeftGreen,
  [UT.UsbHostInputType_RightBlue]: proto.DJHTurntableButtonType.DJHTurntable_RightBlue,
  [UT.UsbHostInputType_RightRed]: proto.DJHTurntableButtonType.DJHTurntable_RightRed,
  [UT.UsbHostInputType_RightGreen]: proto.DJHTurntableButtonType.DJHTurntable_RightGreen,
};

const DJ_AXES: Partial<Record<legacy.UsbHostInputType, proto.DJHTurntableAxisType>> = {
  [UT.UsbHostInputType_LeftTableVelocity]: proto.DJHTurntableAxisType.DJHTurntable_LeftVelocity,
  [UT.UsbHostInputType_RightTableVelocity]: proto.DJHTurntableAxisType.DJHTurntable_RightVelocity,
  [UT.UsbHostInputType_EffectsKnob]: proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob,
  [UT.UsbHostInputType_Crossfader]: proto.DJHTurntableAxisType.DJHTurntable_Crossfader,
};

const PRO_GUITAR_AXES: Partial<Record<legacy.UsbHostInputType, proto.ProGuitarAxisType>> = {
  [UT.UsbHostInputType_LowEFret]: proto.ProGuitarAxisType.ProGuitar_LowEFret,
  [UT.UsbHostInputType_AFret]: proto.ProGuitarAxisType.ProGuitar_AFret,
  [UT.UsbHostInputType_DFret]: proto.ProGuitarAxisType.ProGuitar_DFret,
  [UT.UsbHostInputType_GFret]: proto.ProGuitarAxisType.ProGuitar_GFret,
  [UT.UsbHostInputType_BFret]: proto.ProGuitarAxisType.ProGuitar_BFret,
  [UT.UsbHostInputType_HighEFret]: proto.ProGuitarAxisType.ProGuitar_HighEFret,
  [UT.UsbHostInputType_LowEFretVelocity]: proto.ProGuitarAxisType.ProGuitar_LowEFretVelocity,
  [UT.UsbHostInputType_AFretVelocity]: proto.ProGuitarAxisType.ProGuitar_AFretVelocity,
  [UT.UsbHostInputType_DFretVelocity]: proto.ProGuitarAxisType.ProGuitar_DFretVelocity,
  [UT.UsbHostInputType_GFretVelocity]: proto.ProGuitarAxisType.ProGuitar_GFretVelocity,
  [UT.UsbHostInputType_BFretVelocity]: proto.ProGuitarAxisType.ProGuitar_BFretVelocity,
  [UT.UsbHostInputType_HighEFretVelocity]: proto.ProGuitarAxisType.ProGuitar_HighEFretVelocity,
};

function guitarAxis(
  host: proto.SubType,
  axis: 'Whammy' | 'Tilt' | 'Pickup'
): proto.IOutput | undefined {
  switch (host) {
    case ST.GuitarHeroGuitar:
      return axis === 'Pickup'
        ? undefined
        : { ghAxis: proto.GuitarHeroGuitarAxisType[`GuitarHeroGuitar_${axis}`] };
    case ST.RockBandGuitar:
      return { rbAxis: proto.RockBandGuitarAxisType[`RockBandGuitar_${axis}`] };
    case ST.LiveGuitar:
      return axis === 'Pickup'
        ? undefined
        : { ghlAxis: proto.GuitarHeroLiveGuitarAxisType[`GuitarHeroLiveGuitar_${axis}`] };
    case ST.ProGuitarMustang:
    case ST.ProGuitarSquire:
      return axis === 'Tilt' ? { proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt } : undefined;
    default:
      return undefined;
  }
}

// The output the firmware decodes from a host controller of type `host` for an old input type.
// Returns a warning instead when there's no equivalent.
export function hostOutput(
  type: legacy.UsbHostInputType,
  host: proto.SubType
): HostOutput | string {
  const skipped = "A USB host or Bluetooth binding that the new firmware can't read was skipped.";
  const button = (output: proto.IOutput): HostOutput => ({ output, analog: false, isUint: true });
  if (type in GAMEPAD_BUTTONS) {
    return button({ gamepadButton: GAMEPAD_BUTTONS[type] });
  }
  if (type in GAMEPAD_AXES) {
    const [axis, isUint] = GAMEPAD_AXES[type]!;
    return { output: { gamepadAxis: axis }, analog: true, isUint };
  }
  if (type in PRESSURE) {
    return {
      output: { gamepadButton: PRESSURE[type] },
      analog: true,
      isUint: true,
      pressure: true,
    };
  }
  if (type >= UT.UsbHostInputType_SoloGreen && type <= UT.UsbHostInputType_Orange) {
    const solo = type <= UT.UsbHostInputType_SoloOrange;
    const index = solo ? type - UT.UsbHostInputType_SoloGreen : type - UT.UsbHostInputType_Green;
    const output = fretOutput(host, index, solo);
    return output ? button(output) : skipped;
  }
  if (type in DJ_BUTTONS) {
    return host === ST.DjHeroTurntable ? button({ djhButton: DJ_BUTTONS[type] }) : skipped;
  }
  if (type in DJ_AXES) {
    return host === ST.DjHeroTurntable
      ? { output: { djhAxis: DJ_AXES[type] }, analog: true, isUint: false }
      : skipped;
  }
  if (type in PRO_GUITAR_AXES) {
    if (host !== ST.ProGuitarMustang && host !== ST.ProGuitarSquire) {
      return skipped;
    }
    return {
      output: { proAxis: PRO_GUITAR_AXES[type] },
      analog: true,
      isUint: true,
      rescaled: true,
    };
  }
  switch (type) {
    case UT.UsbHostInputType_Whammy:
    case UT.UsbHostInputType_Tilt:
    case UT.UsbHostInputType_Pickup: {
      const name =
        type === UT.UsbHostInputType_Whammy
          ? 'Whammy'
          : type === UT.UsbHostInputType_Tilt
            ? 'Tilt'
            : 'Pickup';
      const output = guitarAxis(host, name);
      return output ? { output, analog: true, isUint: name !== 'Tilt' } : skipped;
    }
    case UT.UsbHostInputType_Kick1:
    case UT.UsbHostInputType_Kick2:
    case UT.UsbHostInputType_RedVelocity:
    case UT.UsbHostInputType_YellowVelocity:
    case UT.UsbHostInputType_BlueVelocity:
    case UT.UsbHostInputType_GreenVelocity:
    case UT.UsbHostInputType_OrangeVelocity:
    case UT.UsbHostInputType_BlueCymbalVelocity:
    case UT.UsbHostInputType_YellowCymbalVelocity:
    case UT.UsbHostInputType_GreenCymbalVelocity:
    case UT.UsbHostInputType_KickVelocity:
    case UT.UsbHostInputType_YellowCymbal:
    case UT.UsbHostInputType_BlueCymbal:
    case UT.UsbHostInputType_GreenCymbal:
      return 'Drum pad bindings from a USB host or Bluetooth drum kit were skipped, set them up again.';
    case UT.UsbHostInputType_Slider:
      return 'A USB host GH5 slider binding was skipped, the new firmware reads the slider as the tap frets.';
    default:
      return skipped;
  }
}

function usbHostDevice(ctx: LegacyImportContext) {
  return ctx.addDevice('usbHost', 'main', (dev) => {
    // The old firmware put D- on the pin after D+
    dev.firstPin = ctx.old.usbHostDp ?? -1;
    dev.dmFirst = false;
    // The Adafruit Feather USB host board's 5V enable pin, which the new firmware drives itself
    dev.enable5v = !!ctx.old.adafruitHost;
  });
}

function usbSlot(ctx: LegacyImportContext, kind: 'controller' | 'keyboard' | 'mouse') {
  usbHostDevice(ctx);
  if (kind === 'controller') {
    const name = proto.SubType[hostType(ctx)].replace(/([a-z])([A-Z])/g, '$1 $2');
    ctx.warn(
      `USB host bindings were imported for a ${name} controller, add another USB host slot for other controllers.`
    );
  }
  return ctx.addSlot('usbHost', kind, {
    usbType: kind === 'controller' ? hostType(ctx) : ST.KeyboardMouse,
  });
}

function btSlot(ctx: LegacyImportContext) {
  ctx.addDevice('bt', 'main');
  ctx.warn("The Bluetooth controller couldn't be imported, pair it again.");
  return ctx.addSlot('bt', 'main', { bluetoothType: hostType(ctx) });
}

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

function hostInput(
  ctx: LegacyImportContext,
  h: legacy.ISerializedUsbHostInput | legacy.ISerializedBluetoothInput,
  bluetooth: boolean
): ConvertedInput | undefined {
  const type = h.type ?? UT.UsbHostInputType_X;
  if (
    type === UT.UsbHostInputType_KeyboardInput ||
    type === UT.UsbHostInputType_MouseButton ||
    type === UT.UsbHostInputType_MouseAxis
  ) {
    if (bluetooth) {
      ctx.warn('Bluetooth keyboard and mouse bindings were skipped.');
      return undefined;
    }
    if (type === UT.UsbHostInputType_KeyboardInput) {
      const key = AVALONIA_KEY_TO_HID[h.key ?? 44];
      if (key == null) {
        ctx.warn("A USB host keyboard binding for a key the new firmware can't read was skipped.");
        return undefined;
      }
      return {
        input: { key: { deviceid: usbSlot(ctx, 'keyboard'), key } },
        analog: false,
        isUint: true,
      };
    }
    const deviceid = usbSlot(ctx, 'mouse');
    if (type === UT.UsbHostInputType_MouseButton) {
      const button = MOUSE_BUTTONS[h.mouseButtonType ?? 0];
      return { input: { mouseButton: { deviceid, button } }, analog: false, isUint: true };
    }
    const axis = MOUSE_AXES[h.mouseAxisType ?? 0];
    return { input: { mouseAxis: { deviceid, axis } }, analog: true, isUint: false };
  }
  const target = hostOutput(type, hostType(ctx));
  if (typeof target === 'string') {
    ctx.warn(target);
    return undefined;
  }
  const deviceid = bluetooth ? btSlot(ctx) : usbSlot(ctx, 'controller');
  let input: proto.IInput;
  if (target.analog && !target.pressure) {
    input = bluetooth
      ? { btAxis: { deviceid, axis: target.output } }
      : { usbAxis: { deviceid, axis: target.output } };
  } else {
    input = bluetooth
      ? { btButton: { deviceid, button: target.output } }
      : { usbButton: { deviceid, button: target.output } };
  }
  if (target.rescaled) {
    // The old firmware gave the raw fret numbers and velocities, so the old calibration doesn't
    // fit the new full range values. Marking it digital makes the axis use the full range.
    ctx.warn('USB host pro guitar fret bindings were imported with the default calibration.');
    return { input, analog: false, isUint: true };
  }
  return { input, analog: target.analog, isUint: target.isUint };
}

// ---------------------------------------------------------------------------
// MIDI
// ---------------------------------------------------------------------------

// Old MIDI inputs read every MIDI source at once on any channel, while each new MIDI slot claims a
// single device on one channel. So an old MIDI binding is bound to every slot the old config could
// have got MIDI from: the drum peripherals, and a slot for serial / USB MIDI.
function midiChannel(ctx: LegacyImportContext) {
  return ctx.subType === ST.GuitarHeroDrums || ctx.subType === ST.RockBandDrums ? 10 : 1;
}

// The slot for MIDI from serial MIDI or a USB MIDI device
function genericMidiSlot(ctx: LegacyImportContext, drumSlots: number[]) {
  const old = ctx.old;
  // With drum peripherals and no serial MIDI, the drums were the only MIDI source. A slot for
  // other MIDI devices would stop the profile from being used until one is plugged in.
  if (drumSlots.length && !old.midiSerialEnabled) {
    return undefined;
  }
  if (old.midiSerialEnabled) {
    ctx.addDevice('midiSerial', 'main', (dev) => setUart(dev.uart, -1, old.midiSerialPin ?? 1));
  }
  const channel = midiChannel(ctx);
  ctx.warn(
    `MIDI bindings now only listen to MIDI channel ${channel}, change the MIDI slot's channel if your MIDI device uses another one.`
  );
  return ctx.addSlot('midi', 'main', { midiChannel: channel });
}

function midiInput(
  ctx: LegacyImportContext,
  { serializedMidiInput: m }: legacy.ISerializedInput
): ConvertedInput | undefined {
  const type = m!.type ?? legacy.MidiType.MidiType_Note;
  const note = m!.key ?? 0;
  const drumSlots = legacyDrumMidiSlots(ctx);
  const generic = genericMidiSlot(ctx, drumSlots);
  const source = proto.MidiInputSourceType.MidiInputSourceType_MIDI;
  const make = (deviceid: number, channel: number, value: number): proto.IInput => {
    const midi: proto.IMidiInput = { deviceid, sourceType: source };
    switch (type) {
      case legacy.MidiType.MidiType_PitchWheel:
        midi.midiPitchBend = { channel };
        break;
      case legacy.MidiType.MidiType_ModWheel:
        midi.midiControlChange = { cc: 1, channel };
        break;
      case legacy.MidiType.MidiType_SustainPedal:
        midi.midiControlChange = { cc: 64, channel };
        break;
      default:
        midi.midiNote = { note: value, channel };
    }
    return { midi };
  };
  const inputs: proto.IInput[] = [];
  if (generic != null) {
    inputs.push(make(generic, midiChannel(ctx), note));
  }
  // The drums only send notes, on channel 10
  if (type === legacy.MidiType.MidiType_Note) {
    for (const slot of drumSlots) {
      inputs.push(...legacyDrumNotes(ctx.subType, note).map((n) => make(slot, 10, n)));
    }
  }
  if (!inputs.length) {
    return undefined;
  }
  const [input, ...copies] = inputs;
  if (copies.length) {
    ctx.extraInputs.set(input, copies);
  }
  if (type === legacy.MidiType.MidiType_PitchWheel) {
    // The old firmware squeezed the pitch wheel into a signed 16 bit value, so it wrapped around
    // and rested at the very bottom. Its calibration can't carry over, so this is treated like a
    // digital input, which gets the usual full range calibration.
    ctx.warn('Pitch bend bindings were given the default calibration, so check them.');
    return { input, analog: false, isUint: true };
  }
  if (type !== legacy.MidiType.MidiType_Note) {
    return { input, analog: true, isUint: true };
  }
  return {
    input,
    analog: true,
    isUint: true,
    mapping: {
      // A note is a single event, so hold it (at its peak velocity) long enough for a game to see
      // it, and press a button for any velocity like the old firmware did
      debounce: 30,
      peakBased: true,
      trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      triggerValue: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

// Old keyboard / mouse settings without an equivalent
export function convertHostMidiSettings(ctx: LegacyImportContext) {
  const old = ctx.old;
  const bindings = old.bindings.map((b) => legacy.SerializedOutput.fromObject(b).subtype);
  if (
    Object.hasOwn(old, 'mouseMovementType') &&
    old.mouseMovementType === legacy.MouseMovementType.MouseMovementType_Absolute &&
    bindings.includes('serializedMouseAxis')
  ) {
    ctx.warn(
      'Mouse movement was set to absolute, the new firmware only moves the mouse relatively.'
    );
  }
  if (
    (old.rolloverMode ?? legacy.RolloverMode.RolloverMode_Nkro) ===
      legacy.RolloverMode.RolloverMode_Nkro &&
    bindings.filter((b) => b === 'serializedKeyboardButton').length > 10
  ) {
    ctx.warn('The new firmware sends at most 10 keyboard keys at once.');
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerInputConverters({
  serializedUsbHostInput: (ctx, { serializedUsbHostInput: h }) => hostInput(ctx, h!, false),
  serializedBluetoothInput: (ctx, { serializedBluetoothInput: h }) => hostInput(ctx, h!, true),
  serializedMidiInput: midiInput,
});

const convertChildren = (
  ctx: LegacyImportContext,
  outputs: legacy.ISerializedOutput[] | null | undefined
) => {
  for (const child of outputs ?? []) {
    convertOutput(ctx, child);
  }
};

registerOutputConverters({
  // The children's inputs say which host they read from, so there's nothing else to set up
  serializedCombinedUsbHostOutput: (ctx, { serializedCombinedUsbHostOutput: o }) =>
    convertChildren(ctx, o!.outputs),
  serializedCombinedUsbHostOutput122: (ctx, { serializedCombinedUsbHostOutput122: o }) =>
    convertChildren(ctx, o!.outputs),
  serializedCombinedBluetoothOutput: (ctx, { serializedCombinedBluetoothOutput: o }) =>
    convertChildren(ctx, o!.outputs),
  // The children have the first note applied already
  serializedCombinedMidiOutput: (ctx, { serializedCombinedMidiOutput: o }) =>
    convertChildren(ctx, o!.outputs),

  serializedKeyboardButton: (ctx, { serializedKeyboardButton: o }) => {
    const output = keyboardOutput(o!.type ?? 0);
    if (!output) {
      ctx.warn("A keyboard binding for a key the new firmware can't send was skipped.");
      return;
    }
    addButton(ctx, o!.input, output, o!.debounce, { enabled: o!.enabled });
  },
});
