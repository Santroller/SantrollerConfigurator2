import type { TFunction } from 'i18next';
import { proto } from '@/components/SettingsContext/config';
import { MIDI_PERCUSSION_CHANNEL } from '@/devices/midi';

export type InputKind = keyof proto.IInput;

export function isSelectablePS2Axis(key: string, selected?: string): boolean {
  return !key.startsWith('PS2AxisDualshock2') || key === selected;
}

const PS2_STANDARD_BUTTONS = [
  'PS2ButtonSelect',
  'PS2ButtonL3',
  'PS2ButtonR3',
  'PS2ButtonStart',
  'PS2ButtonDpadUp',
  'PS2ButtonDpadRight',
  'PS2ButtonDpadDown',
  'PS2ButtonDpadLeft',
  'PS2ButtonL2',
  'PS2ButtonR2',
  'PS2ButtonL1',
  'PS2ButtonR1',
  'PS2ButtonTriangle',
  'PS2ButtonCircle',
  'PS2ButtonCross',
  'PS2ButtonSquare',
];
const PS2_STICK_AXES = [
  'PS2AxisLeftStickX',
  'PS2AxisLeftStickY',
  'PS2AxisRightStickX',
  'PS2AxisRightStickY',
];

// Which PS2 inputs the firmware can actually read for each controller type
function ps2InputsForType(type: proto.PS2ControllerType): { axes: string[]; buttons: string[] } {
  const T = proto.PS2ControllerType;
  const prefixed = (e: object, prefix: string) =>
    Object.keys(e).filter((key) => isNaN(Number(key)) && key.startsWith(prefix));
  switch (type) {
    case T.PS2ControllerTypeDualshock2:
      return {
        axes: [...PS2_STICK_AXES, ...prefixed(proto.PS2AxisType, 'PS2AxisDualshock2')],
        buttons: PS2_STANDARD_BUTTONS,
      };
    case T.PS2ControllerTypeDualshock:
    case T.PS2ControllerTypeFlightStick:
      return { axes: PS2_STICK_AXES, buttons: PS2_STANDARD_BUTTONS };
    // A TaTaCon can't be told apart from a digital pad, so its drum inputs are offered here too
    case T.PS2ControllerTypeDigital:
      return {
        axes: [],
        buttons: [
          ...PS2_STANDARD_BUTTONS.filter((b) => b !== 'PS2ButtonL3' && b !== 'PS2ButtonR3'),
          ...prefixed(proto.PS2ButtonType, 'PS2ButtonTaiko'),
        ],
      };
    case T.PS2ControllerTypePopNMusic:
      return {
        axes: [],
        buttons: [
          ...prefixed(proto.PS2ButtonType, 'PS2ButtonPopN'),
          'PS2ButtonSelect',
          'PS2ButtonStart',
        ],
      };
    case T.PS2ControllerTypeGuitarFreaks:
      return {
        axes: [],
        buttons: [
          ...prefixed(proto.PS2ButtonType, 'PS2ButtonGuitarFreaks'),
          'PS2ButtonSelect',
          'PS2ButtonStart',
        ],
      };
    case T.PS2ControllerTypeDrumMania:
      return {
        axes: [],
        buttons: [
          ...prefixed(proto.PS2ButtonType, 'PS2ButtonDrumMania'),
          'PS2ButtonSelect',
          'PS2ButtonStart',
        ],
      };
    case T.PS2ControllerTypeGuitar:
      return {
        axes: ['PS2AxisGuitarWhammy'],
        buttons: prefixed(proto.PS2ButtonType, 'PS2ButtonGuitar').filter(
          (key) => !key.startsWith('PS2ButtonGuitarFreaks')
        ),
      };
    case T.PS2ControllerTypeNegCon:
      return {
        axes: prefixed(proto.PS2AxisType, 'PS2AxisNegCon'),
        buttons: prefixed(proto.PS2ButtonType, 'PS2ButtonNegCon'),
      };
    case T.PS2ControllerTypeJogCon:
      return { axes: ['PS2AxisJogConWheel'], buttons: PS2_STANDARD_BUTTONS };
    case T.PS2ControllerTypeFishingRod:
      return {
        axes: [
          'PS2AxisLeftStickX',
          'PS2AxisLeftStickY',
          'PS2AxisFishingMotionX',
          'PS2AxisFishingMotionY',
          'PS2AxisFishingMotionZ',
          'PS2AxisFishingReel',
          'PS2AxisFishingReelAccumulated',
        ],
        buttons: PS2_STANDARD_BUTTONS,
      };
    case T.PS2ControllerTypeGunCon:
      return { axes: prefixed(proto.PS2AxisType, 'PS2AxisGunCon'), buttons: PS2_STANDARD_BUTTONS };
    case T.PS2ControllerTypeMouse:
      return {
        axes: prefixed(proto.PS2AxisType, 'PS2AxisMouse'),
        buttons: prefixed(proto.PS2ButtonType, 'PS2ButtonMouse'),
      };
    case T.PS2ControllerTypeTaiko:
      return { axes: [], buttons: prefixed(proto.PS2ButtonType, 'PS2ButtonTaiko') };
    default:
      return { axes: Object.keys(proto.PS2AxisType), buttons: Object.keys(proto.PS2ButtonType) };
  }
}

// Filters for the PS2 input dropdowns. With no known controller type everything is offered.
// The currently selected input always stays visible so existing mappings can still be shown.
export function getPS2InputFilters(types: proto.PS2ControllerType[]) {
  const known = types.filter((type) => type !== proto.PS2ControllerType.PS2ControllerTypeUnknown);
  if (!known.length) {
    return { axis: isSelectablePS2Axis, button: () => true };
  }
  const axes = new Set(known.flatMap((type) => ps2InputsForType(type).axes));
  const buttons = new Set(known.flatMap((type) => ps2InputsForType(type).buttons));
  return {
    axis: (key: string, selected?: string) =>
      key === selected || (axes.has(key) && isSelectablePS2Axis(key, selected)),
    button: (key: string, selected?: string) => key === selected || buttons.has(key),
  };
}

const NES_BUTTONS = [
  'SNESButtonB',
  'SNESButtonA',
  'SNESButtonSelect',
  'SNESButtonStart',
  'SNESButtonDpadUp',
  'SNESButtonDpadDown',
  'SNESButtonDpadLeft',
  'SNESButtonDpadRight',
];

// Which SNES inputs the firmware can actually read for each controller type
function snesInputsForType(type: proto.SNESControllerType): { axes: string[]; buttons: string[] } {
  const T = proto.SNESControllerType;
  const names = (e: object) => Object.keys(e).filter((key) => isNaN(Number(key)));
  switch (type) {
    case T.SNESControllerNES:
      return { axes: [], buttons: NES_BUTTONS };
    case T.SNESControllerSNES:
      return {
        axes: [],
        buttons: names(proto.SNESButtonType).filter((key) => !key.startsWith('SNESButtonMouse')),
      };
    case T.SNESControllerMouse:
      return {
        axes: names(proto.SNESAxisType),
        buttons: ['SNESButtonMouseLeft', 'SNESButtonMouseRight'],
      };
    default:
      return { axes: names(proto.SNESAxisType), buttons: names(proto.SNESButtonType) };
  }
}

// Filters for the SNES input dropdowns, everything is offered until a controller is detected
export function getSNESInputFilters(type?: proto.SNESControllerType) {
  const { axes, buttons } = snesInputsForType(type ?? proto.SNESControllerType.SNESControllerNone);
  return {
    axis: (key: string, selected?: string) => key === selected || axes.includes(key),
    button: (key: string, selected?: string) => key === selected || buttons.includes(key),
  };
}

// X/Y only exist on a GameCube controller, and the C buttons only on an N64 controller
export function getJoybusInputFilters(type?: proto.JoybusControllerType) {
  const hidden =
    type === proto.JoybusControllerType.JoybusControllerN64
      ? ['JoybusButtonX', 'JoybusButtonY']
      : type === proto.JoybusControllerType.JoybusControllerGameCube
        ? ['JoybusButtonCUp', 'JoybusButtonCDown', 'JoybusButtonCLeft', 'JoybusButtonCRight']
        : [];
  return {
    axis: () => true,
    button: (key: string, selected?: string) => key === selected || !hidden.includes(key),
  };
}

export function isSelectableWiiAxis(key: string, selected?: string): boolean {
  return (
    (key !== 'WiiAxisClassicLeftTrigger' && key !== 'WiiAxisClassicRightTrigger') ||
    key === selected
  );
}

export type SelectedInput = {
  [Kind in InputKind]: {
    kind: Kind;
    value: NonNullable<proto.IInput[Kind]>;
  };
}[InputKind];

type InputCapabilities = {
  axis: boolean;
  button: boolean;
};

type InputDefinition = {
  isAnalog?: (input: proto.IInput) => boolean;
  usesDevice?: (input: proto.IInput, deviceid: number) => boolean;
};

type DeviceInputDefinition = {
  create: (deviceid: number, capabilities: InputCapabilities) => proto.IInput | undefined;
};

const digitalGpioInput = (): proto.IInput => ({
  gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
});

const hasDevice =
  (getInput: (input: proto.IInput) => { deviceid?: number | null } | null | undefined) =>
  (input: proto.IInput, deviceid: number) =>
    getInput(input)?.deviceid === deviceid;

const inputRegistry: Record<InputKind, InputDefinition> = {
  gpio: { isAnalog: (input) => !!input.gpio?.analog },
  fixed: {},
  key: {},
  mouseAxis: { isAnalog: () => true },
  mouseButton: {},
  mpr121: { usesDevice: hasDevice((input) => input.mpr121) },
  ads1115: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ads1115) },
  infiniumFader: { isAnalog: () => true, usesDevice: hasDevice((input) => input.infiniumFader) },
  wiiAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.wiiAxis) },
  wiiButton: { usesDevice: hasDevice((input) => input.wiiButton) },
  crkd: { usesDevice: hasDevice((input) => input.crkd) },
  crkdDrum: { isAnalog: () => true, usesDevice: hasDevice((input) => input.crkdDrum) },
  gh5Neck: { usesDevice: hasDevice((input) => input.gh5Neck) },
  crazyGuitarNeck: { usesDevice: hasDevice((input) => input.crazyGuitarNeck) },
  djhPlatter: {
    isAnalog: (input) =>
      input.djhPlatter?.type === proto.DJHeroPlatterInputType.DJHeroPlatterVelocity,
    usesDevice: hasDevice((input) => input.djhPlatter),
  },
  accelerometer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.accelerometer),
  },
  encoder: { isAnalog: () => true, usesDevice: hasDevice((input) => input.encoder) },
  multiplexer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.multiplexer),
  },
  usbAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.usbAxis) },
  usbButton: { usesDevice: hasDevice((input) => input.usbButton) },
  btAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.btAxis) },
  btButton: { usesDevice: hasDevice((input) => input.btButton) },
  ps2Axis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ps2Axis) },
  ps2Button: { usesDevice: hasDevice((input) => input.ps2Button) },
  snesAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.snesAxis) },
  snesButton: { usesDevice: hasDevice((input) => input.snesButton) },
  joybusAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.joybusAxis) },
  joybusButton: { usesDevice: hasDevice((input) => input.joybusButton) },
  midi: {
    isAnalog: (input) =>
      !!(
        input.midi?.midiNote ||
        input.midi?.midiControlChange ||
        input.midi?.midiPitchBend ||
        input.midi?.midiProGuitarAxis
      ),
    usesDevice: hasDevice((input) => input.midi),
  },
  protarNeckAxis: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.protarNeckAxis),
  },
  protarNeckButton: { usesDevice: hasDevice((input) => input.protarNeckButton) },
  vtechExpander: { usesDevice: hasDevice((input) => input.vtechExpander) },
  peripheral: {
    isAnalog: (input) => !!input.peripheral?.analog,
    usesDevice: hasDevice((input) => input.peripheral),
  },
  matrix: { usesDevice: hasDevice((input) => input.matrix) },
  switchNetwork: { usesDevice: hasDevice((input) => input.switchNetwork) },
  shortcut: {
    usesDevice: (input, deviceid) =>
      input.shortcut?.inputs?.some((nestedInput) => inputUsesDevice(nestedInput, deviceid)) ??
      false,
  },
  held: {
    usesDevice: (input, deviceid) =>
      !!input.held?.input && inputUsesDevice(input.held.input, deviceid),
  },
  cycle: {
    isAnalog: () => true,
    usesDevice: (input, deviceid) =>
      input.cycle?.deviceid === deviceid ||
      (!!input.cycle?.input && inputUsesDevice(input.cycle.input, deviceid)) ||
      (!!input.cycle?.inputReverse && inputUsesDevice(input.cycle.inputReverse, deviceid)),
  },
  toggle: {
    usesDevice: (input, deviceid) =>
      input.toggle?.deviceid === deviceid ||
      (!!input.toggle?.input && inputUsesDevice(input.toggle.input, deviceid)),
  },
  shifted: {
    usesDevice: (input, deviceid) =>
      (!!input.shifted?.input && inputUsesDevice(input.shifted.input, deviceid)) ||
      (!!input.shifted?.shift && inputUsesDevice(input.shifted.shift, deviceid)),
  },
};

const deviceInputRegistry: Record<string, DeviceInputDefinition> = {
  mpr121: {
    create: (deviceid) => ({
      mpr121: {
        deviceid,
        pin: 0,
        mode: proto.Mpr121PinMode.Touch,
        pinMode: proto.PinMode.PullUp,
      },
    }),
  },
  wii: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { wiiAxis: { axis: proto.WiiAxisType.WiiAxisClassicLeftStickX, deviceid } }
        : button
          ? { wiiButton: { button: proto.WiiButtonType.WiiButtonClassicA, deviceid } }
          : undefined,
  },
  psx: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { ps2Axis: { axis: proto.PS2AxisType.PS2AxisLeftStickX, deviceid } }
        : button
          ? { ps2Button: { button: proto.PS2ButtonType.PS2ButtonCross, deviceid } }
          : undefined,
  },
  snes: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { snesAxis: { axis: proto.SNESAxisType.SNESAxisMouseX, deviceid } }
        : button
          ? { snesButton: { button: proto.SNESButtonType.SNESButtonB, deviceid } }
          : undefined,
  },
  joybus: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { joybusAxis: { axis: proto.JoybusAxisType.JoybusAxisStickX, deviceid } }
        : button
          ? { joybusButton: { button: proto.JoybusButtonType.JoybusButtonA, deviceid } }
          : undefined,
  },
  ads1115: { create: (deviceid) => ({ ads1115: { channel: 0, deviceid } }) },
  multiplexer: { create: (deviceid) => ({ multiplexer: { channel: 0, deviceid } }) },
  accelerometer: {
    create: (deviceid) => ({
      accelerometer: { type: proto.AccelerometerInputType.AccelerometerX, deviceid },
    }),
  },
  vtechExpander: { create: (deviceid) => ({ vtechExpander: { button: 0, deviceid } }) },
  matrix: {
    create: (deviceid) => ({ matrix: { outputPin: -1, pin: -1, deviceid } }),
  },
  switchNetwork: {
    create: (deviceid) => ({ switchNetwork: { button: 0, deviceid } }),
  },
  encoder: {
    create: (deviceid) => ({
      encoder: { type: proto.EncoderInputType.EncoderDelta, deviceid },
    }),
  },
  crkdNeck: {
    create: (deviceid) => ({
      crkd: { button: proto.CrkdNeckButtonType.CrkdGreen, deviceid },
    }),
  },
  bhDrum: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  worldTourDrum: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  midiSerial: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  infiniumFader: {
    create: (deviceid) => ({
      infiniumFader: { deviceid },
    }),
  },
  peripheral: {
    create: (deviceid, { axis }) => ({
      peripheral: { pin: -1, pinMode: proto.PinMode.PullUp, analog: axis, deviceid },
    }),
  },
  crkdDrum: {
    create: (deviceid) => ({
      crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdGreenPad, deviceid },
    }),
  },
  gh5Neck: {
    create: (deviceid) => ({
      gh5Neck: { button: proto.Gh5NeckButtonType.Gh5Green, deviceid },
    }),
  },
  djhTurntable: {
    create: (deviceid, { axis }) => ({
      djhPlatter: {
        type: axis
          ? proto.DJHeroPlatterInputType.DJHeroPlatterVelocity
          : proto.DJHeroPlatterInputType.DJHeroPlatterGreen,
        deviceid,
      },
    }),
  },
  crazyGuitarNeck: {
    create: (deviceid) => ({
      crazyGuitarNeck: { button: proto.CrazyGuitarNeckButtonType.CrazyGuitarNeckGreen, deviceid },
    }),
  },
  usbHost: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            usbAxis: {
              axis: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
              deviceid,
            },
          }
        : {
            usbButton: {
              button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
              deviceid,
            },
          },
  },
  bt: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            btAxis: {
              axis: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
              deviceid,
            },
          }
        : {
            btButton: {
              button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
              deviceid,
            },
          },
  },
  protarNeck: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            protarNeckAxis: {
              axis: proto.ProGuitarNeckAxisType.ProGuitarNeckAFret,
              deviceid,
            },
          }
        : {
            protarNeckButton: {
              button: proto.ProGuitarNeckButtonType.ProGuitarNeckGreen,
              deviceid,
            },
          },
  },
  cycle: { create: (deviceid) => ({ cycle: { input: digitalGpioInput(), deviceid } }) },
  toggle: { create: (deviceid) => ({ toggle: { input: digitalGpioInput(), deviceid } }) },
};

const standaloneInputRegistry: Record<string, () => proto.IInput> = {
  gpio_analog: () => ({
    gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating },
  }),
  gpio_digital: digitalGpioInput,
  shortcut: () => ({ shortcut: { inputs: [digitalGpioInput()] } }),
  held: () => ({ held: { input: digitalGpioInput(), time: 1000 } }),
  shifted: () => ({
    shifted: { input: digitalGpioInput(), shift: digitalGpioInput(), invertShift: false },
  }),
};

export function createDeviceInput(
  deviceType: string,
  deviceid: number,
  capabilities: InputCapabilities
) {
  return deviceInputRegistry[deviceType]?.create(deviceid, capabilities);
}

export function createStandaloneInput(type: string) {
  return standaloneInputRegistry[type]?.();
}

export const getHostSourceType = (item: proto.IProfileAssignmentInfo): string | null => {
  if (item.wiiExt != null) {
    return 'wiiExt';
  }
  if (item.ps2Cnt != null) {
    return 'ps2Cnt';
  }
  if (item.snesCnt != null) {
    return 'snesCnt';
  }
  if (item.joybusCnt != null) {
    return 'joybusCnt';
  }
  if (item.usbType != null) {
    return 'usbType';
  }
  if (item.usbDevice != null) {
    return 'usbDevice';
  }
  if (item.bluetoothType != null) {
    return 'bluetoothType';
  }
  if (item.bluetoothDevice != null) {
    return 'bluetoothDevice';
  }
  if (item.midiChannel != null) {
    return 'midiChannel';
  }
  if (item.midiProGuitar != null) {
    return 'midiProGuitar';
  }
  return null;
};

export type ProfileSlot = {
  slotId: number;
  item: proto.IProfileAssignmentInfo;
  items: proto.IProfileAssignmentInfo[];
  deviceKind: string;
  key: string;
  label: string;
  midiChannel?: number;
};

export function getProfileSlotKey(deviceKind: string, slotId: number) {
  return `${deviceKind}:${slotId}`;
}

export function getAssignmentTriggerIds(assignments: proto.IProfileAssignmentInfo[] = []) {
  let triggerId = 0;
  return assignments.map((item) => {
    const currentId = triggerId;
    const hasInputTrigger =
      !!getSelectedInput(item.input?.input) || !!getSelectedInput(item.inputAnyTime?.input);
    const hasTrigger =
      item.consoleType != null ||
      item.bluetooth != null ||
      item.ps2Emulation != null ||
      item.wiiEmulation != null ||
      item.joybusEmulation != null ||
      item.snesEmulation != null ||
      getHostSourceType(item) != null ||
      item.xboxOneAuth != null ||
      hasInputTrigger;
    if (hasTrigger) {
      triggerId += 1;
    }
    return currentId;
  });
}

// The kind of device an assignment's slot is numbered with, or null if it isn't a slot
export function getSlotDeviceKind(item: proto.IProfileAssignmentInfo): string | null {
  // The Xbox One controller authenticating for the rule is claimed into a USB gamepad slot
  if (item.xboxOneAuth != null) {
    return 'usbHost';
  }
  const source = getHostSourceType(item);
  if (!source) {
    return null;
  }
  return source === 'midiChannel' || source === 'midiProGuitar'
    ? 'midi'
    : source === 'wiiExt'
      ? 'wii'
      : source === 'ps2Cnt'
        ? 'psx'
        : source === 'snesCnt'
          ? 'snes'
          : source === 'joybusCnt'
            ? 'joybus'
            : source.startsWith('bluetooth')
              ? 'bt'
              : 'usbHost';
}

// Slots without a subtype (MIDI channels, and specific devices that don't name one). Matches the
// firmware's SLOT_UNTYPED, so they are numbered after every subtype.
export const SLOT_UNTYPED = 0xffff;

export function getSlotSubtype(item: proto.IProfileAssignmentInfo): number {
  return (
    (item.xboxOneAuth != null ? proto.SubType.Gamepad : undefined) ??
    item.usbType ??
    item.usbDevice?.subtype ??
    item.bluetoothType ??
    item.bluetoothDevice?.subtype ??
    item.ps2Cnt ??
    item.snesCnt ??
    item.joybusCnt ??
    item.wiiExt ??
    item.midiProGuitar ??
    SLOT_UNTYPED
  );
}

// The newest deviceSlotIdVersion, matching the firmware's SLOT_ID_VERSION_LATEST
export const SLOT_ID_VERSION_LATEST = 3;

// What tells slots of a kind apart, matching the firmware's slot_key_type. From version 3 a MIDI slot
// is also told apart by its channel and the device it's limited to, so slots on different channels or
// devices aren't read as the same one. Multiplied rather than shifted, as it's wider than 32 bits.
export function getSlotKeyType(item: proto.IProfileAssignmentInfo, version: number): number {
  const subtype = getSlotSubtype(item);
  if (version < 3 || getSlotDeviceKind(item) !== 'midi') {
    return subtype;
  }
  const base = item.midiChannel != null ? 0x10000 + (item.midiChannel & 0xffff) : subtype;
  const device = item.midiDevice;
  const vidPid = (x: { vid: number; pid: number }) => (x.vid & 0xffff) * 0x10000 + (x.pid & 0xffff);
  const [source, detail] =
    device?.usbHost != null
      ? [1, 0]
      : device?.bluetooth != null
        ? [2, 0]
        : device?.usbDevice != null
          ? [3, vidPid(device.usbDevice)]
          : device?.bluetoothDevice != null
            ? [4, vidPid(device.bluetoothDevice)]
            : device?.deviceid != null
              ? [5, device.deviceid >>> 0]
              : [0, 0];
  return (source * 2 ** 32 + detail) * 2 ** 17 + base;
}

// Slot ids for deviceSlotIdVersion 2 and up, matching the firmware's ProfileSlotIds. Each slot is the
// nth slot of its kind and type (getSlotKeyType) within a list, and gets the same id in every list,
// so an input's deviceid always means the same type of device whichever list matched. Ids are
// numbered per kind, in order of type and then n.
export function getProfileWideSlotIds(
  lists: proto.IProfileAssignmentInfo[][],
  version: number = SLOT_ID_VERSION_LATEST
): number[][] {
  const keyed = lists.map((list) => {
    const counts = new Map<string, number>();
    return list.map((item) => {
      const kind = getSlotDeviceKind(item);
      if (!kind) {
        return undefined;
      }
      const type = getSlotKeyType(item, version);
      const n = (counts.get(`${kind}:${type}`) ?? 0) + 1;
      counts.set(`${kind}:${type}`, n);
      return { kind, type, n, key: `${kind}:${type}:${n}` };
    });
  });
  const unique = new Map(keyed.flat().flatMap((slot) => (slot ? [[slot.key, slot] as const] : [])));
  const sorted = [...unique.values()].sort((a, b) => a.type - b.type || a.n - b.n);
  const next = new Map<string, number>();
  const ids = new Map<string, number>();
  for (const slot of sorted) {
    const id = (next.get(slot.kind) ?? 0) + 1;
    next.set(slot.kind, id);
    ids.set(slot.key, id);
  }
  return keyed.map((list) => list.map((slot) => (slot ? ids.get(slot.key)! : 0)));
}

// The slot id of every assignment in each of the profile's lists, for its deviceSlotIdVersion
export function getProfileSlotIds(profile?: proto.IProfile): number[][] {
  return getSlotIdsForLists(
    (profile?.assignments ?? []).map((list) => list.assignments ?? []),
    profile?.opts?.deviceSlotIdVersion ?? 0
  );
}

function getSlotIdsForLists(lists: proto.IProfileAssignmentInfo[][], version: number): number[][] {
  if (version >= 2) {
    return getProfileWideSlotIds(lists, version);
  }
  return lists.map((list) =>
    version >= 1 ? getAssignmentSlotIds(list) : getAssignmentTriggerIds(list)
  );
}

const isWiiDrumNote = (mapping: proto.IMapping) =>
  mapping.input?.midi?.sourceType === proto.MidiInputSourceType.MidiInputSourceType_Wii &&
  mapping.input.midi.midiNote != null;

// Wii drum pads arrive as MIDI notes on channel 10, and the firmware offers a drum kit to MIDI channel
// 10 assignments. Moves the Wii drum notes in a set of defaults onto that MIDI slot, so the pads are
// configured like any other MIDI drum kit, adding a channel 10 assignment to each list that has the Wii
// slot but not the MIDI one. The lists are changed in place.
export function moveWiiDrumNotesToMidiSlot(
  lists: proto.IProfileAssignmentInfo[][],
  version: number,
  wiiSlotId: number,
  mappings: proto.IMapping[]
): proto.IMapping[] {
  if (!mappings.some(isWiiDrumNote)) {
    return mappings;
  }
  const hasWiiSlot = (list: proto.IProfileAssignmentInfo[], ids: number[]) =>
    list.some((item, idx) => getSlotDeviceKind(item) === 'wii' && ids[idx] === wiiSlotId);
  const isDrumChannel = (item: proto.IProfileAssignmentInfo) =>
    item.midiChannel === MIDI_PERCUSSION_CHANNEL;

  const before = getSlotIdsForLists(lists, version);
  lists.forEach((list, listIdx) => {
    if (hasWiiSlot(list, before[listIdx]) && !list.some(isDrumChannel)) {
      list.push({ midiChannel: MIDI_PERCUSSION_CHANNEL });
    }
  });

  const after = getSlotIdsForLists(lists, version);
  const listIdx = lists.findIndex((list, idx) => hasWiiSlot(list, after[idx]));
  if (listIdx === -1) {
    return mappings;
  }
  const midiSlotId = after[listIdx][lists[listIdx].findIndex(isDrumChannel)];
  return mappings.map((mapping) =>
    isWiiDrumNote(mapping)
      ? {
          ...mapping,
          input: {
            ...mapping.input,
            midi: {
              ...mapping.input!.midi,
              deviceid: midiSlotId,
              sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
            },
          },
        }
      : mapping
  );
}

export function getAssignmentSlotIds(assignments: proto.IProfileAssignmentInfo[] = []) {
  const counts = new Map<string, number>();
  return assignments.map((item) => {
    const deviceKind = getSlotDeviceKind(item);
    if (!deviceKind) {
      return 0;
    }
    const slotId = (counts.get(deviceKind) ?? 0) + 1;
    counts.set(deviceKind, slotId);
    return slotId;
  });
}

export function getProfileSlotLabel(
  item: proto.IProfileAssignmentInfo,
  slotId: number,
  t?: (key: string) => string
) {
  const source = getHostSourceType(item);
  if (item.xboxOneAuth != null) {
    return `${t?.('assignments.slot') ?? 'Slot'} ${slotId}: ${t?.('assignments.source.xboxOneAuth') ?? 'Xbox One authentication controller'}`;
  }
  if (!source) {
    return `${t?.('assignments.slot') ?? 'Slot'} ${slotId}`;
  }

  const type =
    item.usbType != null
      ? `subType.${proto.SubType[item.usbType]}`
      : item.bluetoothType != null
        ? `subType.${proto.SubType[item.bluetoothType]}`
        : item.midiProGuitar != null
          ? `subType.${proto.SubType[item.midiProGuitar]}`
          : item.ps2Cnt != null
            ? `ps2Cnt.${proto.PS2ControllerType[item.ps2Cnt]}`
            : item.snesCnt != null
              ? `snesCnt.${proto.SNESControllerType[item.snesCnt]}`
              : item.joybusCnt != null
                ? `joybusCnt.${proto.JoybusControllerType[item.joybusCnt]}`
                : item.wiiExt != null
                  ? `wiiExt.${proto.WiiExtType[item.wiiExt]}`
                  : undefined;
  const typeLabel = type ? (t?.(type) ?? type.split('.').at(-1)) : undefined;
  const sourceLabelKey =
    typeLabel && source === 'usbType'
      ? 'assignments.source.usbTypeWithSubtype'
      : typeLabel && source === 'bluetoothType'
        ? 'assignments.source.bluetoothTypeWithSubtype'
        : typeLabel && source === 'midiProGuitar'
          ? 'assignments.source.midiProGuitarWithSubtype'
          : `assignments.source.${source}`;
  const sourceLabel = t?.(sourceLabelKey) ?? t?.(`assignments.source.${source}`) ?? source;
  return `${t?.('assignments.slot') ?? 'Slot'} ${slotId}: ${sourceLabel}${typeLabel ? ` (${typeLabel})` : ''}`;
}

const EMULATION_ASSIGNMENT_TYPES = [
  'consoleType',
  'bluetooth',
  'ps2Emulation',
  'wiiEmulation',
  'joybusEmulation',
  'snesEmulation',
] as const;

// The "Active when" text summarising one assignment list, shared by the profile editor and the
// assignments guide
export function getRuleSummary(assignments: proto.IProfileAssignmentInfo[], t: TFunction): string {
  return getRuleSummaryParts(assignments, t).join(' + ');
}

// Each condition of the rule on its own: the target, then any connected controllers, then the
// button trigger
export function getRuleSummaryParts(
  assignments: proto.IProfileAssignmentInfo[],
  t: TFunction
): string[] {
  const emulationItem = assignments.find((x) =>
    EMULATION_ASSIGNMENT_TYPES.some((y) => x[y] != null)
  );
  const hostItems = assignments.filter((x) => getHostSourceType(x) !== null);
  const triggerItem = assignments.find((x) => x.input != null || x.inputAnyTime != null);
  let emul = '';
  if (emulationItem?.consoleType) {
    if (emulationItem.consoleType.forcedType) {
      emul = t('assignments.summary.usb', {
        type: t(`consoleMode.${proto.ConsoleMode[emulationItem.consoleType.forcedType]}`),
      });
    } else if (emulationItem.consoleType.consoleType) {
      emul = t('assignments.summary.usb', {
        type: t(`consoleType.${proto.ConsoleType[emulationItem.consoleType.consoleType]}`),
      });
    } else {
      emul = t('assignments.preset_usb_auto');
    }
  } else if (emulationItem?.bluetooth) {
    emul = t('assignments.emulation_mode.bluetooth');
  } else if (emulationItem?.ps2Emulation) {
    emul = t('assignments.emulation_mode.ps2');
  } else if (emulationItem?.wiiEmulation) {
    emul = t('assignments.emulation_mode.wii');
  } else if (emulationItem?.joybusEmulation) {
    emul = t('assignments.emulation_mode.joybus');
  } else if (emulationItem?.snesEmulation) {
    emul = t('assignments.emulation_mode.snes');
  } else {
    emul = t('assignments.no_emulation');
  }

  const hostParts: string[] = [];

  for (const item of hostItems) {
    if (item.wiiExt != null) {
      hostParts.push(
        t('assignments.summary.wii', { type: t(`wiiExt.${proto.WiiExtType[item.wiiExt]}`) })
      );
    } else if (item.ps2Cnt != null) {
      hostParts.push(
        t('assignments.summary.ps2', {
          type: t(`ps2Cnt.${proto.PS2ControllerType[item.ps2Cnt]}`),
        })
      );
    } else if (item.snesCnt != null) {
      hostParts.push(
        t('assignments.summary.snes', {
          type: t(`snesCnt.${proto.SNESControllerType[item.snesCnt]}`),
        })
      );
    } else if (item.joybusCnt != null) {
      hostParts.push(
        t('assignments.summary.joybus', {
          type: t(`joybusCnt.${proto.JoybusControllerType[item.joybusCnt]}`),
        })
      );
    } else if (item.usbType != null) {
      hostParts.push(
        t('assignments.summary.usb', { type: t(`subType.${proto.SubType[item.usbType]}`) })
      );
    } else if (item.usbDevice != null) {
      hostParts.push(t('assignments.source.usbDevice'));
    } else if (item.bluetoothType != null) {
      hostParts.push(
        t('assignments.summary.bluetooth', {
          type: t(`subType.${proto.SubType[item.bluetoothType]}`),
        })
      );
    } else if (item.bluetoothDevice != null) {
      hostParts.push(t('assignments.source.bluetoothDevice'));
    } else if (item.midiChannel != null) {
      hostParts.push(t('assignments.summary.midiChannel', { channel: item.midiChannel }));
    } else if (item.midiProGuitar != null) {
      hostParts.push(
        t('assignments.summary.midi', {
          type: t(`subType.${proto.SubType[item.midiProGuitar]}`),
        })
      );
    }
  }

  if (assignments.some((x) => x.localInputs != null)) {
    hostParts.push(t('assignmentType.localInputs'));
  }

  if (assignments.some((x) => x.xboxOneAuth != null)) {
    hostParts.push(t('assignmentType.xboxOneAuth'));
  }

  let trig = '';
  if (triggerItem?.input) {
    trig = t('assignments.trigger.boot');
  } else if (triggerItem?.inputAnyTime) {
    trig = t('assignments.trigger.anytime');
  }

  const parts = [emul];
  if (hostParts.length > 0) {
    parts.push(...hostParts);
  }
  if (trig) {
    parts.push(trig);
  }
  return parts;
}

export function getProfileSlots(profile?: proto.IProfile, t?: (key: string) => string) {
  const slots = new Map<string, ProfileSlot>();
  const profileSlotIds = getProfileSlotIds(profile);
  for (const [listIdx, rule] of (profile?.assignments ?? []).entries()) {
    const assignments = rule.assignments ?? [];
    const slotIds = profileSlotIds[listIdx];
    for (const [assignmentIndex, item] of assignments.entries()) {
      const slotId = slotIds[assignmentIndex];
      const deviceKind = getSlotDeviceKind(item);
      if (!deviceKind) {
        continue;
      }
      const key = getProfileSlotKey(deviceKind, slotId);
      const existing = slots.get(key);
      if (existing) {
        existing.items.push(item);
        const labels = new Set(existing.label.split(' / '));
        labels.add(getProfileSlotLabel(item, slotId, t));
        existing.label = [...labels].join(' / ');
      } else {
        slots.set(key, {
          slotId,
          item,
          items: [item],
          deviceKind,
          key,
          label: getProfileSlotLabel(item, slotId, t),
        });
      }
    }
  }
  return [...slots.values()].map((slot) => {
    const channels = new Set(
      slot.items.flatMap((item) => (item.midiChannel == null ? [] : [item.midiChannel]))
    );
    return {
      ...slot,
      midiChannel: channels.size === 1 ? [...channels][0] : undefined,
    };
  });
}

export function createSlotInput(slot: ProfileSlot, capabilities: InputCapabilities) {
  if (slot.deviceKind === 'midi' && slot.items.some((item) => item.midiProGuitar != null)) {
    return {
      midi: {
        deviceid: slot.slotId,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
        midiProGuitarButton: { button: proto.ProGuitarMidiButtonType.ProGuitarMidi_A },
      },
    };
  }
  if (slot.deviceKind === 'midi') {
    return {
      midi: {
        deviceid: slot.slotId,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
        midiNote: { note: 1, channel: slot.midiChannel ?? 10 },
      },
    };
  }
  return createDeviceInput(slot.deviceKind, slot.slotId, capabilities);
}

export function getProfileSlotForInput(input: proto.IInput, slots: ProfileSlot[]) {
  const deviceId = getInputDeviceId(input);
  if (deviceId == null) {
    return undefined;
  }

  let deviceKind: string | undefined;
  if (input.wiiAxis || input.wiiButton) {
    deviceKind = 'wii';
  } else if (input.ps2Axis || input.ps2Button) {
    deviceKind = 'psx';
  } else if (input.snesAxis || input.snesButton) {
    deviceKind = 'snes';
  } else if (input.joybusAxis || input.joybusButton) {
    deviceKind = 'joybus';
  } else if (
    input.usbAxis ||
    input.usbButton ||
    input.key ||
    input.mouseAxis ||
    input.mouseButton
  ) {
    deviceKind = 'usbHost';
  } else if (input.btAxis || input.btButton) {
    deviceKind = 'bt';
  } else if (input.midi) {
    switch (input.midi.sourceType) {
      case proto.MidiInputSourceType.MidiInputSourceType_MIDI:
        deviceKind = 'midi';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Auto:
        return undefined;
      case proto.MidiInputSourceType.MidiInputSourceType_USB:
        deviceKind = 'usbHost';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Bluetooth:
        deviceKind = 'bt';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Wii:
        deviceKind = 'wii';
        break;
      default: {
        const candidates = slots.filter(
          (slot) =>
            slot.slotId === deviceId && ['midi', 'usbHost', 'bt', 'wii'].includes(slot.deviceKind)
        );
        if (candidates.length === 1) {
          return candidates[0];
        }
      }
    }
  }

  if (!deviceKind) {
    return undefined;
  }
  return slots.find((slot) => slot.key === getProfileSlotKey(deviceKind, deviceId));
}

export function midiInputSourceType(deviceKind?: string) {
  switch (deviceKind) {
    case 'usbHost':
      return proto.MidiInputSourceType.MidiInputSourceType_USB;
    case 'bt':
      return proto.MidiInputSourceType.MidiInputSourceType_Bluetooth;
    case 'wii':
      return proto.MidiInputSourceType.MidiInputSourceType_Wii;
    case 'midi':
      return proto.MidiInputSourceType.MidiInputSourceType_MIDI;
    default:
      return proto.MidiInputSourceType.MidiInputSourceType_Auto;
  }
}

function midiSourceDeviceKind(sourceType?: proto.MidiInputSourceType | null): string | undefined {
  switch (sourceType) {
    case proto.MidiInputSourceType.MidiInputSourceType_USB:
      return 'usbHost';
    case proto.MidiInputSourceType.MidiInputSourceType_Bluetooth:
      return 'bt';
    case proto.MidiInputSourceType.MidiInputSourceType_Wii:
      return 'wii';
    case proto.MidiInputSourceType.MidiInputSourceType_MIDI:
      return 'midi';
    case proto.MidiInputSourceType.MidiInputSourceType_Auto:
      return undefined;
    default:
      return sourceType == null ? 'midi' : undefined;
  }
}

export function withSlotMidiChannel(
  input: proto.IInput,
  channels: Map<string, number>,
  slots: ProfileSlot[] = []
): proto.IInput {
  if (input.midi) {
    const midiDeviceId = input.midi.deviceid;
    let deviceKind = midiSourceDeviceKind(input.midi.sourceType);
    if (input.midi.sourceType == null) {
      const candidates = new Set(
        slots
          .filter(
            (slot) =>
              slot.slotId === midiDeviceId &&
              ['midi', 'usbHost', 'bt', 'wii'].includes(slot.deviceKind)
          )
          .map((slot) => slot.deviceKind)
      );
      if (candidates.size !== 1) {
        return input;
      }
      deviceKind = [...candidates][0];
    }
    if (!deviceKind) {
      return input;
    }
    const channel = channels.get(getProfileSlotKey(deviceKind, input.midi.deviceid ?? -1));
    if (channel == null) {
      return input;
    }
    const midi = input.midi;
    return {
      ...input,
      midi: {
        ...midi,
        midiNote: midi.midiNote ? { ...midi.midiNote, channel } : undefined,
        midiControlChange: midi.midiControlChange
          ? { ...midi.midiControlChange, channel }
          : undefined,
        midiPitchBend: midi.midiPitchBend ? { ...midi.midiPitchBend, channel } : undefined,
      },
    };
  }
  if (input.shortcut?.inputs) {
    return {
      ...input,
      shortcut: {
        ...input.shortcut,
        inputs: input.shortcut.inputs.map((x) => withSlotMidiChannel(x, channels, slots)),
      },
    };
  }
  if (input.held?.input) {
    return {
      ...input,
      held: { ...input.held, input: withSlotMidiChannel(input.held.input, channels, slots) },
    };
  }
  if (input.shifted) {
    return {
      ...input,
      shifted: {
        ...input.shifted,
        input: input.shifted.input
          ? withSlotMidiChannel(input.shifted.input, channels, slots)
          : undefined,
        shift: input.shifted.shift
          ? withSlotMidiChannel(input.shifted.shift, channels, slots)
          : undefined,
      },
    };
  }
  if (input.cycle) {
    return {
      ...input,
      cycle: {
        ...input.cycle,
        input: input.cycle.input
          ? withSlotMidiChannel(input.cycle.input, channels, slots)
          : undefined,
        inputReverse: input.cycle.inputReverse
          ? withSlotMidiChannel(input.cycle.inputReverse, channels, slots)
          : undefined,
      },
    };
  }
  if (input.toggle?.input) {
    return {
      ...input,
      toggle: {
        ...input.toggle,
        input: withSlotMidiChannel(input.toggle.input, channels, slots),
      },
    };
  }
  return input;
}

export function getSelectedInput(input?: proto.IInput | null): SelectedInput | undefined {
  if (!input) {
    return undefined;
  }

  for (const [kind, value] of Object.entries(input)) {
    if (value != null) {
      return { kind: kind as InputKind, value } as SelectedInput;
    }
  }

  return undefined;
}

export function getInputDeviceId(input: proto.IInput): number | undefined {
  const selected = getSelectedInput(input);
  if (!selected || typeof selected.value !== 'object' || !('deviceid' in selected.value)) {
    return undefined;
  }

  return selected.value.deviceid ?? undefined;
}

export function isAnalogInput(input: proto.IInput) {
  const kind = getSelectedInput(input)?.kind;
  return kind ? (inputRegistry[kind]?.isAnalog?.(input) ?? false) : false;
}

export function isDrumInput(input: proto.IInput): boolean {
  if (input.crkdDrum) {
    return true;
  }
  const midi = input.midi;
  return [midi?.midiNote, midi?.midiControlChange, midi?.midiPitchBend].some(
    (message) => message?.channel === MIDI_PERCUSSION_CHANNEL
  );
}

export function inputUsesDevice(input: proto.IInput, deviceid: number): boolean {
  const kind = getSelectedInput(input)?.kind;
  return kind ? (inputRegistry[kind]?.usesDevice?.(input, deviceid) ?? false) : false;
}
