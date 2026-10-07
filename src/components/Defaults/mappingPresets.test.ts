import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
import { getPresetMappings, MAPPING_PRESETS } from './mappingPresets';

const preset = (id: string) => MAPPING_PRESETS.find((p) => p.id === id)!;
const wiiGuitar = { wiiExtType: proto.WiiExtType.WiiGuitarHeroGuitar };
const keyFor = (mappings: proto.IMapping[], button: proto.WiiButtonType) =>
  mappings.filter((m) => m.input?.wiiButton?.button === button).map((m) => m.mapping?.keycode);

describe('Fortnite Festival presets', () => {
  it('maps a Wii guitar to the lead keys', () => {
    const mappings = getPresetMappings(preset('festival_guitar'), 'wii', 1, wiiGuitar);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarGreen)).toEqual([CODE_TO_HID.KeyD]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarOrange)).toEqual([CODE_TO_HID.KeyL]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarStrumUp)).toEqual([
      CODE_TO_HID.ArrowUp,
    ]);
    // every mapping that survives is a key
    expect(mappings.every((m) => m.mapping?.keycode != null)).toBe(true);
  });

  it('maps a Wii guitar to the pro keys, with whammy as a held key', () => {
    const mappings = getPresetMappings(preset('festival_pro_guitar'), 'wii', 1, wiiGuitar);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarGreen)).toEqual([
      CODE_TO_HID.Digit1,
    ]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarStrumDown)).toEqual([
      CODE_TO_HID.ControlRight,
    ]);
    const whammy = mappings.find((m) => m.mapping?.keycode === CODE_TO_HID.Slash);
    expect(whammy?.trigger).toBeDefined();
  });
});

describe('PS2 guitar on PS3 preset', () => {
  it('lays a Wii guitar out like a PS2 guitar and holds d-pad left', () => {
    const mappings = getPresetMappings(preset('ps2_guitar_on_ps3'), 'wii', 1, wiiGuitar);
    const green = mappings.find(
      (m) => m.input?.wiiButton?.button === proto.WiiButtonType.WiiButtonGuitarGreen
    );
    expect(green?.mapping).toEqual({ gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger });
    expect(green?.pressed).toBe(65535);
    expect(
      mappings.filter((m) => m.mapping?.gamepadButton === proto.GamepadButtonType.Gamepad_DpadLeft)
    ).toEqual([
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft },
        input: { fixed: { value: 65535 } },
      },
    ]);
  });
});
