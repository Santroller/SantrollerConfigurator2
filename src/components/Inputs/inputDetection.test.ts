import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  detectedInput,
  detectInputCommand,
  detectInputRequest,
  detectMidiRequest,
} from './inputDetection';

describe('inputDetection', () => {
  it('only asks USB and bluetooth devices for subtypes it knows the outputs of', () => {
    expect(detectInputRequest(proto.InputDetectKind.DetectWii, 2, false)).toEqual({
      kind: proto.InputDetectKind.DetectWii,
      deviceid: 2,
      axes: false,
    });
    expect(
      detectInputRequest(proto.InputDetectKind.DetectUsb, 1, true, proto.SubType.FlightStick)
    ).toBeUndefined();
    // GH drum pads are all axes, so there's nothing to find from a button mapping
    expect(
      detectInputRequest(proto.InputDetectKind.DetectUsb, 1, false, proto.SubType.GuitarHeroDrums)
    ).toBeUndefined();
  });

  it('looks for wheel axes and gamepad buttons on a wheel', () => {
    const request = detectInputRequest(
      proto.InputDetectKind.DetectBluetooth,
      1,
      true,
      proto.SubType.Wheel
    )!;
    expect(request.buttonField).toBe('gamepadButton');
    expect(request.axisField).toBe('wheelAxis');
    expect(detectInputCommand(request).axisOutput).toBe(43);
  });

  it('sends the Output field tags and enum ranges', () => {
    const request = detectInputRequest(
      proto.InputDetectKind.DetectUsb,
      1,
      true,
      proto.SubType.GuitarHeroGuitar
    )!;
    expect(detectInputCommand(request)).toEqual({
      kind: proto.InputDetectKind.DetectUsb,
      deviceid: 1,
      axes: true,
      buttonOutput: 3,
      buttonOutputMax: Math.max(
        ...Object.values(proto.GuitarHeroGuitarButtonType).filter((v) => typeof v === 'number')
      ),
      axisOutput: 4,
      axisOutputMax: Math.max(
        ...Object.values(proto.GuitarHeroGuitarAxisType).filter((v) => typeof v === 'number')
      ),
    });
    // Tags past 15 take two bytes to encode
    const kbm = detectInputRequest(
      proto.InputDetectKind.DetectBluetooth,
      0,
      false,
      proto.SubType.KeyboardMania
    )!;
    expect(detectInputCommand(kbm).buttonOutput).toBe(40);
  });

  it('keeps every enum within what the firmware tries', () => {
    for (const subtype of Object.values(proto.SubType).filter((v) => typeof v === 'number')) {
      const request = detectInputRequest(proto.InputDetectKind.DetectUsb, 0, true, subtype);
      if (request) {
        const command = detectInputCommand(request);
        expect(command.buttonOutputMax ?? 0).toBeLessThanOrEqual(72);
        expect(command.axisOutputMax ?? 0).toBeLessThanOrEqual(72);
      }
    }
  });

  it('builds the detected input', () => {
    const wii = detectInputRequest(proto.InputDetectKind.DetectWii, 3, true)!;
    expect(
      detectedInput(wii, { axis: false, value: proto.WiiButtonType.WiiButtonGuitarGreen })
    ).toEqual({ wiiButton: { deviceid: 3, button: proto.WiiButtonType.WiiButtonGuitarGreen } });
    const usb = detectInputRequest(
      proto.InputDetectKind.DetectUsb,
      1,
      true,
      proto.SubType.RockBandGuitar
    )!;
    expect(detectedInput(usb, { axis: true, value: 2 })).toEqual({
      usbAxis: { deviceid: 1, axis: { rbAxis: 2 } },
    });
    expect(detectedInput(usb, { axis: false, value: 5 })).toEqual({
      usbButton: { deviceid: 1, button: { rbButton: 5 } },
    });
  });

  it('detects keyboard keys and mouse buttons on a keyboard and mouse', () => {
    const request = detectInputRequest(
      proto.InputDetectKind.DetectUsb,
      1,
      false,
      proto.SubType.KeyboardMouse
    )!;
    const command = detectInputCommand(request);
    expect(command.keys).toBe(true);
    expect(command.buttonOutput).toBe(26);
    expect(detectedInput(request, { axis: false, key: true, value: 0x04 })).toEqual({
      usbButton: { deviceid: 1, button: { keycode: 0x04 } },
    });
    expect(
      detectedInput(request, { axis: false, value: proto.MouseButtonType.Mouse_Left })
    ).toEqual({
      usbButton: { deviceid: 1, button: { mouseButton: proto.MouseButtonType.Mouse_Left } },
    });
  });

  it('builds MIDI inputs from what was played', () => {
    const request = detectMidiRequest(4, proto.MidiInputSourceType.MidiInputSourceType_USB);
    expect(detectInputCommand(request)).toEqual({
      kind: proto.InputDetectKind.DetectMidi,
      deviceid: 4,
      axes: true,
      midiSourceType: proto.MidiInputSourceType.MidiInputSourceType_USB,
    });
    const midi = { deviceid: 4, sourceType: proto.MidiInputSourceType.MidiInputSourceType_USB };
    expect(
      detectedInput(request, {
        axis: false,
        midiType: proto.InputDetectMidiType.DetectMidiNote,
        midiChannel: 10,
        value: 38,
      })
    ).toEqual({ midi: { ...midi, midiNote: { note: 38, channel: 10 } } });
    expect(
      detectedInput(request, {
        axis: true,
        midiType: proto.InputDetectMidiType.DetectMidiControlChange,
        midiChannel: 10,
        value: 4,
      })
    ).toEqual({ midi: { ...midi, midiControlChange: { cc: 4, channel: 10 } } });
    expect(
      detectedInput(request, {
        axis: true,
        midiType: proto.InputDetectMidiType.DetectMidiPitchBend,
        midiChannel: 2,
        value: 0,
      })
    ).toEqual({ midi: { ...midi, midiPitchBend: { channel: 2 } } });
  });

  it("uses a MIDI slot's fixed channel", () => {
    const request = detectMidiRequest(0, proto.MidiInputSourceType.MidiInputSourceType_MIDI, 3);
    expect(
      detectedInput(request, {
        axis: false,
        midiType: proto.InputDetectMidiType.DetectMidiNote,
        midiChannel: 10,
        value: 36,
      })?.midi?.midiNote
    ).toEqual({ note: 36, channel: 3 });
  });
});
