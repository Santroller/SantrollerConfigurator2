import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  createSlotInput,
  getAssignmentSlotIds,
  getAssignmentTriggerIds,
  getProfileSlotForInput,
  getProfileSlotKey,
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
      deviceSlotIdVersion: 1,
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
    expect(slots.map((slot) => slot.slotId)).toEqual([1, 1]);
    expect(createSlotInput(slots[0], { axis: false, button: true })).toEqual({
      midi: {
        deviceid: 1,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
        midiNote: { note: 1, channel: 4 },
      },
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

  it('starts each source kind at one and coalesces matching slots across alternatives', () => {
    const typedProfile: proto.IProfile = {
      ...profile,
      assignments: [
        {
          assignments: [{ consoleType: { consoleType: null } }, { usbType: proto.SubType.Gamepad }],
        },
        {
          assignments: [
            { consoleType: { consoleType: null } },
            { usbDevice: { vid: 1, pid: 2 } },
            { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar },
          ],
        },
      ],
    };
    const slots = getProfileSlots(typedProfile);

    expect(slots.map((slot) => slot.key)).toEqual(['usbHost:1', 'psx:1']);
    expect(
      getProfileSlotForInput(
        {
          usbButton: {
            deviceid: 1,
            button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
          },
        },
        slots
      )?.deviceKind
    ).toBe('usbHost');
    expect(
      getProfileSlotForInput(
        {
          ps2Button: {
            deviceid: 1,
            button: proto.PS2ButtonType.PS2ButtonCross,
          },
        },
        slots
      )?.deviceKind
    ).toBe('psx');
  });

  it('resolves MIDI inputs to the explicitly selected typed slot', () => {
    const typedProfile: proto.IProfile = {
      ...profile,
      assignments: [
        { assignments: [{ midiChannel: 4 }] },
        { assignments: [{ usbType: proto.SubType.Gamepad }] },
      ],
    };
    const slots = getProfileSlots(typedProfile);

    expect(slots.map((slot) => slot.key)).toEqual(['midi:1', 'usbHost:1']);
    expect(
      getProfileSlotForInput(
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_USB,
          },
        },
        slots
      )?.deviceKind
    ).toBe('usbHost');
    expect(
      getProfileSlotForInput(
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
          },
        },
        slots
      )?.deviceKind
    ).toBe('midi');
  });

  it('keeps legacy profiles on firmware trigger indices', () => {
    const assignments = [
      { copilotProfile: 5 },
      { input: { input: {} } },
      { usbType: proto.SubType.Gamepad },
    ];
    expect(getAssignmentTriggerIds(assignments)).toEqual([0, 0, 0]);
    const legacyProfile = {
      ...profile,
      opts: { ...profile.opts, deviceSlotIdVersion: undefined },
      assignments: [{ assignments }],
    };
    expect(getProfileSlots(legacyProfile)[0].slotId).toBe(0);
  });

  it('counts slots by source kind within each alternative list', () => {
    const assignments = [
      { consoleType: { consoleType: null } },
      { usbType: proto.SubType.Gamepad },
      { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar },
      { usbDevice: { vid: 1, pid: 2 } },
    ];

    expect(getAssignmentSlotIds(assignments)).toEqual([0, 1, 1, 2]);
    expect(getAssignmentSlotIds(assignments.slice(0, 3))).toEqual([0, 1, 1]);
  });

  it('updates existing MIDI input channels from the slot without changing other inputs', () => {
    const channels = new Map([[getProfileSlotKey('midi', 1), 7]]);
    const input: proto.IInput = {
      shortcut: {
        inputs: [
          {
            midi: {
              deviceid: 1,
              sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
              midiNote: { note: 60, channel: 4 },
            },
          },
          {
            midi: {
              deviceid: 1,
              sourceType: proto.MidiInputSourceType.MidiInputSourceType_USB,
              midiNote: { note: 61, channel: 4 },
            },
          },
          {
            midi: {
              deviceid: 1,
              sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
              midiControlChange: { cc: 2, channel: 4 },
            },
          },
          {
            midi: {
              deviceid: 1,
              sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
              midiPitchBend: { channel: 4 },
            },
          },
          { gpio: { pin: 2, pinMode: proto.PinMode.PullUp, analog: false } },
        ],
      },
    };
    expect(withSlotMidiChannel(input, channels, getProfileSlots(profile)).shortcut?.inputs).toEqual(
      [
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
            midiNote: { note: 60, channel: 7 },
          },
        },
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_USB,
            midiNote: { note: 61, channel: 4 },
          },
        },
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
            midiControlChange: { cc: 2, channel: 7 },
          },
        },
        {
          midi: {
            deviceid: 1,
            sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
            midiPitchBend: { channel: 7 },
          },
        },
        { gpio: { pin: 2, pinMode: proto.PinMode.PullUp, analog: false } },
      ]
    );
    expect(input.shortcut?.inputs?.[0].midi?.midiNote?.channel).toBe(4);
  });

  it('does not apply a MIDI channel when a legacy input has an ambiguous typed slot', () => {
    const profileWithCollidingSlots: proto.IProfile = {
      ...profile,
      assignments: [
        { assignments: [{ midiChannel: 4 }] },
        { assignments: [{ usbType: proto.SubType.Gamepad }] },
      ],
    };
    const input: proto.IInput = {
      midi: { deviceid: 0, midiNote: { note: 60, channel: 4 } },
    };
    const channels = new Map([[getProfileSlotKey('midi', 0), 7]]);

    expect(withSlotMidiChannel(input, channels, getProfileSlots(profileWithCollidingSlots))).toBe(
      input
    );
  });
});
