import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
import { importLegacyConfig, importLegacyConfigs } from './importLegacyConfig';
import { legacy } from './legacy';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name));

describe('importLegacyConfig', () => {
  it('imports the OFMG matrix with legacy scan polarity and distinct fret pin pairs', () => {
    const { config } = importLegacyConfig(fixture('ofmg-rb-v3_1.pico2config'));
    const matrixDevices = config.devices.filter((device) => device.matrix);
    expect(matrixDevices).toHaveLength(1);
    const [device] = matrixDevices;
    expect(device.matrix).toMatchObject({
      activeLow: true,
      inPins: [11, 12, 13, 14, 15].reduce((mask, pin) => mask | (1 << pin), 0),
      outPins: [7, 8, 9, 10].reduce((mask, pin) => mask | (1 << pin), 0),
    });
    const profile = config.profiles.find(
      (p) => p.opts.deviceToEmulate === proto.SubType.RockBandGuitar
    )!;
    const RB = proto.RockBandGuitarButtonType;
    for (const [output, pin, outputPin] of [
      [RB.RockBandGuitar_Green, 15, 10],
      [RB.RockBandGuitar_Red, 14, 10],
      [RB.RockBandGuitar_SoloGreen, 15, 9],
      [RB.RockBandGuitar_SoloRed, 14, 9],
    ]) {
      const mappings = profile.mappings.filter(
        (m) => m.mapping?.rbButton === output && m.input?.matrix
      );
      expect(mappings).toHaveLength(1);
      expect(mappings[0].input?.matrix).toMatchObject({
        deviceid: device.deviceid,
        pin,
        outputPin,
      });
      expect(mappings[0].inverted).not.toBe(true);
    }
    const roundTrip = proto.Config.decode(proto.Config.encode(config).finish());
    expect(roundTrip.devices.find((d) => d.matrix)?.matrix?.activeLow).toBe(true);
  });

  it('preserves per-binding inversion for legacy matrix inputs', () => {
    const data = legacy.SerializedConfiguration.encode({
      bindings: [
        {
          serializedControllerButton: {
            type: legacy.StandardButtonType.StandardButtonType_A,
            input: { serializedMatrixInput: { pin: 0, outPin: 40, inverted: true } },
          },
        },
      ],
    }).finish();
    const { config } = importLegacyConfig(data);
    expect(config.devices.find((d) => d.matrix)?.matrix).toMatchObject({
      activeLow: true,
      inPins: 1,
      outPinsHigh: 1 << 8,
    });
    expect(config.profiles[0].mappings[0]).toMatchObject({
      inverted: true,
      input: { matrix: { pin: 0, outputPin: 40 } },
    });
  });

  it('imports a Rock Band guitar with shared solo fret pins', () => {
    const { config, warnings } = importLegacyConfig(fixture('reampedsunburst.picoconfig'));
    // the Fortnite Festival keyboard mode is its own profile, tried first
    const [festival, profile] = config.profiles;
    expect(profile.opts.deviceToEmulate).toBe(proto.SubType.RockBandGuitar);
    const byOutput = (output: proto.IOutput) =>
      profile.mappings.filter(
        (m) =>
          JSON.stringify(proto.Output.toObject(m.mapping as proto.Output)) ===
          JSON.stringify(output)
      );

    // the solo frets were bound to the same pins as the upper frets
    const RB = proto.RockBandGuitarButtonType;
    for (const [pin, fret, solo] of [
      [14, RB.RockBandGuitar_Green, RB.RockBandGuitar_SoloGreen],
      [11, RB.RockBandGuitar_Red, RB.RockBandGuitar_SoloRed],
      [10, RB.RockBandGuitar_Orange, RB.RockBandGuitar_SoloOrange],
    ]) {
      for (const output of [fret, solo]) {
        const [mapping] = byOutput({ rbButton: output });
        expect(mapping.input?.gpio).toMatchObject({
          pin,
          pinMode: proto.PinMode.PullUp,
          analog: false,
        });
        // the old global 1ms debounce
        expect(mapping.debounce100us).toBe(10);
      }
    }
    expect(
      byOutput({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp })[0].input?.gpio?.pin
    ).toBe(21);

    const [whammy] = byOutput({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy });
    expect(whammy).toMatchObject({ min: 65520, max: 18512, center: 0 });
    expect(whammy.input?.gpio).toMatchObject({ pin: 26, analog: true });

    const [pickup] = byOutput({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup });
    expect(pickup.pickupThresholds).toEqual([14659, 27076, 40701, 56567]);

    // holding GP7 at startup used to start the Fortnite Festival keyboard mode
    expect(festival.opts).toMatchObject({
      name: 'Imported (Festival)',
      deviceToEmulate: proto.SubType.KeyboardMouse,
    });
    expect(
      festival.assignments.map((list) => list.assignments.map((x) => x.input?.input?.gpio?.pin))
    ).toEqual([[undefined, 7]]);
    const keys = (pin: number) =>
      festival.mappings.filter((m) => m.input?.gpio?.pin === pin).map((m) => m.mapping?.keycode);
    // frets (with their solo frets sharing pins), strum, d-pad and start / select
    for (const [pin, key] of [
      [14, 'Digit1'],
      [11, 'Digit2'],
      [12, 'Digit3'],
      [13, 'Digit4'],
      [10, 'Digit5'],
      [21, 'ShiftRight'],
      [20, 'ControlRight'],
      [17, 'ArrowLeft'],
      [22, 'ArrowRight'],
      [16, 'Escape'],
      [15, 'PageDown'],
    ] as const) {
      expect(keys(pin)).toEqual([CODE_TO_HID[key]]);
    }
    // the whammy (calibrated backwards) is held from half way
    const [slash] = festival.mappings.filter((m) => m.input?.gpio?.pin === 26);
    expect(slash).toMatchObject({
      mapping: { keycode: CODE_TO_HID.Slash },
      trigger: proto.AnalogToDigitalTriggerType.JoyLow,
      triggerValue: Math.round((65520 + 18512) / 2),
    });
    expect(warnings.some((w) => w.key === 'legacyImport.fortniteModesUnsupported')).toBe(false);
  });

  it('imports a USB keyboard layout with a PS3 pressure binding', () => {
    const { config, warnings } = importLegacyConfig(fixture('iidxkeyboard.picoconfig'));
    const profile = config.profiles[0];
    expect(profile.opts.deviceToEmulate).toBe(proto.SubType.Gamepad);
    // keyboard keys are read like a controller's buttons, with the key as the button
    const keyMappings = profile.mappings.filter((m) => m.input?.usbButton?.button?.keycode != null);
    const padMappings = profile.mappings.filter(
      (m) => m.input?.usbButton && m.input.usbButton.button?.keycode == null
    );
    const keys = (button: proto.GamepadButtonType) =>
      keyMappings
        .filter((m) => m.mapping?.gamepadButton === button)
        .map((m) => m.input!.usbButton!.button!.keycode);

    // the pressure cross binding on End became a cross press
    const [cross] = keyMappings.filter(
      (m) => m.mapping?.gamepadButton === proto.GamepadButtonType.Gamepad_A
    );
    expect(cross).toMatchObject({
      input: { usbButton: { button: { keycode: 0x4d } } },
      debounce100us: 10,
    });
    expect(warnings).not.toContainEqual({ key: 'legacyImport.hostBindingSkipped' });

    // both key sets were kept: S and left arrow
    expect(keys(proto.GamepadButtonType.Gamepad_DpadLeft)).toEqual([0x16, 0x50]);

    // the gamepad and keyboard work together or on their own, and keep their slots in every list.
    // With only USB host inputs there's no list without them, so plugging one in later still works.
    expect(profile.opts.deviceSlotIdVersion).toBe(3);
    expect(profile.assignments.map((list) => list.assignments.map((x) => x.usbType))).toEqual([
      [null, proto.SubType.Gamepad, proto.SubType.KeyboardMouse],
      [null, proto.SubType.Gamepad],
      [null, proto.SubType.KeyboardMouse],
    ]);
    expect(new Set(padMappings.map((m) => m.input!.usbButton!.deviceid))).toEqual(new Set([1]));
    expect(new Set(keyMappings.map((m) => m.input!.usbButton!.deviceid))).toEqual(new Set([2]));
  });

  it('keeps a list without the USB host for a config that also reads pins', () => {
    const SB = legacy.StandardButtonType;
    const data = legacy.SerializedConfiguration.encode(
      legacy.SerializedConfiguration.create({
        deviceType: legacy.DeviceControllerType.DeviceControllerType_Gamepad,
        bindings: [
          {
            serializedControllerButton: {
              type: SB.StandardButtonType_A,
              input: {
                serializedDirectInput: {
                  pin: 3,
                  pinMode: legacy.DevicePinMode.DevicePinMode_PullUp,
                },
              },
            },
          },
          {
            serializedCombinedUsbHostOutput: {
              outputs: [
                {
                  serializedControllerButton: {
                    type: SB.StandardButtonType_B,
                    input: {
                      serializedUsbHostInput: {
                        type: legacy.UsbHostInputType.UsbHostInputType_B,
                        combined: true,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      })
    ).finish();
    const { config } = importLegacyConfig(data);
    // the pin works without the USB host controller, so the last list matches without it
    expect(
      config.profiles[0].assignments.map((list) => list.assignments.map((x) => x.usbType))
    ).toEqual([[null, proto.SubType.Gamepad], [null]]);
  });

  it('needs the USB host controller when the only pin is a tilt sensor', () => {
    const data = legacy.SerializedConfiguration.encode(
      legacy.SerializedConfiguration.create({
        deviceType: legacy.DeviceControllerType.DeviceControllerType_GuitarHeroGuitar,
        bindings: [
          {
            serializedGuitarAxis: {
              type: legacy.GuitarAxisType.GuitarAxisType_Tilt,
              input: {
                serializedDigitalToAnalog: {
                  on: 32767,
                  child: {
                    serializedDirectInput: {
                      pin: 5,
                      pinMode: legacy.DevicePinMode.DevicePinMode_PullUp,
                    },
                  },
                },
              },
            },
          },
          {
            serializedCombinedUsbHostOutput: {
              outputs: [
                {
                  serializedGuitarButton: {
                    type: legacy.InstrumentButtonType.InstrumentButtonType_Green,
                    input: {
                      serializedUsbHostInput: {
                        type: legacy.UsbHostInputType.UsbHostInputType_A,
                        combined: true,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      })
    ).finish();
    const { config } = importLegacyConfig(data);
    // a tilt sensor can't play on its own, so every list needs the guitar on the USB host
    expect(
      config.profiles[0].assignments.map((list) => list.assignments.some((x) => x.usbType != null))
    ).toEqual([true]);
  });
});

describe('LEDs on axes', () => {
  it('follows the axis when the new input is scaled differently', () => {
    // the platter velocity is half the old one's scale, so the LED range has to be scaled as well
    const data = legacy.SerializedConfiguration.encode(
      legacy.SerializedConfiguration.create({
        deviceType: legacy.DeviceControllerType.DeviceControllerType_Turntable,
        ledType: legacy.LedType.LedType_Ws2812Rgb,
        ledMosi: 9,
        ledCount: 4,
        bindings: [
          {
            serializedDjCombinedOutput: {
              sda: 18,
              scl: 19,
              outputs: [
                {
                  serializedDjAxis: {
                    type: legacy.DjAxisType.DjAxisType_LeftTableVelocity,
                    min: -16000,
                    max: 16000,
                    ledIndex: new Uint8Array([1]),
                    input: {
                      serializedDjInputCombined: {
                        type: legacy.DjInputType.DjInputType_LeftTurntable,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      })
    ).finish();
    const profile = importLegacyConfig(data).config.profiles[0];
    const axis = profile.mappings.find((m) => m.mapping?.djhAxis != null)!;
    expect(axis).toMatchObject({ min: 24768, max: 40768 });
    expect(profile.leds[0].mapping?.inputMapping).toMatchObject({ min: 24768, max: 40768 });
  });
});

describe('importLegacyConfigs', () => {
  const SB = legacy.StandardButtonType;
  // A USB host on GP2 and an MPR121 on the given pins, with a button on each
  const encode = (sda: number, scl: number, button: legacy.StandardButtonType) =>
    legacy.SerializedConfiguration.encode(
      legacy.SerializedConfiguration.create({
        deviceType: legacy.DeviceControllerType.DeviceControllerType_Gamepad,
        usbHostDp: 2,
        hasMpr121: true,
        mpr121Sda: sda,
        mpr121Scl: scl,
        bindings: [
          {
            serializedControllerButton: {
              type: button,
              input: { serializedMpr121Input: { input: 0 } },
            },
          },
          {
            serializedCombinedUsbHostOutput: {
              outputs: [
                {
                  serializedControllerButton: {
                    type: SB.StandardButtonType_B,
                    input: {
                      serializedUsbHostInput: {
                        type: legacy.UsbHostInputType.UsbHostInputType_B,
                        combined: true,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      })
    ).finish();

  it('gives each file a profile and shares the devices they have in common', () => {
    const { config } = importLegacyConfigs([
      { data: encode(4, 5, SB.StandardButtonType_A), name: 'first' },
      { data: encode(8, 9, SB.StandardButtonType_X), name: 'second' },
    ]);
    expect(config.profiles.map((p) => [p.opts.uid, p.opts.name])).toEqual([
      [1, 'first'],
      [2, 'second'],
    ]);
    // the USB host is the same in both, the MPR121s are on different pins
    expect(config.devices.filter((d) => d.usbHost)).toHaveLength(1);
    const mpr121Sda = (profile: proto.IProfile) => {
      const id = profile.mappings!.find((m) => m.input?.mpr121)!.input!.mpr121!.deviceid;
      return config.devices.find((d) => d.deviceid === id)?.mpr121?.i2c?.sda;
    };
    expect(config.profiles.map(mpr121Sda)).toEqual([4, 8]);
    // slots belong to each profile, so the USB host inputs keep their slot
    expect(
      config.profiles.map(
        (p) => p.mappings.find((m) => m.input?.usbButton)?.input?.usbButton?.deviceid
      )
    ).toEqual([1, 1]);
  });

  it('keeps the Fortnite Festival toggle of each file separate', () => {
    const encodeToggle = () =>
      legacy.SerializedConfiguration.encode(
        legacy.SerializedConfiguration.create({
          bindings: [
            {
              serializedEmulationMode: {
                type: legacy.EmulationModeType.EmulationModeType_FnfLayer,
                input: {
                  serializedDirectInput: {
                    pin: 9,
                    pinMode: legacy.DevicePinMode.DevicePinMode_PullUp,
                  },
                },
              },
            },
          ],
        })
      ).finish();
    const { config } = importLegacyConfigs([
      { data: encodeToggle(), name: 'first' },
      { data: encodeToggle(), name: 'second' },
    ]);
    // each file's festival profile goes before its main one
    expect(config.profiles.map((p) => p.opts.name)).toEqual([
      'first (Festival)',
      'first',
      'second (Festival)',
      'second',
    ]);
    const toggles = config.profiles
      .flatMap((p) => p.assignments.flatMap((list) => list.assignments))
      .map((x) => x.inputAnyTime?.input?.toggle?.deviceid)
      .filter((id) => id != null);
    expect(toggles).toHaveLength(2);
    expect(new Set(toggles).size).toBe(2);
    expect(config.devices.filter((d) => d.toggle)).toHaveLength(2);
  });

  it('names the file that could not be read', () => {
    expect(() =>
      importLegacyConfigs([
        { data: encode(4, 5, SB.StandardButtonType_A), name: 'good' },
        { data: new Uint8Array([0xff, 0xff, 0xff]), name: 'broken' },
      ])
    ).toThrow(/^broken: /);
  });
});
