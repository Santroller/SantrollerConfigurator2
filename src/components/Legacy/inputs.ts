import { proto } from '@/components/SettingsContext/config';
import { ConvertedInput, INT16_OFFSET, LegacyImportContext, setI2c } from './context';
import { legacy } from './legacy';

export type LegacyInputKind = NonNullable<legacy.SerializedInput['subtype']>;
export type InputConverter = (
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput
) => ConvertedInput | undefined;

const PIN_MODES: Partial<Record<legacy.DevicePinMode, proto.PinMode>> = {
  [legacy.DevicePinMode.DevicePinMode_PullUp]: proto.PinMode.PullUp,
  [legacy.DevicePinMode.DevicePinMode_PullDown]: proto.PinMode.PullDown,
  [legacy.DevicePinMode.DevicePinMode_Floating]: proto.PinMode.Floating,
  [legacy.DevicePinMode.DevicePinMode_BusKeep]: proto.PinMode.BusKeep,
  [legacy.DevicePinMode.DevicePinMode_Analog]: proto.PinMode.Floating,
};

// The secondary Pico ("peripheral") that inputs marked as peripheral are read from
export function peripheralDevice(ctx: LegacyImportContext) {
  ctx.warn(
    'Inputs on the secondary Pico were imported, but it needs to be flashed with the new peripheral firmware.'
  );
  return ctx.addDevice('peripheral', 'main', (device) =>
    setI2c(device.i2c, ctx.old.peripheralSda, ctx.old.peripheralScl)
  );
}

function direct(ctx: LegacyImportContext, { serializedDirectInput: d }: legacy.ISerializedInput) {
  const analog = d!.pinMode === legacy.DevicePinMode.DevicePinMode_Analog;
  const pinMode = analog
    ? proto.PinMode.Floating
    : (PIN_MODES[d!.pinMode!] ?? proto.PinMode.PullUp);
  const pin = d!.pin ?? -1;
  const input: proto.IInput = d!.peripheral
    ? { peripheral: { deviceid: peripheralDevice(ctx), pin, pinMode, analog } }
    : { gpio: { pin, pinMode, analog } };
  return {
    input,
    analog,
    isUint: true,
    mapping: !analog && d!.inverted ? { inverted: true } : undefined,
  };
}

function constant(
  _ctx: LegacyImportContext,
  { serializedConstantInput: c }: legacy.ISerializedInput
) {
  return { input: { fixed: { value: c!.value ?? 0 } }, analog: !!c!.analog, isUint: true };
}

function analogToDigital(
  ctx: LegacyImportContext,
  { serializedAnalogToDigital: a }: legacy.ISerializedInput
) {
  const child = convertInput(ctx, a!.child);
  if (!child) {
    return undefined;
  }
  let threshold = a!.threshold ?? 0;
  const T = legacy.AnalogToDigitalType;
  let trigger: proto.AnalogToDigitalTriggerType;
  let triggerValue: number;
  // The new firmware compares the raw unsigned value, so signed inputs are moved up by 32768
  if (child.isUint) {
    switch (a!.type ?? T.AnalogToDigitalType_JoyLow) {
      case T.AnalogToDigitalType_TriggerInverted:
        [trigger, triggerValue] = [proto.AnalogToDigitalTriggerType.JoyLow, threshold];
        break;
      case T.AnalogToDigitalType_JoyHigh:
        [trigger, triggerValue] = [proto.AnalogToDigitalTriggerType.JoyHigh, 32767 + threshold];
        break;
      case T.AnalogToDigitalType_JoyLow:
        [trigger, triggerValue] = [proto.AnalogToDigitalTriggerType.JoyLow, 32767 - threshold];
        break;
      default:
        [trigger, triggerValue] = [proto.AnalogToDigitalTriggerType.JoyHigh, threshold];
        break;
    }
  } else {
    const scale = child.scale ?? 1;
    threshold = Math.round(threshold * scale);
    switch (a!.type ?? T.AnalogToDigitalType_JoyLow) {
      case T.AnalogToDigitalType_TriggerInverted:
        [trigger, triggerValue] = [
          proto.AnalogToDigitalTriggerType.JoyLow,
          threshold + INT16_OFFSET,
        ];
        break;
      case T.AnalogToDigitalType_JoyHigh:
        [trigger, triggerValue] = [
          proto.AnalogToDigitalTriggerType.JoyHigh,
          Math.abs(threshold) + INT16_OFFSET,
        ];
        break;
      case T.AnalogToDigitalType_JoyLow:
        [trigger, triggerValue] = [
          proto.AnalogToDigitalTriggerType.JoyLow,
          INT16_OFFSET - Math.abs(threshold),
        ];
        break;
      default:
        [trigger, triggerValue] = [
          proto.AnalogToDigitalTriggerType.JoyHigh,
          threshold + INT16_OFFSET,
        ];
        break;
    }
  }
  return {
    ...child,
    analog: false,
    mapping: {
      ...child.mapping,
      trigger,
      triggerValue: Math.max(0, Math.min(65535, triggerValue)),
    },
  };
}

function digitalToAnalog(
  ctx: LegacyImportContext,
  { serializedDigitalToAnalog: d }: legacy.ISerializedInput
) {
  const child = convertInput(ctx, d!.child);
  if (!child) {
    return undefined;
  }
  // The pressed value depends on the output's calibration, so the output fills it in
  return {
    ...child,
    analog: true,
    isUint: !!d!.trigger,
    digitalToAnalog: {
      on: d!.on ?? 0,
      type: d!.type ?? legacy.DigitalToAnalogType.DigitalToAnalogType_Normal,
    },
  };
}

function macro(ctx: LegacyImportContext, { serializedMacroInput: m }: legacy.ISerializedInput) {
  const children = [m!.child1, m!.child2].map((c) => convertInput(ctx, c));
  if (children.some((c) => !c)) {
    return undefined;
  }
  if (children.some((c) => c!.mapping?.trigger != null || c!.analog)) {
    ctx.warn(
      'A macro (two inputs at once) used an analog input, which the new shortcut input only reads digitally.'
    );
  }
  return {
    input: { shortcut: { inputs: children.map((c) => c!.input) } },
    analog: false,
    isUint: true,
  };
}

function multiplexer(
  ctx: LegacyImportContext,
  { serializedMultiplexerInput: m }: legacy.ISerializedInput
) {
  const T = legacy.MultiplexerType;
  const type = m!.type ?? T.MultiplexerType_EightChannel;
  const sixteen =
    type === T.MultiplexerType_SixteenChannel || type === T.MultiplexerType_SixteenChannelSlow;
  const slow =
    type === T.MultiplexerType_EightChannelSlow || type === T.MultiplexerType_SixteenChannelSlow;
  if (m!.peripheral) {
    ctx.warn(
      'A multiplexer on the secondary Pico was imported onto the main Pico, so check its pins.'
    );
  }
  const deviceid = ctx.addDevice(
    'multiplexer',
    [m!.pin, m!.pinS0, m!.pinS1, m!.pinS2, m!.pinS3].join(','),
    (dev) => {
      dev.inputPin = m!.pin ?? -1;
      dev.s0Pin = m!.pinS0 ?? -1;
      dev.s1Pin = m!.pinS1 ?? -1;
      dev.s2Pin = m!.pinS2 ?? -1;
      dev.s3Pin = sixteen ? (m!.pinS3 ?? -1) : -1;
      dev.sixteenChannel = sixteen;
      dev.slow = slow;
    }
  );
  // The old multiplexer was always read with the ADC
  return {
    input: { multiplexer: { deviceid, channel: m!.channel ?? 0 } },
    analog: true,
    isUint: true,
  };
}

function matrix(ctx: LegacyImportContext, { serializedMatrixInput: m }: legacy.ISerializedInput) {
  const pin = m!.pin ?? -1;
  const outPin = m!.outPin ?? -1;
  const deviceid = ctx.addDevice('matrix', 'main');
  const device = ctx.devices.find((d) => d.deviceid === deviceid)!.matrix!;
  if (pin >= 0) {
    device.inPins = (device.inPins ?? 0) | (1 << pin);
  }
  if (outPin >= 0) {
    device.outPins = (device.outPins ?? 0) | (1 << outPin);
  }
  return {
    input: { matrix: { deviceid, pin, outputPin: outPin } },
    analog: false,
    isUint: true,
    mapping: m!.inverted ? { inverted: true } : undefined,
  };
}

export function mpr121Device(ctx: LegacyImportContext) {
  return ctx.addDevice('mpr121', 'main', (dev) => {
    setI2c(dev.i2c, ctx.old.mpr121Sda, ctx.old.mpr121Scl);
    dev.touchpadCount = ctx.old.mpr121CapacitiveCount ?? 0;
  });
}

function mpr121(ctx: LegacyImportContext, { serializedMpr121Input: m }: legacy.ISerializedInput) {
  if (m!.peripheral) {
    ctx.warn('An MPR121 on the secondary Pico was imported onto the main Pico, so check its pins.');
  }
  const pin = m!.input ?? 0;
  // The old configurator used the first pins for touch and the rest as digital inputs
  const touch = pin < (ctx.old.mpr121CapacitiveCount ?? 0);
  return {
    input: {
      mpr121: {
        deviceid: mpr121Device(ctx),
        pin,
        mode: touch ? proto.Mpr121PinMode.Touch : proto.Mpr121PinMode.Digital,
        pinMode: proto.PinMode.PullUp,
      },
    },
    analog: false,
    isUint: true,
  };
}

function encoder(ctx: LegacyImportContext, { serializedEncoderInput: e }: legacy.ISerializedInput) {
  if (e!.peripheral) {
    ctx.warn(
      'An encoder on the secondary Pico was imported onto the main Pico, so check its pins.'
    );
  }
  const deviceid = ctx.addDevice('encoder', `${e!.pin}`, (dev) => {
    dev.dataPin = e!.pin ?? -1;
  });
  return {
    input: { encoder: { deviceid, type: proto.EncoderInputType.EncoderDelta } },
    analog: true,
    isUint: false,
  };
}

const ACCEL_TYPES: Record<legacy.AccelInputType, [proto.AccelerometerInputType, boolean]> = {
  [legacy.AccelInputType.AccelInputType_AccelX]: [
    proto.AccelerometerInputType.AccelerometerX,
    false,
  ],
  [legacy.AccelInputType.AccelInputType_AccelY]: [
    proto.AccelerometerInputType.AccelerometerY,
    false,
  ],
  [legacy.AccelInputType.AccelInputType_AccelZ]: [
    proto.AccelerometerInputType.AccelerometerZ,
    false,
  ],
  [legacy.AccelInputType.AccelInputType_Adc0]: [
    proto.AccelerometerInputType.AccelerometerAdc1,
    true,
  ],
  [legacy.AccelInputType.AccelInputType_Adc1]: [
    proto.AccelerometerInputType.AccelerometerAdc2,
    true,
  ],
  [legacy.AccelInputType.AccelInputType_Adc2]: [
    proto.AccelerometerInputType.AccelerometerAdc3,
    true,
  ],
};

function accel(ctx: LegacyImportContext, { serializedAccelInput: a }: legacy.ISerializedInput) {
  const deviceid = ctx.addDevice('accelerometer', 'main', (dev) =>
    setI2c(dev.i2c, ctx.old.accelSda, ctx.old.accelScl)
  );
  const [type, isUint] = ACCEL_TYPES[a!.type ?? legacy.AccelInputType.AccelInputType_AccelX];
  return { input: { accelerometer: { deviceid, type } }, analog: true, isUint };
}

const CORE_INPUTS: Partial<Record<LegacyInputKind, InputConverter>> = {
  serializedDirectInput: direct,
  serializedConstantInput: constant,
  serializedAnalogToDigital: analogToDigital,
  serializedDigitalToAnalog: digitalToAnalog,
  serializedMacroInput: macro,
  serializedMultiplexerInput: multiplexer,
  serializedMatrixInput: matrix,
  serializedMpr121Input: mpr121,
  serializedEncoderInput: encoder,
  serializedAccelInput: accel,
};

const familyInputs: Partial<Record<LegacyInputKind, InputConverter>> = {};

export function registerInputConverters(
  converters: Partial<Record<LegacyInputKind, InputConverter>>
) {
  Object.assign(familyInputs, converters);
}

export function convertInput(
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput | null | undefined
): ConvertedInput | undefined {
  const kind =
    input && (legacy.SerializedInput.fromObject(input).subtype as LegacyInputKind | undefined);
  if (!kind) {
    return undefined;
  }
  const converter = CORE_INPUTS[kind] ?? familyInputs[kind];
  if (!converter) {
    ctx.warn(
      `Inputs of type ${kind.replace(/^serialized/, '')} can't be imported yet, so they were skipped.`
    );
    return undefined;
  }
  return converter(ctx, input);
}
