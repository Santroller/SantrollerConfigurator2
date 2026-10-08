import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { LegacyImportContext } from '../context';
import { importLegacyConfig } from '../importLegacyConfig';
import { legacy } from '../legacy';
import {
  convertInstrumentPeripheralSettings,
  convertTapBarBinding,
  legacyDrumMidiSlots,
  legacyDrumNotes,
} from './instrumentPeripherals';

const DT = legacy.DeviceControllerType;
const GH5 = legacy.Gh5NeckInputType;
const LIB = legacy.InstrumentButtonType;

function encode(config: legacy.ISerializedConfiguration) {
  return legacy.SerializedConfiguration.encode(
    legacy.SerializedConfiguration.create(config)
  ).finish();
}

function load(config: legacy.ISerializedConfiguration) {
  return importLegacyConfig(encode(config));
}

// For things the core doesn't call yet
function context(config: legacy.ISerializedConfiguration, subType: proto.SubType) {
  return new LegacyImportContext(legacy.SerializedConfiguration.decode(encode(config)), subType);
}

const guitarButton = (
  type: legacy.InstrumentButtonType,
  input: legacy.ISerializedInput,
  extra = {}
) => ({
  serializedGuitarButton: { type, input, ...extra },
});

const sliderAxis = (input: legacy.ISerializedInput) => ({
  serializedGuitarAxis: { type: legacy.GuitarAxisType.GuitarAxisType_Slider, input },
});

const outputs = (mappings: proto.IMapping[]) => mappings.map((m) => m.mapping);

describe('GH5 neck', () => {
  it('converts a combined output with frets, tap frets and the tap bar', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_GuitarHeroGuitar,
      bindings: [
        {
          serializedGh5CombinedOutput: {
            sda: 4,
            scl: 5,
            outputs: [
              guitarButton(LIB.InstrumentButtonType_Green, {
                serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_Green },
              }),
              guitarButton(LIB.InstrumentButtonType_Orange, {
                serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapOrange },
              }),
              sliderAxis({ serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapBar } }),
              // disabled by default in the old configurator
              guitarButton(
                LIB.InstrumentButtonType_Slider,
                { serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapAll } },
                { enabled: false }
              ),
            ],
          },
        },
      ],
    });
    expect(warnings).toEqual([]);
    expect(config.devices).toHaveLength(1);
    const device = config.devices[0];
    expect(device.gh5Neck?.i2c).toMatchObject({ sda: 4, scl: 5, clock: 150000 });
    const mappings = config.profiles[0].mappings;
    expect(mappings[0].input?.gh5Neck).toEqual({
      deviceid: device.deviceid,
      button: proto.Gh5NeckButtonType.Gh5Green,
    });
    expect(mappings[0].mapping?.ghButton).toBe(
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green
    );
    expect(mappings[1].input?.gh5Neck?.button).toBe(proto.Gh5NeckButtonType.Gh5TapOrange);
    // the tap bar becomes the five tap frets
    const GB = proto.GuitarHeroGuitarButtonType;
    expect(mappings.slice(2).map((m) => [m.input?.gh5Neck?.button, m.mapping?.ghButton])).toEqual([
      [proto.Gh5NeckButtonType.Gh5TapGreen, GB.GuitarHeroGuitar_TapGreen],
      [proto.Gh5NeckButtonType.Gh5TapRed, GB.GuitarHeroGuitar_TapRed],
      [proto.Gh5NeckButtonType.Gh5TapYellow, GB.GuitarHeroGuitar_TapYellow],
      [proto.Gh5NeckButtonType.Gh5TapBlue, GB.GuitarHeroGuitar_TapBlue],
      [proto.Gh5NeckButtonType.Gh5TapOrange, GB.GuitarHeroGuitar_TapOrange],
    ]);
  });

  it('turns the tap bar into solo frets on Rock Band guitars, and frets when asked', () => {
    const { config } = load({
      deviceType: DT.DeviceControllerType_RockBandGuitar,
      bindings: [
        {
          serializedGh5CombinedOutput: {
            sda: 4,
            scl: 5,
            outputs: [
              sliderAxis({ serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapBar } }),
              guitarButton(LIB.InstrumentButtonType_Slider, {
                serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapAll },
              }),
            ],
          },
        },
      ],
    });
    const RB = proto.RockBandGuitarButtonType;
    expect(outputs(config.profiles[0].mappings).map((o) => o?.rbButton)).toEqual([
      RB.RockBandGuitar_SoloGreen,
      RB.RockBandGuitar_SoloRed,
      RB.RockBandGuitar_SoloYellow,
      RB.RockBandGuitar_SoloBlue,
      RB.RockBandGuitar_SoloOrange,
      RB.RockBandGuitar_Green,
      RB.RockBandGuitar_Red,
      RB.RockBandGuitar_Yellow,
      RB.RockBandGuitar_Blue,
      RB.RockBandGuitar_Orange,
    ]);
  });

  it('skips the tap bar on an axis, and shares the device with standalone inputs', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_Gamepad,
      bindings: [
        {
          serializedGh5CombinedOutput: {
            sda: 4,
            scl: 5,
            peripheral: true,
            outputs: [
              {
                serializedControllerAxis: {
                  type: legacy.StandardAxisType.StandardAxisType_LeftStickX,
                  input: { serializedGh5NeckInputCombined: { type: GH5.Gh5NeckInputType_TapBar } },
                },
              },
            ],
          },
        },
        {
          serializedControllerButton: {
            type: legacy.StandardButtonType.StandardButtonType_A,
            input: { serializedGh5NeckInput: { sda: 4, scl: 5, type: GH5.Gh5NeckInputType_Red } },
          },
        },
      ],
    });
    expect(config.devices).toHaveLength(1);
    expect(config.profiles[0].mappings).toHaveLength(1);
    expect(config.profiles[0].mappings[0].input?.gh5Neck?.button).toBe(
      proto.Gh5NeckButtonType.Gh5Red
    );
    expect(warnings.some((w) => w.includes('tap bar'))).toBe(true);
    expect(warnings.some((w) => w.includes('secondary Pico'))).toBe(true);
  });

  it('converts standalone slider bindings once the core hands them over', () => {
    const ctx = context({}, proto.SubType.GuitarHeroGuitar);
    const handled = convertTapBarBinding(
      ctx,
      sliderAxis({ serializedGh5NeckInput: { sda: 6, scl: 7, type: GH5.Gh5NeckInputType_TapBar } })
    );
    expect(handled).toBe(true);
    expect(ctx.devices).toHaveLength(1);
    expect(ctx.mappings.map((m) => m.input?.gh5Neck?.button)).toEqual([6, 7, 8, 9, 10]);
    expect(convertTapBarBinding(ctx, guitarButton(LIB.InstrumentButtonType_Green, {}))).toBe(false);
  });

  it('presses the tap frets for a digital input that set the slider', () => {
    const ctx = context({}, proto.SubType.GuitarHeroGuitar);
    convertTapBarBinding(
      ctx,
      sliderAxis({
        serializedDigitalToAnalog: {
          // green + orange
          on: 0xfb,
          child: {
            serializedDirectInput: { pin: 3, pinMode: legacy.DevicePinMode.DevicePinMode_PullUp },
          },
        },
      })
    );
    const GB = proto.GuitarHeroGuitarButtonType;
    expect(ctx.mappings.map((m) => [m.input?.gpio?.pin, m.mapping?.ghButton])).toEqual([
      [3, GB.GuitarHeroGuitar_TapGreen],
      [3, GB.GuitarHeroGuitar_TapOrange],
    ]);
  });

  it('turns an MPR121 slider into touch tap frets', () => {
    const ctx = context(
      { mpr121CapacitiveCount: 4, mpr121Sda: 8, mpr121Scl: 9 },
      proto.SubType.GuitarHeroGuitar
    );
    convertTapBarBinding(
      ctx,
      sliderAxis({
        serializedMpr121SliderInput: {
          inputGreen: 0,
          inputRed: 1,
          inputYellow: 2,
          inputBlue: 3,
          inputOrange: 5,
        },
      })
    );
    expect(ctx.devices[0].mpr121?.touchpadCount).toBe(4);
    expect(ctx.mappings.map((m) => [m.input?.mpr121?.pin, m.input?.mpr121?.mode])).toEqual([
      [0, proto.Mpr121PinMode.Touch],
      [1, proto.Mpr121PinMode.Touch],
      [2, proto.Mpr121PinMode.Touch],
      [3, proto.Mpr121PinMode.Touch],
      [5, proto.Mpr121PinMode.Digital],
    ]);
  });
});

describe('clone neck', () => {
  it('converts to the crazy guitar neck', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_RockBandGuitar,
      bindings: [
        {
          serializedCloneCombinedOutput: {
            sda: 10,
            scl: 11,
            outputs: [
              guitarButton(LIB.InstrumentButtonType_Blue, {
                serializedCloneNeckInputCombined: { type: GH5.Gh5NeckInputType_Blue },
              }),
              guitarButton(LIB.InstrumentButtonType_SoloRed, {
                serializedCloneNeckInputCombined: { type: GH5.Gh5NeckInputType_TapRed },
              }),
            ],
          },
        },
        guitarButton(LIB.InstrumentButtonType_Green, {
          serializedCloneNeckInput: { sda: 10, scl: 11, type: GH5.Gh5NeckInputType_Green },
        }),
      ],
    });
    expect(warnings).toEqual([]);
    expect(config.devices).toHaveLength(1);
    expect(config.devices[0].crazyGuitarNeck?.i2c).toMatchObject({
      sda: 10,
      scl: 11,
      clock: 100000,
    });
    const CG = proto.CrazyGuitarNeckButtonType;
    expect(config.profiles[0].mappings.map((m) => m.input?.crazyGuitarNeck?.button)).toEqual([
      CG.CrazyGuitarNeckBlue,
      CG.CrazyGuitarNeckSoloRed,
      CG.CrazyGuitarNeckGreen,
    ]);
  });
});

describe('CRKD neck', () => {
  it('converts the frets and d-pad', () => {
    const C = legacy.CrkdNeckInputType;
    const { config } = load({
      deviceType: DT.DeviceControllerType_RockBandGuitar,
      bindings: [
        {
          serializedCrkdCombinedOutput: {
            tx: 0,
            rx: 1,
            outputs: [
              guitarButton(LIB.InstrumentButtonType_Yellow, {
                serializedCrkdNeckInputCombined: { type: C.CrkdNeckInputType_Yellow },
              }),
              {
                serializedControllerButton: {
                  type: legacy.StandardButtonType.StandardButtonType_DpadLeft,
                  input: {
                    serializedCrkdNeckInputCombined: { type: C.CrkdNeckInputType_DpadLeft },
                  },
                },
              },
            ],
          },
        },
      ],
    });
    expect(config.devices[0].crkdNeck?.uart).toMatchObject({ tx: 0, rx: 1, baudrate: 460800 });
    expect(config.profiles[0].mappings.map((m) => m.input?.crkd?.button)).toEqual([
      proto.CrkdNeckButtonType.CrkdYellow,
      proto.CrkdNeckButtonType.CrkdDpadLeft,
    ]);
  });
});

describe('World Tour tap bar', () => {
  it('is skipped with a warning', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_GuitarHeroGuitar,
      bindings: [
        {
          serializedGhwtCombinedOutput: {
            pin: 26,
            outputs: [
              sliderAxis({
                serializedGhWtInputCombined: { type: legacy.GhWtInputType.GhWtInputType_TapBar },
              }),
            ],
          },
        },
        guitarButton(LIB.InstrumentButtonType_Green, {
          serializedGhWtInput: { pin: 26, type: legacy.GhWtInputType.GhWtInputType_TapGreen },
        }),
      ],
    });
    expect(config.profiles[0].mappings).toEqual([]);
    expect(warnings).toEqual([
      "The World Tour tap bar was skipped, the new firmware doesn't support it.",
    ]);
  });
});

describe('DJ Hero turntables', () => {
  it('adds a device per platter, with a signed velocity', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_Turntable,
      djPollRate: 8,
      djSmooth: true,
      bindings: [
        {
          serializedDjCombinedOutput: {
            sda: 18,
            scl: 19,
            outputs: [
              {
                serializedDjAxis: {
                  type: legacy.DjAxisType.DjAxisType_LeftTableVelocity,
                  input: {
                    serializedDjInputCombined: {
                      type: legacy.DjInputType.DjInputType_LeftTurntable,
                    },
                  },
                },
              },
              {
                serializedDjAxis: {
                  type: legacy.DjAxisType.DjAxisType_RightTableVelocity,
                  min: -16384,
                  max: 16384,
                  input: {
                    serializedDjInputCombined: {
                      type: legacy.DjInputType.DjInputType_RightTurntable,
                    },
                  },
                },
              },
              {
                serializedDjButton: {
                  type: legacy.DjInputType.DjInputType_LeftRed,
                  input: {
                    serializedDjInputCombined: { type: legacy.DjInputType.DjInputType_LeftRed },
                  },
                },
              },
            ],
          },
        },
      ],
    });
    expect(warnings).toEqual([
      "Turntable smoothing was skipped, the new firmware doesn't smooth the platters.",
    ]);
    const [left, right] = config.devices;
    expect(left.djhTurntable).toMatchObject({
      left: true,
      pollIntervalMs: 8,
      i2c: { sda: 18, scl: 19 },
    });
    expect(right.djhTurntable).toMatchObject({
      left: false,
      pollIntervalMs: 8,
      i2c: { sda: 18, scl: 19 },
    });
    const [leftVelocity, rightVelocity, red] = config.profiles[0].mappings;
    expect(leftVelocity.input?.djhPlatter).toEqual({
      deviceid: left.deviceid,
      type: proto.DJHeroPlatterInputType.DJHeroPlatterVelocity,
    });
    // the old velocity was twice as large, so its default range saturated at half the new one
    expect(leftVelocity).toMatchObject({ min: 16385, max: 49152, center: 32768 });
    expect(rightVelocity.input?.djhPlatter?.deviceid).toBe(right.deviceid);
    expect(rightVelocity).toMatchObject({ min: 24576, max: 40960, center: 32768 });
    expect(red.input?.djhPlatter).toEqual({
      deviceid: left.deviceid,
      type: proto.DJHeroPlatterInputType.DJHeroPlatterRed,
    });
    expect(red.mapping?.djhButton).toBe(proto.DJHTurntableButtonType.DJHTurntable_LeftRed);
  });

  it('converts standalone platter inputs', () => {
    const { config } = load({
      deviceType: DT.DeviceControllerType_Turntable,
      bindings: [
        {
          serializedDjButton: {
            type: legacy.DjInputType.DjInputType_RightBlue,
            input: {
              serializedDjInput: { sda: 2, scl: 3, type: legacy.DjInputType.DjInputType_RightBlue },
            },
          },
        },
      ],
    });
    expect(config.devices[0].djhTurntable).toMatchObject({ left: false, pollIntervalMs: 5 });
    expect(config.profiles[0].mappings[0].input?.djhPlatter?.type).toBe(
      proto.DJHeroPlatterInputType.DJHeroPlatterBlue
    );
  });
});

describe('config level peripherals', () => {
  it('adds the Mustang neck with its default bindings on pro guitars', () => {
    const ctx = context(
      {
        hasMustangNeckInput: true,
        mustangNeckMosi: 19,
        mustangNeckMiso: 16,
        mustangNeckSck: 18,
        mustangNeckCs: 17,
      },
      proto.SubType.ProGuitarMustang
    );
    convertInstrumentPeripheralSettings(ctx);
    expect(ctx.devices[0].protarNeck).toMatchObject({
      attPin: 17,
      spi: { mosi: 19, miso: 16, sck: 18 },
    });
    expect(
      ctx.mappings.some((m) => m.mapping?.proAxis === proto.ProGuitarAxisType.ProGuitar_LowEFret)
    ).toBe(true);
    expect(
      ctx.mappings.every(
        (m) => (m.input?.protarNeckAxis ?? m.input?.protarNeckButton)?.deviceid === 1
      )
    ).toBe(true);
  });

  it('adds the drums as MIDI slots', () => {
    const ctx = context(
      {
        hasBhDrumInput: true,
        bhDrumSda: 4,
        bhDrumScl: 5,
        hasWtDrumInput: true,
        wtDrumMosi: 3,
        wtDrumMiso: 0,
        wtDrumSck: 2,
        wtDrumCs: 1,
      },
      proto.SubType.GuitarHeroDrums
    );
    convertInstrumentPeripheralSettings(ctx);
    expect(ctx.devices.map((d) => [d.bhDrum?.i2c?.sda, d.worldTourDrum?.csPin])).toEqual([
      [4, undefined],
      [undefined, 1],
    ]);
    expect(ctx.assignments).toEqual([{ midiChannel: 10 }, { midiChannel: 10 }]);
    // calling it again returns the same slots
    expect(legacyDrumMidiSlots(ctx)).toEqual([1, 2]);
    expect(ctx.devices).toHaveLength(2);
  });

  it('works out which drum notes an old MIDI note came from', () => {
    expect(legacyDrumNotes(proto.SubType.RockBandDrums, 41).sort()).toEqual([41, 45, 49]);
    expect(legacyDrumNotes(proto.SubType.RockBandDrums, 45)).toEqual([48]);
    expect(legacyDrumNotes(proto.SubType.RockBandDrums, 46)).toEqual([]);
    expect(legacyDrumNotes(proto.SubType.RockBandDrums, 36)).toEqual([36]);
    expect(legacyDrumNotes(proto.SubType.GuitarHeroDrums, 22)).toEqual([22, 46]);
    expect(legacyDrumNotes(proto.SubType.GuitarHeroDrums, 51)).toEqual([51, 49]);
  });
});
