import { proto } from '@/components/SettingsContext/config';

export type InputKind = keyof proto.IInput;

const inputKinds = [
  'gpio',
  'fixed',
  'mpr121',
  'midi',
  'mouseAxis',
  'mouseButton',
  'wiiAxis',
  'wiiButton',
  'key',
  'crkd',
  'shortcut',
  'ads1115',
  'accelerometer',
  'gh5Neck',
  'ps2Axis',
  'ps2Button',
  'usbButton',
  'usbAxis',
  'multiplexer',
  'protarNeckAxis',
  'protarNeckButton',
  'vtechExpander',
  'held',
  'matrix',
  'crkdDrum',
  'cycle',
  'toggle',
] as const satisfies readonly InputKind[];

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

const inputRegistry: Partial<Record<InputKind, InputDefinition>> = {
  gpio: { isAnalog: (input) => !!input.gpio?.analog },
  mpr121: { usesDevice: hasDevice((input) => input.mpr121) },
  ads1115: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ads1115) },
  wiiAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.wiiAxis) },
  wiiButton: { usesDevice: hasDevice((input) => input.wiiButton) },
  crkd: { usesDevice: hasDevice((input) => input.crkd) },
  crkdDrum: { isAnalog: () => true, usesDevice: hasDevice((input) => input.crkdDrum) },
  gh5Neck: { usesDevice: hasDevice((input) => input.gh5Neck) },
  accelerometer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.accelerometer),
  },
  multiplexer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.multiplexer),
  },
  usbAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.usbAxis) },
  usbButton: { usesDevice: hasDevice((input) => input.usbButton) },
  ps2Axis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ps2Axis) },
  ps2Button: { usesDevice: hasDevice((input) => input.ps2Button) },
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
  matrix: { usesDevice: hasDevice((input) => input.matrix) },
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
};

const deviceInputRegistry: Record<string, DeviceInputDefinition> = {
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
  crkdNeck: {
    create: (deviceid) => ({
      crkd: { button: proto.CrkdNeckButtonType.CrkdGreen, deviceid },
    }),
  },
  bhDrum: {
    create: (deviceid) => ({ midi: { midiNote: { note: 1, channel: 10 }, deviceid } }),
  },
  worldTourDrum: {
    create: (deviceid) => ({ midi: { midiNote: { note: 1, channel: 10 }, deviceid } }),
  },
  midiSerial: {
    create: (deviceid) => ({ midi: { midiNote: { note: 1, channel: 10 }, deviceid } }),
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
  usbHost: {
    create: (deviceid) => ({
      usbButton: { button: { gamepadButton: proto.GamepadButtonType.Gamepad_A }, deviceid },
    }),
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

export function getSelectedInput(input: proto.IInput): SelectedInput | undefined {
  for (const kind of inputKinds) {
    const value = input[kind];
    if (value != null) {
      return { kind, value } as SelectedInput;
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

export function inputUsesDevice(input: proto.IInput, deviceid: number): boolean {
  const kind = getSelectedInput(input)?.kind;
  return kind ? (inputRegistry[kind]?.usesDevice?.(input, deviceid) ?? false) : false;
}
