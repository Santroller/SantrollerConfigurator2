import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { LegacyImportContext } from '../context';
import { registerInputConverters } from '../inputs';
import { legacy } from '../legacy';
import { convertCombinedChildren, convertOutput, registerOutputConverters } from '../outputs';
import { convertLedsModesSettings } from './ledsModes';

// A stand in combined output, so the LEDs of combined children can be tested on their own
registerOutputConverters({
  serializedPs2CombinedOutput: (ctx, { serializedPs2CombinedOutput: o }) => {
    const deviceid = ctx.addDevice('psx', `${o!.att}`);
    convertCombinedChildren(ctx, { kind: 'psx', deviceid }, o!.outputs);
  },
});
registerInputConverters({
  serializedPs2InputCombined: (ctx) => ({
    input: {
      ps2Button: { deviceid: ctx.combined!.deviceid, button: proto.PS2ButtonType.PS2ButtonNegConA },
    },
    analog: false,
    isUint: true,
  }),
});

const ON = 0xff102030;
const OFF = 0xff040506;

const gpio = (
  pin: number,
  extra: Partial<legacy.ISerializedDirectInput> = {}
): legacy.ISerializedInput => ({
  serializedDirectInput: { pin, pinMode: legacy.DevicePinMode.DevicePinMode_PullUp, ...extra },
});
const analogPin = (pin: number): legacy.ISerializedInput => ({
  serializedDirectInput: { pin, pinMode: legacy.DevicePinMode.DevicePinMode_Analog },
});
const button = (
  input: legacy.ISerializedInput,
  extra: Partial<legacy.ISerializedControllerButton> = {}
) => ({
  serializedControllerButton: {
    input,
    type: legacy.StandardButtonType.StandardButtonType_A,
    ...extra,
  },
});
const led = (extra: legacy.ISerializedLed): legacy.ISerializedOutput => ({ serializedLed: extra });
const bytes = (...values: number[]) => new Uint8Array(values);

function run(cfg: legacy.ISerializedConfiguration, subType: proto.SubType = proto.SubType.Gamepad) {
  const data = legacy.SerializedConfiguration.encode(
    legacy.SerializedConfiguration.create(cfg)
  ).finish();
  const old = legacy.SerializedConfiguration.decode(data);
  const ctx = new LegacyImportContext(old, subType);
  for (const binding of old.bindings) {
    convertOutput(ctx, binding);
  }
  const settings = convertLedsModesSettings(ctx);
  const config = proto.Config.fromObject({
    devices: ctx.devices,
    profiles: [
      {
        opts: {
          uid: 1,
          name: 'Test',
          deviceToEmulate: subType,
          faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
        },
        assignments: settings.assignments,
        mappings: ctx.mappings,
        leds: ctx.leds,
      },
    ],
    guiConfig: [],
    ...(settings.inactivity ? { inactivity: settings.inactivity } : {}),
  });
  expect(proto.Config.verify(config)).toBeNull();
  return { ctx, settings, config, leds: ctx.leds };
}

const deviceOf = (ctx: LegacyImportContext, kind: keyof proto.IDevice) =>
  ctx.devices.find((d) => d[kind] != null);

describe('LED hardware', () => {
  it('imports an APA102 chain with its brightness', () => {
    const { ctx } = run({
      ledType: legacy.LedType.LedType_Apa102Grb,
      ledMosi: 3,
      ledSck: 2,
      ledCount: 7,
      ledBrightnessOn: 31,
      ledBrightnessOff: 4,
      bindings: [button(gpio(5), { ledIndex: bytes(1), ledOn: ON, ledOff: OFF })],
    });
    const device = deviceOf(ctx, 'apa102')!;
    expect(device.apa102).toMatchObject({ type: proto.APA102Type.Apa102Grb, count: 7 });
    expect(device.apa102!.spi).toMatchObject({ mosi: 3, sck: 2, miso: -1 });
    const rgb = ctx.leds[0].device.rgb!;
    // the firmware sends the top 5 bits of the brightness
    expect(rgb.endW! >> 3).toBe(31);
    expect(rgb.startW! >> 3).toBe(4);
  });

  it('imports a WS2812 chain at full brightness', () => {
    const { ctx } = run({
      ledType: legacy.LedType.LedType_Ws2812Grbw,
      ledMosi: 9,
      ledCount: 0,
      bindings: [button(gpio(5), { ledIndex: bytes(1), ledOn: ON })],
    });
    expect(deviceOf(ctx, 'ws2812')!.ws2812).toMatchObject({
      pin: 9,
      type: proto.WS2812Type.Ws2812Grbw,
      count: 1,
    });
    expect(ctx.leds[0].device.rgb).toMatchObject({ startW: 255, endW: 255 });
  });

  it('imports an STP16CPC26 with its latch and output enable pins', () => {
    const { ctx, leds } = run({
      ledType: legacy.LedType.LedType_Stp16Cpc26,
      ledMosi: 3,
      ledSck: 2,
      stp16Oe: 6,
      stp16Le: 7,
      ledCount: 16,
      bindings: [button(gpio(5), { ledIndex: bytes(2, 16, 17) })],
    });
    expect(deviceOf(ctx, 'stp16cpc')!.stp16cpc).toMatchObject({ oe: 6, le: 7, count: 16 });
    expect(leds[0].device.stp16).toMatchObject({ activeLed: [1, 15] });
  });

  it('warns about LEDs on the secondary Pico', () => {
    const { ctx, leds } = run({
      ledTypePeripheral: legacy.LedType.LedType_Ws2812Rgb,
      bindings: [button(gpio(5), { ledIndexPeripheral: bytes(1) })],
    });
    expect(leds).toHaveLength(0);
    expect(ctx.warnings.some((w) => w.includes('secondary Pico'))).toBe(true);
  });
});

describe('binding LEDs', () => {
  const rgbConfig = { ledType: legacy.LedType.LedType_Ws2812Rgb, ledMosi: 9, ledCount: 10 };

  it('lights LEDs from a button input with its on and off colours', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [button(gpio(5), { ledIndex: bytes(1, 3), ledOn: ON, ledOff: OFF })],
    });
    expect(leds).toHaveLength(1);
    expect(leds[0].device.rgb).toMatchObject({
      activeLed: [0, 2],
      startR: 4,
      startG: 5,
      startB: 6,
      endR: 0x10,
      endG: 0x20,
      endB: 0x30,
      hasStart: true,
    });
    expect(leds[0].mapping.inputMapping).toMatchObject({
      input: { gpio: { pin: 5, analog: false, pinMode: proto.PinMode.PullUp } },
      min: 0,
      max: 65535,
    });
  });

  it('flips the range for inverted inputs', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [button(gpio(5, { inverted: true }), { ledIndex: bytes(1) })],
    });
    expect(leds[0].mapping.inputMapping).toMatchObject({ min: 65535, max: 0 });
  });

  it('uses the axis calibration for signed and unsigned inputs', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [
        {
          serializedControllerAxis: {
            input: analogPin(26),
            type: legacy.StandardAxisType.StandardAxisType_LeftTrigger,
            min: 1000,
            max: 60000,
            ledIndex: bytes(1),
          },
        },
        {
          serializedControllerAxis: {
            input: { serializedAccelInput: { type: legacy.AccelInputType.AccelInputType_AccelX } },
            type: legacy.StandardAxisType.StandardAxisType_LeftStickX,
            min: -20000,
            max: 20000,
            ledIndex: bytes(2),
          },
        },
      ],
    });
    expect(leds[0].mapping.inputMapping).toMatchObject({ min: 1000, max: 60000 });
    expect(leds[1].mapping.inputMapping).toMatchObject({ min: 12768, max: 52768 });
  });

  it('skips LEDs on analog inputs used as buttons', () => {
    const { ctx, leds } = run({
      ...rgbConfig,
      bindings: [
        button(
          {
            serializedAnalogToDigital: {
              child: analogPin(26),
              type: legacy.AnalogToDigitalType.AnalogToDigitalType_JoyHigh,
              threshold: 1000,
            },
          },
          { ledIndex: bytes(1) }
        ),
      ],
    });
    expect(leds).toHaveLength(0);
    expect(ctx.warnings.some((w) => w.includes('analog inputs used as buttons'))).toBe(true);
  });

  it('lets later bindings light a shared LED over the first one', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [
        button(gpio(5), { ledIndex: bytes(1, 2), ledOn: ON }),
        button(gpio(6), { ledIndex: bytes(2, 3), ledOn: ON }),
      ],
    });
    expect(leds.map((l) => [l.device.rgb!.activeLed, l.device.rgb!.hasStart])).toEqual([
      [[0, 1], true],
      [[2], true],
      [[1], false],
    ]);
  });

  it('skips disabled bindings', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [button(gpio(5), { ledIndex: bytes(1), enabled: false })],
    });
    expect(leds).toHaveLength(0);
  });

  it('drives MPR121 electrodes', () => {
    const { ctx, leds } = run({
      hasMpr121: true,
      mpr121Sda: 4,
      mpr121Scl: 5,
      bindings: [button(gpio(5), { ledIndexMpr121: bytes(6, 2) })],
    });
    expect(leds).toHaveLength(1);
    expect(leds[0].device.mpr121).toEqual({ deviceId: deviceOf(ctx, 'mpr121')!.deviceid, pin: 6 });
  });

  it('turns binding outputs into GPIO LEDs', () => {
    const { ctx, leds } = run({
      bindings: [
        button(gpio(5), { outputEnabled: true, outputPin: 12, outputInverted: true }),
        {
          serializedControllerAxis: {
            input: analogPin(26),
            type: legacy.StandardAxisType.StandardAxisType_RightTrigger,
            outputEnabled: true,
            outputPin: 13,
          },
        },
        button(gpio(7), { outputEnabled: true, outputPin: 14, outputPeripheral: true }),
      ],
    });
    expect(leds).toHaveLength(2);
    expect(leds[0].device.gpio).toEqual({ pin: 12, analog: false });
    expect(leds[0].mapping.inputMapping).toMatchObject({ min: 65535, max: 0 });
    expect(leds[1].device.gpio).toEqual({ pin: 13, analog: true });
    expect(leds[1].mapping.inputMapping).toMatchObject({ min: 0, max: 65535 });
    expect(ctx.warnings.some((w) => w.includes('Outputs on the secondary Pico'))).toBe(true);
  });

  it('lights LEDs from combined outputs without duplicating their mappings', () => {
    const { ctx, leds } = run({
      ...rgbConfig,
      bindings: [
        {
          serializedPs2CombinedOutput: {
            att: 10,
            outputs: [
              button(
                { serializedPs2InputCombined: { type: 0 } },
                { ledIndex: bytes(4), ledOn: ON }
              ),
            ],
          },
        },
      ],
    });
    const psx = deviceOf(ctx, 'psx')!;
    expect(ctx.mappings).toHaveLength(1);
    expect(ctx.devices.filter((d) => d.psx)).toHaveLength(1);
    expect(leds).toHaveLength(1);
    expect(leds[0].device.rgb!.activeLed).toEqual([3]);
    expect(leds[0].mapping.inputMapping!.input).toEqual({
      ps2Button: { deviceid: psx.deviceid, button: proto.PS2ButtonType.PS2ButtonNegConA },
    });
    expect(ctx.combined).toBeUndefined();
  });
});

describe('LED bindings', () => {
  const rgbConfig = { ledType: legacy.LedType.LedType_Ws2812Rgb, ledMosi: 9, ledCount: 10 };
  const C = legacy.LedCommandType;

  it('converts each LED command', () => {
    const { leds } = run(
      {
        ...rgbConfig,
        bindings: [
          led({ type: C.LedCommandType_Player, param1: 2, ledIndex: bytes(1), ledOn: ON }),
          led({ type: C.LedCommandType_Combo, param1: 1, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_NoteHit, param1: 3, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_NoteMiss, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_StarPowerInactive, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_StarPowerActive, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_DjEuphoria, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_StageKitLed, param1: 5, param2: 2, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_StageKitLed, param1: 0, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_Ps4LightBar, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_BluetoothConnected, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_Auth, ledIndex: bytes(1), ledOff: OFF }),
          led({
            type: C.LedCommandType_Mode,
            param1: legacy.EmulationModeType.EmulationModeType_Wii,
            ledIndex: bytes(1),
          }),
          led({ type: C.LedCommandType_AlwaysOn, ledIndex: bytes(1) }),
          led({ type: C.LedCommandType_KeyboardScrollLock, ledIndex: bytes(1) }),
        ],
      },
      proto.SubType.RockBandGuitar
    );
    const F = proto.GameFeedbackLedType;
    expect(leds.map((l) => l.mapping)).toEqual([
      { playerMapping: { playerId: 3 } },
      { gameFeedbackMapping: { type: F.FeedbackMultiplier, value: 2 } },
      { gameFeedbackMapping: { type: F.FeedbackNoteHit, value: 3 } },
      { gameFeedbackMapping: { type: F.FeedbackNoteMiss } },
      { gameFeedbackMapping: { type: F.FeedbackStarPowerGauge } },
      { gameFeedbackMapping: { type: F.FeedbackStarPowerActive } },
      { euphoriaMapping: {} },
      {
        stageKitMapping: {
          type: proto.StageKitLedType.StageKitBlue,
          index: 4,
          indexMappingMode: proto.StageKitIndexMappingMode.StageKitIndexSequential,
        },
      },
      {
        stageKitMapping: {
          type: proto.StageKitLedType.StageKitFog,
          index: 0,
          indexMappingMode: proto.StageKitIndexMappingMode.StageKitIndexSequential,
        },
      },
      { playstationMapping: {} },
      { statusMapping: { type: proto.StatusLedType.StatusBluetoothConnected } },
      { statusMapping: { type: proto.StatusLedType.StatusAuthenticated } },
      {
        statusMapping: {
          type: proto.StatusLedType.StatusConsoleMode,
          mode: proto.ConsoleMode.ModeWiiRb,
        },
      },
      { staticMapping: {} },
      { keyboardMapping: { type: proto.KeyboardLedType.KeyboardLedScrollLock } },
    ]);
    expect(leds[0].device.rgb).toMatchObject({ activeLed: [0], endR: 0x10, hasStart: true });
    // auth LEDs never switched back to their off colour
    expect(leds[11].device.rgb).toMatchObject({ startR: 0, startG: 0, startB: 0 });
  });

  it('puts LED bindings after the input LEDs', () => {
    const { leds } = run({
      ...rgbConfig,
      bindings: [
        led({ type: C.LedCommandType_Player, ledIndex: bytes(1) }),
        button(gpio(5), { ledIndex: bytes(1) }),
      ],
    });
    expect(leds[0].mapping.inputMapping).toBeDefined();
    expect(leds[1].mapping.playerMapping).toBeDefined();
  });

  it('drives GPIO outputs, with PWM for star power', () => {
    const { ctx, leds } = run({
      bindings: [
        led({ type: C.LedCommandType_StarPowerActive, outputEnabled: true, pin: 4 }),
        led({ type: C.LedCommandType_Player, outputEnabled: true, pin: 5 }),
        led({ type: C.LedCommandType_Player, outputEnabled: true, pin: 6, inverted: true }),
      ],
    });
    expect(leds.map((l) => l.device.gpio)).toEqual([
      { pin: 4, analog: true },
      { pin: 5, analog: false },
    ]);
    expect(ctx.warnings.some((w) => w.includes('Inverted outputs'))).toBe(true);
  });

  it('skips Fortnite Festival mode LEDs', () => {
    const { ctx, leds } = run({
      ...rgbConfig,
      bindings: [
        led({
          type: C.LedCommandType_Mode,
          param1: legacy.EmulationModeType.EmulationModeType_FnfLayer,
          ledIndex: bytes(1),
        }),
      ],
    });
    expect(leds).toHaveLength(0);
    expect(ctx.warnings.some((w) => w.includes('Fortnite Festival'))).toBe(true);
  });
});

describe('console mode bindings', () => {
  const M = legacy.EmulationModeType;

  it('adds a list per mode before the default one', () => {
    const { settings, ctx } = run({
      xInputOnWindows: true,
      bindings: [
        { serializedEmulationMode: { type: M.EmulationModeType_Ps3, input: gpio(5) } },
        {
          serializedEmulationMode: {
            type: M.EmulationModeType_Switch,
            input: gpio(6, { inverted: true }),
          },
        },
        { serializedEmulationMode: { type: M.EmulationModeType_FnfHid, input: analogPin(26) } },
        {
          serializedEmulationMode: {
            type: M.EmulationModeType_Arcade,
            input: gpio(7),
            enabled: false,
          },
        },
        { serializedEmulationMode: { type: M.EmulationModeType_FnfIos, input: gpio(8) } },
      ],
    });
    expect(settings.assignments).toEqual([
      {
        assignments: [
          {
            consoleType: {
              forcedType: proto.ConsoleMode.ModePs3,
              xinputOnWindows: true,
              ps4OrPs5Mode: false,
            },
          },
          { input: { input: { gpio: { pin: 5, pinMode: proto.PinMode.PullUp, analog: false } } } },
        ],
      },
      {
        assignments: [
          {
            consoleType: {
              forcedType: proto.ConsoleMode.ModeSwitch,
              xinputOnWindows: true,
              ps4OrPs5Mode: false,
            },
          },
          {
            input: {
              input: { gpio: { pin: 6, pinMode: proto.PinMode.PullUp, analog: false } },
              inverted: true,
            },
          },
        ],
      },
      {
        assignments: [
          {
            consoleType: {
              forcedType: proto.ConsoleMode.ModeXboxOne,
              xinputOnWindows: true,
              ps4OrPs5Mode: false,
            },
          },
          {
            input: {
              input: { gpio: { pin: 26, pinMode: proto.PinMode.Floating, analog: true } },
              trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
              triggerValue: 32767,
            },
          },
        ],
      },
      { assignments: [{ consoleType: { xinputOnWindows: true, ps4OrPs5Mode: false } }] },
    ]);
    expect(ctx.warnings.some((w) => w.includes('Fortnite Festival'))).toBe(true);
    expect(ctx.warnings.some((w) => w.includes('EmulationMode'))).toBe(false);
  });

  it('copies the slot assignments into every list', () => {
    const data = legacy.SerializedConfiguration.encode(
      legacy.SerializedConfiguration.create({
        bindings: [{ serializedEmulationMode: { type: M.EmulationModeType_Ps3, input: gpio(5) } }],
      })
    ).finish();
    const ctx = new LegacyImportContext(
      legacy.SerializedConfiguration.decode(data),
      proto.SubType.Gamepad
    );
    ctx.addSlot('usbHost', 'main', { usbType: proto.SubType.Gamepad });
    for (const binding of ctx.old.bindings) {
      convertOutput(ctx, binding);
    }
    const { assignments } = convertLedsModesSettings(ctx);
    expect(assignments.map((a) => a.assignments!.map((i) => Object.keys(i)[0]))).toEqual([
      ['consoleType', 'usbType', 'input'],
      ['consoleType', 'usbType'],
    ]);
  });
});

describe('config settings', () => {
  it('adds bluetooth output, the battery gauge and sleep', () => {
    const { ctx, settings } = run({
      isBluetoothTx: true,
      hasMax1704X: true,
      max1704XSda: 18,
      max1704XScl: 19,
      sleepEnabled: true,
      sleepPin: 3,
      sleepTimer: 120,
      ledTimer: 30,
    });
    expect(deviceOf(ctx, 'bt')).toBeDefined();
    expect(deviceOf(ctx, 'max1704x')!.max1704x!.i2c).toMatchObject({ sda: 18, scl: 19, block: 1 });
    expect(settings.assignments[0].assignments).toContainEqual({
      bluetooth: proto.BluetoothMode.BTStandard,
    });
    expect(settings.inactivity).toEqual({
      sleepTimeoutSec: 120,
      wakePin: 3,
      wakeActiveHigh: false,
      ledTimeoutSec: 30,
    });
  });

  it('treats the bluetooth emulation types as bluetooth output', () => {
    const { settings } = run({
      emulationType: legacy.EmulationType.EmulationType_BluetoothKeyboardMouse,
    });
    expect(settings.assignments[0].assignments).toContainEqual({
      bluetooth: proto.BluetoothMode.BTStandard,
    });
  });

  it('skips sleep without a wake pin and leaves inactivity unset', () => {
    const { ctx, settings } = run({ sleepEnabled: true });
    expect(settings.inactivity).toBeUndefined();
    expect(ctx.warnings.some((w) => w.includes('wake up pin'))).toBe(true);
  });

  it('enables PS4 instruments only with a USB host controller', () => {
    const host = {
      serializedGuitarButton: {
        input: { serializedUsbHostInput: { type: 0 } },
        type: legacy.InstrumentButtonType.InstrumentButtonType_Green,
      },
    };
    const consoleType = (cfg: legacy.ISerializedConfiguration) => {
      const data = legacy.SerializedConfiguration.encode(
        legacy.SerializedConfiguration.create(cfg)
      ).finish();
      const ctx = new LegacyImportContext(
        legacy.SerializedConfiguration.decode(data),
        proto.SubType.GuitarHeroGuitar
      );
      return convertLedsModesSettings(ctx).assignments[0].assignments![0].consoleType!;
    };
    expect(consoleType({ ps4Instruments: true, bindings: [host] }).ps4OrPs5Mode).toBe(true);
    expect(consoleType({ ps4Instruments: true }).ps4OrPs5Mode).toBe(false);
  });

  it('warns that the poll rate limit is gone', () => {
    expect(run({ pollRate: 4 }).ctx.warnings.some((w) => w.includes('poll rate'))).toBe(true);
    expect(run({ pollRate: 4, queueBasedInputs: true }).ctx.warnings).toEqual([]);
  });
});
