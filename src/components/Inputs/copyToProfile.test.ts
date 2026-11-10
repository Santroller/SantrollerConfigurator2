import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { copyItemsToProfile, defaultSlotChoices, getCopiedSlots } from './copyToProfile';
import { SLOT_ID_VERSION_LATEST } from './inputRegistry';

const ST = proto.SubType;
const opts = (extra: Partial<proto.IProfileOpts> = {}) =>
  ({
    deviceToEmulate: ST.Gamepad,
    deviceSlotIdVersion: SLOT_ID_VERSION_LATEST,
    ...extra,
  }) as proto.IProfileOpts;
const gpio = (pin: number): proto.IInput => ({
  gpio: { pin, pinMode: proto.PinMode.PullUp, analog: false },
});
const usbA = (deviceid: number): proto.IInput => ({
  usbButton: { deviceid, button: { gamepadButton: proto.GamepadButtonType.Gamepad_A } },
});
const wiiA = (deviceid: number): proto.IInput => ({
  wiiButton: { deviceid, button: proto.WiiButtonType.WiiButtonClassicA },
});
const mapping = (input: proto.IInput): proto.IMapping => ({
  input,
  mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
});
const ledReading = (input: proto.IInput): proto.ILed => ({
  device: {},
  mapping: { inputMapping: { input } },
});

// Gamepad slots 1 and 2, then a guitar slot, in one list
const source: proto.IProfile = {
  opts: opts(),
  assignments: [
    {
      assignments: [
        { usbType: ST.Gamepad },
        { usbType: ST.Gamepad },
        { usbType: ST.GuitarHeroGuitar },
        { wiiExt: proto.WiiExtType.WiiClassicController },
      ],
    },
  ],
  mappings: [mapping(usbA(2)), mapping(gpio(3)), mapping(usbA(3)), mapping(wiiA(1))],
  leds: [ledReading(usbA(1)), ledReading(wiiA(1))],
};

describe('copying items to another profile', () => {
  it('lists the slots the copied items read', () => {
    const slots = getCopiedSlots(source, { mappings: [0, 1], leds: [0] });
    expect(slots.map((slot) => slot.key)).toEqual(['usbHost:1', 'usbHost:2']);
  });

  it('matches slots by kind, type and n, then by subtype', () => {
    // A guitar first, so the gamepads have other ids, and only one gamepad
    const target: proto.IProfile = {
      opts: opts(),
      assignments: [{ assignments: [{ usbType: ST.GuitarHeroGuitar }, { usbType: ST.Gamepad }] }],
    };
    const slots = getCopiedSlots(source, { mappings: [0, 2, 3], leds: [0] });
    const choices = defaultSlotChoices(source, target, slots);
    // Gamepad 1 is gamepad 1 there, gamepad 2 falls back to the only gamepad
    expect(choices.get('usbHost:1')).toBe(1);
    expect(choices.get('usbHost:2')).toBe(1);
    expect(choices.get('usbHost:3')).toBe(2);
    // There's no Wii slot to read
    expect(choices.get('wii:1')).toBeNull();
  });

  it('moves inputs onto the chosen slots and leaves out items reading a left out slot', () => {
    const target: proto.IProfile = {
      opts: opts(),
      assignments: [{ assignments: [{ usbType: ST.Gamepad }, { usbType: ST.Gamepad }] }],
      mappings: [mapping(gpio(1))],
      leds: [],
    };
    const choices = new Map<string, number | null>([
      ['usbHost:2', 1],
      ['wii:1', null],
    ]);
    const result = copyItemsToProfile(
      source,
      target,
      { mappings: [0, 1, 3], leds: [0, 1] },
      choices
    );
    expect(result.profile.mappings).toHaveLength(3);
    expect(result.profile.mappings![1].input!.usbButton!.deviceid).toBe(1);
    expect(result.profile.mappings![2].input!.gpio!.pin).toBe(3);
    // The LED reading slot 1 isn't in the choices, so keeps its id
    expect(result.profile.leds).toHaveLength(1);
    expect(result.profile.leds![0].mapping!.inputMapping!.input!.usbButton!.deviceid).toBe(1);
    expect(result).toMatchObject({ mappings: 2, leds: 1, skipped: 2, dropped: 0 });
    // The source is untouched
    expect(source.mappings![0].input!.usbButton!.deviceid).toBe(2);
  });

  it('fits mappings to the target device type and face button mode', () => {
    const guitar: proto.IProfile = {
      opts: opts({ deviceToEmulate: ST.GuitarHeroGuitar }),
      assignments: [{ assignments: [{ wiiExt: proto.WiiExtType.WiiClassicController }] }],
      mappings: [
        {
          input: wiiA(1),
          mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green },
        },
        { input: gpio(2), mapping: { ghDrumAxis: 1 } },
      ],
    };
    const target: proto.IProfile = {
      opts: opts({
        deviceToEmulate: ST.RockBandGuitar,
        faceButtonMappingMode: proto.FaceButtonMappingMode.PositionBased,
      }),
      assignments: [{ assignments: [{ wiiExt: proto.WiiExtType.WiiClassicController }] }],
    };
    const slots = getCopiedSlots(guitar, { mappings: [0, 1] });
    const result = copyItemsToProfile(
      guitar,
      target,
      { mappings: [0, 1] },
      defaultSlotChoices(guitar, target, slots)
    );
    expect(result.profile.mappings).toHaveLength(1);
    expect(result.profile.mappings![0].mapping!.rbButton).toBe(
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green
    );
    expect(result.profile.mappings![0].input!.wiiButton!.button).toBe(
      proto.WiiButtonType.WiiButtonClassicB
    );
    expect(result.dropped).toBe(1);
  });
});
