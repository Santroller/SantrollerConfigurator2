import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { getPs2Defaults, getWiiDefaults } from './defaultMappings';

describe('Classic Controller trigger defaults', () => {
  it.each([
    proto.WiiExtType.WiiClassicController,
    proto.WiiExtType.WiiClassicControllerPro,
    undefined,
  ])('uses one combined input per trigger for extension %s', (wiiExtType) => {
    const mappings = getWiiDefaults(proto.SubType.Gamepad, 2, { wiiExtType });

    for (const [button, axis] of [
      [proto.WiiButtonType.WiiButtonClassicLt, proto.GamepadAxisType.Gamepad_LeftTrigger],
      [proto.WiiButtonType.WiiButtonClassicRt, proto.GamepadAxisType.Gamepad_RightTrigger],
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
