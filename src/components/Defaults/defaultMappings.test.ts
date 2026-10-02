import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { getPs2Defaults, getWiiDefaults } from './defaultMappings';

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
