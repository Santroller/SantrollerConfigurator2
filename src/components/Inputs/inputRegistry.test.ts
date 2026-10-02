import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  createSlotInput,
  getProfileSlotLabel,
  getProfileSlots,
  isDrumInput,
  isSelectablePS2Axis,
  isSelectableWiiAxis,
  withSlotMidiChannel,
} from './inputRegistry';

describe('PS2 axis choices', () => {
  it('hides pressure axes for new mappings but keeps an existing selection', () => {
    const pressure = 'PS2AxisDualshock2Cross';
    expect(isSelectablePS2Axis(pressure)).toBe(false);
    expect(isSelectablePS2Axis(pressure, pressure)).toBe(true);
    expect(isSelectablePS2Axis('PS2AxisLeftStickX')).toBe(true);
  });
});

describe('Wii axis choices', () => {
  it('hides Classic trigger axes for new mappings but keeps existing selections', () => {
    for (const trigger of ['WiiAxisClassicLeftTrigger', 'WiiAxisClassicRightTrigger']) {
      expect(isSelectableWiiAxis(trigger)).toBe(false);
      expect(isSelectableWiiAxis(trigger, trigger)).toBe(true);
    }
    expect(isSelectableWiiAxis('WiiAxisClassicLeftStickX')).toBe(true);
  });
});

describe('isDrumInput', () => {
  it('treats MIDI channel 10 as percussion', () => {
    expect(isDrumInput({ midi: { midiNote: { note: 38, channel: 10 }, deviceid: 0 } })).toBe(true);
    expect(isDrumInput({ midi: { midiNote: { note: 38, channel: 1 }, deviceid: 0 } })).toBe(false);
  });
});

describe('MIDI slots', () => {
  const profile: proto.IProfile = {
    opts: {
      uid: 1,
      name: 'Test',
      faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
      deviceToEmulate: proto.SubType.Gamepad,
    },
    assignments: [
      {
        assignments: [
          { consoleType: { consoleType: null } },
          { midiChannel: 4 },
          { usbType: proto.SubType.Gamepad },
        ],
      },
    ],
  };

  it('uses the assignment index as the slot and its MIDI channel for new inputs', () => {
    const slots = getProfileSlots(profile);
    expect(slots.map((slot) => slot.slotId)).toEqual([1, 2]);
    expect(createSlotInput(slots[0], { axis: false, button: true })).toEqual({
      midi: { deviceid: 1, midiNote: { note: 1, channel: 4 } },
    });
  });

  it('uses the PS1/PS2 assignment as a slot-backed controller input', () => {
    const psxProfile: proto.IProfile = {
      ...profile,
      assignments: [
        {
          assignments: [
            { consoleType: { consoleType: null } },
            { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar },
          ],
        },
      ],
    };
    const [slot] = getProfileSlots(psxProfile).filter((entry) => entry.deviceKind === 'psx');

    expect(slot.slotId).toBe(1);
    expect(createSlotInput(slot, { axis: false, button: true })).toEqual({
      ps2Button: {
        button: proto.PS2ButtonType.PS2ButtonCross,
        deviceid: 1,
      },
    });
  });

  it('includes the assigned USB subtype in its slot label', () => {
    const item = { usbType: proto.SubType.GuitarHeroGuitar };

    expect(getProfileSlotLabel(item, 2)).toContain('GuitarHeroGuitar');
    expect(
      getProfileSlotLabel(item, 2, (key) =>
        key === 'assignments.slot'
          ? 'Slot'
          : key === 'assignments.source.usbTypeWithSubtype'
            ? 'USB Host'
            : key === 'subType.GuitarHeroGuitar'
              ? 'Guitar Hero Guitar'
              : key
      )
    ).toBe('Slot 2: USB Host (Guitar Hero Guitar)');
  });

  it('updates existing MIDI input channels from the slot without changing other inputs', () => {
    const channels = new Map([[1, 7]]);
    const input: proto.IInput = {
      shortcut: {
        inputs: [
          { midi: { deviceid: 1, midiNote: { note: 60, channel: 4 } } },
          { midi: { deviceid: 1, midiControlChange: { cc: 2, channel: 4 } } },
          { midi: { deviceid: 1, midiPitchBend: { channel: 4 } } },
          { gpio: { pin: 2, pinMode: proto.PinMode.PullUp, analog: false } },
        ],
      },
    };
    expect(withSlotMidiChannel(input, channels).shortcut?.inputs).toEqual([
      { midi: { deviceid: 1, midiNote: { note: 60, channel: 7 } } },
      { midi: { deviceid: 1, midiControlChange: { cc: 2, channel: 7 } } },
      { midi: { deviceid: 1, midiPitchBend: { channel: 7 } } },
      { gpio: { pin: 2, pinMode: proto.PinMode.PullUp, analog: false } },
    ]);
    expect(input.shortcut?.inputs?.[0].midi?.midiNote?.channel).toBe(4);
  });
});
