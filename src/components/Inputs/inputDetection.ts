import { proto } from '@/components/SettingsContext/config';

// The Output fields holding an enum, which a USB or bluetooth input detect can try
export type OutputEnumField =
  | 'gamepadButton'
  | 'gamepadAxis'
  | 'ghButton'
  | 'ghAxis'
  | 'rbButton'
  | 'rbAxis'
  | 'ghDrumAxis'
  | 'rbDrumButton'
  | 'rbDrumAxis'
  | 'ghlButton'
  | 'ghlAxis'
  | 'proButton'
  | 'proAxis'
  | 'djhButton'
  | 'djhAxis'
  | 'divaAxis'
  | 'gfButton'
  | 'proKeyboardButton'
  | 'proKeyboardAxis'
  | 'popnButton'
  | 'bmButton'
  | 'dmButton'
  | 'kbmButton'
  | 'mouseButton'
  | 'mouseAxis'
  | 'wheelAxis';

const outputEnums: Record<OutputEnumField, Record<string, string | number>> = {
  gamepadButton: proto.GamepadButtonType,
  gamepadAxis: proto.GamepadAxisType,
  ghButton: proto.GuitarHeroGuitarButtonType,
  ghAxis: proto.GuitarHeroGuitarAxisType,
  rbButton: proto.RockBandGuitarButtonType,
  rbAxis: proto.RockBandGuitarAxisType,
  ghDrumAxis: proto.GuitarHeroDrumsAxisType,
  rbDrumButton: proto.RockBandDrumsButtonType,
  rbDrumAxis: proto.RockBandDrumsAxisType,
  ghlButton: proto.GuitarHeroLiveGuitarButtonType,
  ghlAxis: proto.GuitarHeroLiveGuitarAxisType,
  proButton: proto.ProGuitarButtonType,
  proAxis: proto.ProGuitarAxisType,
  djhButton: proto.DJHTurntableButtonType,
  djhAxis: proto.DJHTurntableAxisType,
  divaAxis: proto.ProjectDivaAxisType,
  gfButton: proto.GuitarFreaksButtonType,
  proKeyboardButton: proto.ProKeyboardButtonType,
  proKeyboardAxis: proto.ProKeyboardAxisType,
  popnButton: proto.PopNMusicButtonType,
  bmButton: proto.BeatManiaButtonType,
  dmButton: proto.DrumManiaButtonType,
  kbmButton: proto.KeyboardManiaButtonType,
  mouseButton: proto.MouseButtonType,
  mouseAxis: proto.MouseAxisType,
  wheelAxis: proto.WheelAxisType,
};

interface OutputFields {
  button?: OutputEnumField;
  axis?: OutputEnumField;
  // Keyboard keys, which are keycodes rather than an enum
  keys?: boolean;
}

// The Output fields the input editor offers for each subtype (see OutputBox)
const outputFieldsBySubType: Partial<Record<proto.SubType, OutputFields>> = {
  [proto.SubType.Gamepad]: { button: 'gamepadButton', axis: 'gamepadAxis' },
  [proto.SubType.Dancepad]: { button: 'gamepadButton', axis: 'gamepadAxis' },
  [proto.SubType.Taiko]: { button: 'gamepadButton', axis: 'gamepadAxis' },
  [proto.SubType.StageKit]: { button: 'gamepadButton', axis: 'gamepadAxis' },
  [proto.SubType.Wheel]: { button: 'gamepadButton', axis: 'wheelAxis' },
  [proto.SubType.GuitarHeroGuitar]: { button: 'ghButton', axis: 'ghAxis' },
  [proto.SubType.RockBandGuitar]: { button: 'rbButton', axis: 'rbAxis' },
  [proto.SubType.GuitarHeroDrums]: { axis: 'ghDrumAxis' },
  [proto.SubType.RockBandDrums]: { button: 'rbDrumButton', axis: 'rbDrumAxis' },
  [proto.SubType.LiveGuitar]: { button: 'ghlButton', axis: 'ghlAxis' },
  [proto.SubType.DjHeroTurntable]: { button: 'djhButton', axis: 'djhAxis' },
  [proto.SubType.ProGuitarMustang]: { button: 'proButton', axis: 'proAxis' },
  [proto.SubType.ProGuitarSquier]: { button: 'proButton', axis: 'proAxis' },
  [proto.SubType.GuitarFreaks]: { button: 'gfButton', axis: 'gamepadAxis' },
  [proto.SubType.DrumMania]: { button: 'dmButton', axis: 'gamepadAxis' },
  [proto.SubType.KeyboardMania]: { button: 'kbmButton' },
  [proto.SubType.BeatMania]: { button: 'bmButton', axis: 'gamepadAxis' },
  [proto.SubType.PopNMusic]: { button: 'popnButton', axis: 'gamepadAxis' },
  [proto.SubType.ProjectDiva]: { axis: 'divaAxis' },
  [proto.SubType.ProKeys]: { button: 'proKeyboardButton', axis: 'proKeyboardAxis' },
  [proto.SubType.KeyboardMouse]: { button: 'mouseButton', axis: 'mouseAxis', keys: true },
};

export interface DetectInputRequest {
  kind: proto.InputDetectKind;
  deviceid: number;
  // Also look for axes being moved, not just buttons being pressed
  axes: boolean;
  // USB and bluetooth: which Output fields the detected value belongs to
  buttonField?: OutputEnumField;
  axisField?: OutputEnumField;
  keys?: boolean;
  // MIDI: where the device comes from, and the channel its slot is fixed to, if it is
  midiSourceType?: proto.MidiInputSourceType;
  midiChannel?: number;
}

// The firmware takes Output fields by their tag, so read it back out of an encoded Output
function outputTag(field: OutputEnumField): number {
  const bytes = proto.Output.encode({ [field]: 1 }).finish();
  let key = 0;
  for (let i = 0, shift = 0; i < bytes.length; i++, shift += 7) {
    key |= (bytes[i] & 0x7f) << shift;
    if (!(bytes[i] & 0x80)) {
      break;
    }
  }
  return key >>> 3;
}

function enumMax(field: OutputEnumField): number {
  return Math.max(...Object.values(outputEnums[field]).filter((v) => typeof v === 'number'));
}

// A request for a fixed kind (wii, ps2, snes, joybus), or for a USB or bluetooth device of the
// given subtype; undefined when that subtype has nothing to detect
export function detectInputRequest(
  kind: proto.InputDetectKind,
  deviceid: number,
  axes: boolean,
  subtype?: proto.SubType
): DetectInputRequest | undefined {
  if (kind !== proto.InputDetectKind.DetectUsb && kind !== proto.InputDetectKind.DetectBluetooth) {
    return { kind, deviceid, axes };
  }
  const fields = subtype != null ? outputFieldsBySubType[subtype] : undefined;
  if (!fields || (!fields.button && !fields.keys && !(axes && fields.axis))) {
    return undefined;
  }
  return {
    kind,
    deviceid,
    axes,
    buttonField: fields.button,
    axisField: fields.axis,
    keys: fields.keys,
  };
}

// Notes, control changes and pitch bends from a MIDI device, which might be a USB, bluetooth or wii one
export function detectMidiRequest(
  deviceid: number,
  midiSourceType: proto.MidiInputSourceType,
  midiChannel?: number | null
): DetectInputRequest {
  return {
    kind: proto.InputDetectKind.DetectMidi,
    deviceid,
    axes: true,
    midiSourceType,
    midiChannel: midiChannel ?? undefined,
  };
}

export function detectInputCommand(request: DetectInputRequest): proto.IDetectInputCommand {
  const command: proto.IDetectInputCommand = {
    kind: request.kind,
    deviceid: request.deviceid,
    axes: request.axes,
  };
  if (request.buttonField) {
    command.buttonOutput = outputTag(request.buttonField);
    command.buttonOutputMax = enumMax(request.buttonField);
  }
  if (request.axisField) {
    command.axisOutput = outputTag(request.axisField);
    command.axisOutputMax = enumMax(request.axisField);
  }
  if (request.keys) {
    command.keys = true;
  }
  if (request.midiSourceType != null) {
    command.midiSourceType = request.midiSourceType;
  }
  return command;
}

// The input a detection event describes, ready to dispatch to the input being edited
export function detectedInput(
  request: DetectInputRequest,
  event: proto.IInputDetectionEvent
): proto.IInput | undefined {
  const { deviceid } = request;
  const value = event.value!;
  const axis = !!event.axis;
  switch (request.kind) {
    case proto.InputDetectKind.DetectWii:
      return axis
        ? { wiiAxis: { deviceid, axis: value } }
        : { wiiButton: { deviceid, button: value } };
    case proto.InputDetectKind.DetectPS2:
      return axis
        ? { ps2Axis: { deviceid, axis: value } }
        : { ps2Button: { deviceid, button: value } };
    case proto.InputDetectKind.DetectSNES:
      return axis
        ? { snesAxis: { deviceid, axis: value } }
        : { snesButton: { deviceid, button: value } };
    case proto.InputDetectKind.DetectJoybus:
      return axis
        ? { joybusAxis: { deviceid, axis: value } }
        : { joybusButton: { deviceid, button: value } };
    case proto.InputDetectKind.DetectUsb:
    case proto.InputDetectKind.DetectBluetooth: {
      const field = axis ? request.axisField : request.buttonField;
      if (!field && !event.key) {
        return undefined;
      }
      const output: proto.IOutput = event.key ? { keycode: value } : { [field!]: value };
      if (request.kind === proto.InputDetectKind.DetectUsb) {
        return axis
          ? { usbAxis: { deviceid, axis: output } }
          : { usbButton: { deviceid, button: output } };
      }
      return axis
        ? { btAxis: { deviceid, axis: output } }
        : { btButton: { deviceid, button: output } };
    }
    case proto.InputDetectKind.DetectMidi: {
      // A slot fixed to a channel puts that channel on its inputs, as picking one by hand does
      const channel = request.midiChannel ?? event.midiChannel!;
      const midi: proto.IMidiInput = { deviceid, sourceType: request.midiSourceType };
      switch (event.midiType) {
        case proto.InputDetectMidiType.DetectMidiNote:
          return { midi: { ...midi, midiNote: { note: value, channel } } };
        case proto.InputDetectMidiType.DetectMidiControlChange:
          return { midi: { ...midi, midiControlChange: { cc: value, channel } } };
        case proto.InputDetectMidiType.DetectMidiPitchBend:
          return { midi: { ...midi, midiPitchBend: { channel } } };
        default:
          return undefined;
      }
    }
    default:
      return undefined;
  }
}
