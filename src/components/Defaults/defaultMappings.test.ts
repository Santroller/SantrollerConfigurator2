import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { getDefaultMappings, getPs2Defaults, getWiiDefaults } from './defaultMappings';

describe('Classic Controller trigger defaults', () => {
  // The Pro's triggers are ZL / ZR (L / R are its shoulder buttons), the original's are L / R
  it.each([
    [proto.WiiExtType.WiiClassicController, false],
    [proto.WiiExtType.WiiClassicControllerPro, true],
    [undefined, false],
  ])('uses one combined input per trigger for extension %s', (wiiExtType, pro) => {
    const mappings = getWiiDefaults(proto.SubType.Gamepad, 2, { wiiExtType });

    for (const [button, axis] of [
      [
        pro ? proto.WiiButtonType.WiiButtonClassicZl : proto.WiiButtonType.WiiButtonClassicLt,
        proto.GamepadAxisType.Gamepad_LeftTrigger,
      ],
      [
        pro ? proto.WiiButtonType.WiiButtonClassicZr : proto.WiiButtonType.WiiButtonClassicRt,
        proto.GamepadAxisType.Gamepad_RightTrigger,
      ],
    ]) {
      const triggerMappings = mappings.filter((mapping) => mapping.mapping?.gamepadAxis === axis);
      expect(triggerMappings).toEqual([
        {
          input: { wiiButton: { button, deviceid: 2 } },
          mapping: { gamepadAxis: axis },
          min: 0,
          max: 65535,
        },
      ]);
      expect(
        mappings.filter((mapping) => mapping.input?.wiiButton?.button === button)
      ).toHaveLength(1);
    }
    expect(
      mappings.some(
        (mapping) =>
          mapping.input?.wiiAxis?.axis === proto.WiiAxisType.WiiAxisClassicLeftTrigger ||
          mapping.input?.wiiAxis?.axis === proto.WiiAxisType.WiiAxisClassicRightTrigger
      )
    ).toBe(false);
  });
});

describe('Dancepad defaults', () => {
  it('maps PS2 D-pad directions to dancepad directions', () => {
    const mappings = getPs2Defaults(proto.SubType.Dancepad, 2, {
      ps2CntType: proto.PS2ControllerType.PS2ControllerTypeDualshock2,
    });

    expect(
      mappings.map((mapping) => [mapping.input?.ps2Button?.button, mapping.mapping?.gamepadButton])
    ).toEqual([
      [proto.PS2ButtonType.PS2ButtonDpadUp, proto.GamepadButtonType.Gamepad_DpadUp],
      [proto.PS2ButtonType.PS2ButtonDpadDown, proto.GamepadButtonType.Gamepad_DpadDown],
      [proto.PS2ButtonType.PS2ButtonDpadLeft, proto.GamepadButtonType.Gamepad_DpadLeft],
      [proto.PS2ButtonType.PS2ButtonDpadRight, proto.GamepadButtonType.Gamepad_DpadRight],
    ]);
    expect(mappings.every((mapping) => mapping.input?.ps2Button?.deviceid === 2)).toBe(true);
  });

  it('maps Wii Classic Controller D-pad directions when emulating a dancepad', () => {
    const mappings = getWiiDefaults(proto.SubType.Dancepad, 1, {
      wiiExtType: proto.WiiExtType.WiiClassicController,
    });

    expect(
      mappings.map((mapping) => [mapping.input?.wiiButton?.button, mapping.mapping?.gamepadButton])
    ).toEqual([
      [proto.WiiButtonType.WiiButtonClassicDPadUp, proto.GamepadButtonType.Gamepad_DpadUp],
      [proto.WiiButtonType.WiiButtonClassicDPadDown, proto.GamepadButtonType.Gamepad_DpadDown],
      [proto.WiiButtonType.WiiButtonClassicDPadLeft, proto.GamepadButtonType.Gamepad_DpadLeft],
      [proto.WiiButtonType.WiiButtonClassicDPadRight, proto.GamepadButtonType.Gamepad_DpadRight],
    ]);
    expect(mappings.every((mapping) => mapping.input?.wiiButton?.deviceid === 1)).toBe(true);
  });
});

// An axis output driven by a digital input needs a pressed value, and an analog one needs a
// range: with neither, the firmware calibrates against 0-0 and the axis never moves.
const isAxisOutput = (m: proto.IMapping) =>
  Object.entries(m.mapping ?? {}).some(([k, v]) => k.endsWith('Axis') && v != null);
const calibrated = (m: proto.IMapping) => m.pressed != null || (m.max ?? 0) > (m.min ?? 0);

describe('drum defaults', () => {
  const wiiDrums = { wiiExtType: proto.WiiExtType.WiiGuitarHeroDrums };
  for (const subType of [proto.SubType.RockBandDrums, proto.SubType.GuitarHeroDrums]) {
    const name = proto.SubType[subType];
    it(`calibrates every Wii drum axis for ${name}`, () => {
      const axes = getDefaultMappings('wii', subType, 1, wiiDrums).filter(isAxisOutput);
      expect(axes.length).toBeGreaterThan(0);
      expect(axes.filter((m) => !calibrated(m))).toEqual([]);
    });
    it(`reads Wii ${name} pads from the kit's MIDI stream`, () => {
      const pads = getDefaultMappings('wii', subType, 1, wiiDrums).filter(
        (m) => m.mapping?.rbDrumAxis != null || m.mapping?.ghDrumAxis != null
      );
      expect(pads.length).toBeGreaterThan(0);
      for (const pad of pads) {
        expect(pad.input?.midi?.sourceType).toBe(proto.MidiInputSourceType.MidiInputSourceType_Wii);
        expect(pad.input?.midi?.deviceid).toBe(1);
      }
    });
    it(`holds MIDI drum hits for ${name}`, () => {
      const pads = getDefaultMappings('midiSerial', subType, 1).filter(
        (m) => m.input?.midi?.midiNote && isAxisOutput(m)
      );
      expect(pads.length).toBeGreaterThan(0);
      for (const pad of pads) {
        expect(calibrated(pad)).toBe(true);
        expect(pad.debounce).toBeGreaterThan(0);
        expect(pad.peakBased).toBe(true);
      }
    });
  }
});
