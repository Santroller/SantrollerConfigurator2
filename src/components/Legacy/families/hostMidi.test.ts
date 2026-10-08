import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { LegacyImportContext } from '../context';
import { importLegacyConfig } from '../importLegacyConfig';
import { legacy } from '../legacy';

import './instrumentPeripherals';

import { convertHostMidiSettings, hostOutput, keyboardOutput } from './hostMidi';

const DT = legacy.DeviceControllerType;
const UT = legacy.UsbHostInputType;
const LIB = legacy.InstrumentButtonType;
const MT = legacy.MidiType;

function encode(config: legacy.ISerializedConfiguration) {
  return legacy.SerializedConfiguration.encode(
    legacy.SerializedConfiguration.create(config)
  ).finish();
}

const load = (config: legacy.ISerializedConfiguration) => importLegacyConfig(encode(config));

const usb = (type: legacy.UsbHostInputType, extra = {}): legacy.ISerializedInput => ({
  serializedUsbHostInput: { type, combined: true, ...extra },
});
const bt = (type: legacy.UsbHostInputType, extra = {}): legacy.ISerializedInput => ({
  serializedBluetoothInput: { type, combined: true, ...extra },
});
const midi = (key: number, type = MT.MidiType_Note): legacy.ISerializedInput => ({
  serializedMidiInput: { key, type },
});
const guitarButton = (type: legacy.InstrumentButtonType, input: legacy.ISerializedInput) => ({
  serializedGuitarButton: { type, input },
});
const guitarAxis = (type: legacy.GuitarAxisType, input: legacy.ISerializedInput, extra = {}) => ({
  serializedGuitarAxis: { type, input, ...extra },
});
const assignments = (config: proto.Config) =>
  config.profiles[0].assignments[0].assignments.slice(1);

describe('USB host', () => {
  it('reads the inputs from a controller of the emulated type', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_GuitarHeroGuitar,
      usbHostDp: 20,
      adafruitHost: true,
      bindings: [
        {
          serializedCombinedUsbHostOutput: {
            outputs: [
              guitarButton(LIB.InstrumentButtonType_Green, usb(UT.UsbHostInputType_Green)),
              guitarButton(LIB.InstrumentButtonType_SoloRed, usb(UT.UsbHostInputType_SoloRed)),
              guitarButton(LIB.InstrumentButtonType_StrumUp, usb(UT.UsbHostInputType_DpadUp)),
              guitarAxis(
                legacy.GuitarAxisType.GuitarAxisType_Whammy,
                usb(UT.UsbHostInputType_Whammy),
                {
                  min: 1000,
                  max: 60000,
                }
              ),
              guitarAxis(legacy.GuitarAxisType.GuitarAxisType_Tilt, usb(UT.UsbHostInputType_Tilt), {
                min: -10000,
                max: 10000,
              }),
              // turntable buttons, which a guitar doesn't have
              guitarButton(LIB.InstrumentButtonType_Blue, usb(UT.UsbHostInputType_LeftBlue)),
            ],
          },
        },
      ],
    });
    expect(config.devices).toHaveLength(1);
    expect(config.devices[0].usbHost).toMatchObject({
      firstPin: 20,
      dmFirst: false,
      enable5v: true,
    });
    expect(assignments(config)).toEqual([
      expect.objectContaining({ usbType: proto.SubType.GuitarHeroGuitar }),
    ]);
    const GH = proto.GuitarHeroGuitarButtonType;
    const [green, solo, strum, whammy, tilt, ...rest] = config.profiles[0].mappings;
    expect(rest).toHaveLength(0);
    expect(green.input?.usbButton).toEqual({
      deviceid: 1,
      button: { ghButton: GH.GuitarHeroGuitar_Green },
    });
    expect(green.mapping?.ghButton).toBe(GH.GuitarHeroGuitar_Green);
    expect(solo.input?.usbButton?.button?.ghButton).toBe(GH.GuitarHeroGuitar_TapRed);
    expect(strum.input?.usbButton?.button?.gamepadButton).toBe(
      proto.GamepadButtonType.Gamepad_DpadUp
    );
    expect(whammy.input?.usbAxis).toEqual({
      deviceid: 1,
      axis: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
    });
    // whammy was unsigned and tilt signed in the old firmware
    expect(whammy).toMatchObject({ min: 1000, max: 60000 });
    expect(tilt.input?.usbAxis?.axis?.ghAxis).toBe(
      proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt
    );
    expect(tilt).toMatchObject({ min: 22768, max: 42768 });
    expect(warnings.some((w) => w.includes('Guitar Hero Guitar controller'))).toBe(true);
    expect(warnings.some((w) => w.includes("can't read"))).toBe(true);
  });

  it('uses gamepad outputs and pressure for a gamepad', () => {
    const { config } = load({
      deviceType: DT.DeviceControllerType_Gamepad,
      bindings: [
        {
          serializedControllerAxis: {
            type: legacy.StandardAxisType.StandardAxisType_LeftStickX,
            input: { serializedUsbHostInput: { type: UT.UsbHostInputType_LeftStickX } },
          },
        },
        {
          serializedControllerAxis: {
            type: legacy.StandardAxisType.StandardAxisType_LeftTrigger,
            input: { serializedUsbHostInput: { type: UT.UsbHostInputType_PressureCross } },
          },
        },
        {
          serializedControllerButton: {
            type: legacy.StandardButtonType.StandardButtonType_A,
            input: { serializedUsbHostInput: { type: UT.UsbHostInputType_Green } },
          },
        },
      ],
    });
    const [stick, pressure, green] = config.profiles[0].mappings;
    expect(stick.input?.usbAxis?.axis?.gamepadAxis).toBe(proto.GamepadAxisType.Gamepad_LeftStickX);
    expect(stick).toMatchObject({ min: 1, max: 65535, center: 32768 });
    expect(pressure.input?.usbButton?.button?.gamepadButton).toBe(
      proto.GamepadButtonType.Gamepad_A
    );
    expect(pressure).toMatchObject({ min: 0, max: 65535 });
    // the old firmware set green from A on a gamepad
    expect(green.input?.usbButton?.button?.gamepadButton).toBe(proto.GamepadButtonType.Gamepad_A);
    expect(assignments(config)).toEqual([
      expect.objectContaining({ usbType: proto.SubType.Gamepad }),
    ]);
  });

  it('maps every input type to a decodable output or a warning', () => {
    for (const host of [
      proto.SubType.Gamepad,
      proto.SubType.RockBandGuitar,
      proto.SubType.DjHeroTurntable,
    ]) {
      for (const type of Object.values(UT).filter((v): v is number => typeof v === 'number')) {
        const result = hostOutput(type, host);
        expect(typeof result === 'string' || Object.keys(result.output).length === 1).toBe(true);
      }
    }
    expect(hostOutput(UT.UsbHostInputType_SoloBlue, proto.SubType.RockBandGuitar)).toMatchObject({
      output: { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue },
    });
    expect(hostOutput(UT.UsbHostInputType_Crossfader, proto.SubType.DjHeroTurntable)).toMatchObject(
      {
        output: { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_Crossfader },
        isUint: false,
      }
    );
    expect(typeof hostOutput(UT.UsbHostInputType_RedVelocity, proto.SubType.RockBandDrums)).toBe(
      'string'
    );
  });

  it('imports pro guitar frets with the full range', () => {
    const { config } = load({
      deviceType: DT.DeviceControllerType_ProGuitarMustang,
      bindings: [
        {
          serializedProGuitarAxis: {
            type: legacy.ProGuitarType.ProGuitarType_LowEFret,
            input: usb(UT.UsbHostInputType_LowEFret),
            min: 0,
            max: 31,
          },
        },
      ],
    });
    const [fret] = config.profiles[0].mappings;
    expect(fret.input?.usbAxis?.axis?.proAxis).toBe(proto.ProGuitarAxisType.ProGuitar_LowEFret);
    expect(fret).toMatchObject({ min: 0, max: 65535 });
  });

  it('reads keys and the mouse from their own slots', () => {
    const { config } = load({
      emulationType: legacy.EmulationType.EmulationType_KeyboardMouse,
      bindings: [
        {
          serializedKeyboardButton: {
            type: 44,
            input: {
              serializedUsbHostInput: { type: UT.UsbHostInputType_KeyboardInput, key: 116 },
            },
          },
        },
        {
          serializedMouseButton: {
            type: legacy.MouseButtonType.MouseButtonType_Left,
            input: {
              serializedUsbHostInput: {
                type: UT.UsbHostInputType_MouseButton,
                mouseButtonType: legacy.MouseButtonType.MouseButtonType_Right,
              },
            },
          },
        },
        {
          serializedMouseAxis: {
            type: legacy.MouseAxisType.MouseAxisType_X,
            input: {
              serializedUsbHostInput: {
                type: UT.UsbHostInputType_MouseAxis,
                mouseAxisType: legacy.MouseAxisType.MouseAxisType_ScrollY,
              },
            },
          },
        },
      ],
    });
    const [key, button, axis] = config.profiles[0].mappings;
    expect(key.mapping?.keycode).toBe(0x04);
    expect(key.input?.key).toEqual({ deviceid: 1, key: 0xe1 });
    expect(button.input?.mouseButton).toEqual({
      deviceid: 2,
      button: proto.MouseButtonType.Mouse_Right,
    });
    expect(axis.input?.mouseAxis).toEqual({ deviceid: 2, axis: proto.MouseAxisType.Mouse_ScrollY });
    expect(axis).toMatchObject({ min: 1, max: 65535, center: 32768 });
    expect(assignments(config)).toEqual([
      expect.objectContaining({ usbType: proto.SubType.KeyboardMouse }),
      expect.objectContaining({ usbType: proto.SubType.KeyboardMouse }),
    ]);
  });
});

describe('Bluetooth', () => {
  it('reads from a Bluetooth controller of the emulated type', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_RockBandGuitar,
      btRxMacAddress: '12:34:56:78:9A:BC',
      bindings: [
        {
          serializedCombinedBluetoothOutput: {
            outputs: [
              guitarButton(LIB.InstrumentButtonType_SoloGreen, bt(UT.UsbHostInputType_SoloGreen)),
              guitarAxis(
                legacy.GuitarAxisType.GuitarAxisType_Pickup,
                bt(UT.UsbHostInputType_Pickup)
              ),
              guitarButton(
                LIB.InstrumentButtonType_Green,
                bt(UT.UsbHostInputType_KeyboardInput, { key: 44 })
              ),
            ],
          },
        },
      ],
    });
    expect(config.devices.map((d) => d.bt)).toEqual([expect.any(Object)]);
    expect(assignments(config)).toEqual([
      expect.objectContaining({ bluetoothType: proto.SubType.RockBandGuitar }),
    ]);
    const [solo, pickup, ...rest] = config.profiles[0].mappings;
    expect(rest).toHaveLength(0);
    expect(solo.input?.btButton).toEqual({
      deviceid: 1,
      button: { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen },
    });
    expect(pickup.input?.btAxis?.axis?.rbAxis).toBe(
      proto.RockBandGuitarAxisType.RockBandGuitar_Pickup
    );
    expect(warnings).toContain("The Bluetooth controller couldn't be imported, pair it again.");
    expect(warnings).toContain('Bluetooth keyboard and mouse bindings were skipped.');
  });
});

describe('keyboard outputs', () => {
  it('converts Avalonia keys to HID usages', () => {
    expect(keyboardOutput(44)).toEqual({ keycode: 0x04 }); // A
    expect(keyboardOutput(34)).toEqual({ keycode: 0x27 }); // D0
    expect(keyboardOutput(6)).toEqual({ keycode: 0x28 }); // Enter
    expect(keyboardOutput(140)).toEqual({ keycode: 0x33 }); // OemSemicolon
    expect(keyboardOutput(113)).toEqual({ keycode: 0x73 }); // F24
    expect(keyboardOutput(74)).toEqual({ keycode: 0x62 }); // NumPad0
    expect(keyboardOutput(83)).toEqual({ keycode: 0x61 }); // NumPad9
    expect(keyboardOutput(71)).toEqual({ keycode: 0xe7 }); // RWin
    expect(keyboardOutput(135)).toEqual({ consumerKey: 0xcd }); // MediaPlayPause
    expect(keyboardOutput(0)).toBeUndefined();
  });

  it('skips keys with no equivalent', () => {
    const { config, warnings } = load({
      emulationType: legacy.EmulationType.EmulationType_KeyboardMouse,
      bindings: [
        {
          serializedKeyboardButton: {
            type: 131,
            input: {
              serializedDirectInput: { pin: 2, pinMode: legacy.DevicePinMode.DevicePinMode_PullUp },
            },
          },
        },
        {
          serializedKeyboardButton: {
            type: 1,
            input: {
              serializedDirectInput: { pin: 3, pinMode: legacy.DevicePinMode.DevicePinMode_PullUp },
            },
          },
        },
      ],
    });
    expect(config.profiles[0].mappings.map((m) => m.mapping?.consumerKey)).toEqual([0xe9]);
    expect(warnings.some((w) => w.includes("can't send"))).toBe(true);
  });
});

describe('MIDI', () => {
  it('reads serial MIDI on the drum channel', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_RockBandDrums,
      midiSerialEnabled: true,
      midiSerialPin: 5,
      bindings: [
        {
          serializedCombinedMidiOutput: {
            outputs: [
              {
                serializedDrumAxis: {
                  type: legacy.DrumAxisType.DrumAxisType_Red,
                  input: midi(38),
                  min: 0,
                  max: 65535,
                },
              },
            ],
          },
        },
      ],
    });
    expect(config.devices[0].midiSerial?.uart).toMatchObject({ rx: 5, tx: -1, baudrate: 31250 });
    expect(assignments(config)).toEqual([expect.objectContaining({ midiChannel: 10 })]);
    const [red] = config.profiles[0].mappings;
    expect(red.mapping?.rbDrumAxis).toBe(proto.RockBandDrumsAxisType.RockBandDrums_RedPad);
    expect(red.input?.midi).toMatchObject({
      deviceid: 1,
      sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      midiNote: { note: 38, channel: 10 },
    });
    expect(red).toMatchObject({ min: 0, max: 65535, debounce: 30, peakBased: true });
    expect(warnings.some((w) => w.includes('MIDI channel 10'))).toBe(true);
  });

  it('converts pro keys, the pedal and the touch strip', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_ProKeys,
      bindings: [
        {
          serializedCombinedMidiOutput: {
            firstNote: 48,
            outputs: [
              { serializedPianoKey: { type: legacy.ProKeyType.ProKeyType_Key1, input: midi(48) } },
              {
                serializedPianoKey: {
                  type: legacy.ProKeyType.ProKeyType_PedalAnalog,
                  input: midi(0, MT.MidiType_SustainPedal),
                },
              },
              {
                serializedPianoKey: {
                  type: legacy.ProKeyType.ProKeyType_TouchPad,
                  input: midi(0, MT.MidiType_PitchWheel),
                },
              },
            ],
          },
        },
      ],
    });
    const [key, pedal, touch] = config.profiles[0].mappings;
    expect(key.mapping?.proKeySingle).toBe(1);
    expect(key.input?.midi?.midiNote).toEqual({ note: 48, channel: 1 });
    // pressed for any velocity
    expect(key).toMatchObject({
      trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      triggerValue: 0,
    });
    expect(pedal.input?.midi?.midiControlChange).toEqual({ cc: 64, channel: 1 });
    expect(pedal).toMatchObject({ min: 0, max: 65535 });
    expect(touch.input?.midi?.midiPitchBend).toEqual({ channel: 1 });
    // the old pitch wheel calibration wrapped around, so it gets the default one
    expect(touch).toMatchObject({ min: 0, max: 65535, center: 32767 });
    expect(warnings).toContain(
      'Pitch bend bindings were given the default calibration, so check them.'
    );
  });

  it('binds old MIDI inputs to the Band Hero drums and serial MIDI', () => {
    const { config } = load({
      deviceType: DT.DeviceControllerType_GuitarHeroDrums,
      hasBhDrumInput: true,
      bhDrumSda: 8,
      bhDrumScl: 9,
      midiSerialEnabled: true,
      localDebounceMode: true,
      queueBasedInputs: true,
      bindings: [
        {
          serializedDrumAxis: {
            type: legacy.DrumAxisType.DrumAxisType_Yellow,
            input: midi(22),
            debounce: 50,
          },
        },
      ],
    });
    expect(
      config.devices.map((d) => (d.bhDrum ? 'bhDrum' : d.midiSerial ? 'midiSerial' : '?'))
    ).toEqual(['bhDrum', 'midiSerial']);
    expect(assignments(config)).toEqual([
      expect.objectContaining({ midiChannel: 10 }),
      expect.objectContaining({ midiChannel: 10 }),
    ]);
    const mappings = config.profiles[0].mappings;
    // serial MIDI with the old note, and the drums with the note they send for it
    expect(mappings.map((m) => [m.input?.midi?.deviceid, m.input?.midi?.midiNote?.note])).toEqual([
      [2, 22],
      [1, 22],
      [1, 46],
    ]);
    for (const m of mappings) {
      expect(m.mapping?.ghDrumAxis).toBe(proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad);
      // the copies follow changes the core made after adding the mapping
      expect(m.debounce100us).toBe(50);
    }
  });

  it('only uses the drum slot without other MIDI sources', () => {
    const { config, warnings } = load({
      deviceType: DT.DeviceControllerType_RockBandDrums,
      hasBhDrumInput: true,
      bindings: [
        { serializedDrumAxis: { type: legacy.DrumAxisType.DrumAxisType_Green, input: midi(41) } },
        {
          serializedControllerAxis: {
            type: legacy.StandardAxisType.StandardAxisType_LeftStickX,
            input: midi(0, MT.MidiType_ModWheel),
          },
        },
      ],
    });
    expect(assignments(config)).toEqual([expect.objectContaining({ midiChannel: 10 })]);
    // the old firmware turned the drums' notes 45 and 49 into the green note
    expect(config.profiles[0].mappings.map((m) => m.input?.midi?.midiNote?.note)).toEqual([
      41, 45, 49,
    ]);
    expect(warnings.some((w) => w.includes('MIDI channel'))).toBe(false);
  });
});

describe('settings', () => {
  const context = (config: legacy.ISerializedConfiguration) =>
    new LegacyImportContext(
      legacy.SerializedConfiguration.decode(encode(config)),
      proto.SubType.KeyboardMouse
    );
  const mouseAxis = { serializedMouseAxis: { input: { serializedConstantInput: {} } } };

  it('warns about absolute mouse movement', () => {
    const ctx = context({
      mouseMovementType: legacy.MouseMovementType.MouseMovementType_Absolute,
      bindings: [mouseAxis],
    });
    convertHostMidiSettings(ctx);
    expect(ctx.warnings).toHaveLength(1);
    const relative = context({
      mouseMovementType: legacy.MouseMovementType.MouseMovementType_Relative,
      bindings: [mouseAxis],
    });
    convertHostMidiSettings(relative);
    expect(relative.warnings).toEqual([]);
  });
});
