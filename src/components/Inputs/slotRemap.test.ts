import { describe, expect, it } from 'vitest';
import { getWiiDefaults } from '@/components/Defaults/defaultMappings';
import { proto } from '@/components/SettingsContext/config';
import {
  getProfileSlotForInput,
  getProfileSlotIds,
  getProfileSlots,
  getProfileWideSlotIds,
  moveWiiDrumNotesToMidiSlot,
} from './inputRegistry';
import { getInputLocalDeviceId, migrateSlotIds, remapEditedSlotIds } from './slotRemap';

const ST = proto.SubType;
const console_: proto.IProfileAssignmentInfo = { consoleType: {} };
const gamepad: proto.IProfileAssignmentInfo = { usbType: ST.Gamepad };
const keyboard: proto.IProfileAssignmentInfo = { usbType: ST.KeyboardMouse };
const guitar: proto.IProfileAssignmentInfo = { usbType: ST.GuitarHeroGuitar };
const beatmania: proto.IProfileAssignmentInfo = { usbType: ST.BeatMania };

describe('local input device ids', () => {
  it('does not resolve profile slots as local devices with the same id', () => {
    const inputs: proto.IInput[] = [
      { usbButton: { deviceid: 1, button: { gamepadButton: proto.GamepadButtonType.Gamepad_A } } },
      { wiiButton: { deviceid: 1, button: proto.WiiButtonType.WiiButtonClassicA } },
      {
        midi: {
          deviceid: 1,
          sourceType: proto.MidiInputSourceType.MidiInputSourceType_Auto,
          midiNote: { note: 60, channel: 1 },
        },
      },
    ];
    inputs.forEach((input) => expect(getInputLocalDeviceId(input)).toBeUndefined());
  });

  it('keeps the physical matrix device id', () => {
    expect(getInputLocalDeviceId({ matrix: { deviceid: 1, pin: 14, outputPin: 10 } })).toBe(1);
  });
});

// The same cases as the firmware's ProfileSlotIds tests, as both have to agree
describe('profile wide slot ids', () => {
  it('keeps each subtype on its id in every list', () => {
    expect(
      getProfileWideSlotIds([
        [console_, gamepad, keyboard],
        [console_, gamepad],
        [console_, keyboard],
        [console_],
      ])
    ).toEqual([[0, 1, 2], [0, 1], [0, 2], [0]]);
  });

  it("doesn't depend on the order of the lists", () => {
    expect(getProfileWideSlotIds([[keyboard], [keyboard, gamepad]])).toEqual([[2], [2, 1]]);
  });

  it('numbers slots of the same subtype in list order', () => {
    expect(getProfileWideSlotIds([[gamepad, guitar, gamepad], [gamepad]])).toEqual([
      [1, 3, 2],
      [1],
    ]);
  });

  it('numbers kinds separately', () => {
    expect(
      getProfileWideSlotIds([
        [{ wiiExt: proto.WiiExtType.WiiClassicController }, gamepad],
        [{ wiiExt: proto.WiiExtType.WiiClassicControllerPro }],
      ])
    ).toEqual([[1, 1], [2]]);
  });

  it('numbers specific devices with their subtype', () => {
    expect(
      getProfileWideSlotIds([
        [
          { usbDevice: { vid: 1, pid: 2 } },
          keyboard,
          { usbDevice: { vid: 3, pid: 4, subtype: ST.Gamepad } },
        ],
        [gamepad],
      ])
    ).toEqual([[3, 2, 1], [1]]);
  });

  it('gives each device its own slot in the profile', () => {
    const profile: proto.IProfile = {
      opts: {
        uid: 1,
        name: 'p',
        deviceToEmulate: ST.Gamepad,
        faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
        deviceSlotIdVersion: 2,
      },
      assignments: [{ assignments: [gamepad] }, { assignments: [keyboard] }],
    };
    const slots = getProfileSlots(profile);
    expect(slots.map((s) => [s.slotId, s.item.usbType])).toEqual([
      [1, ST.Gamepad],
      [2, ST.KeyboardMouse],
    ]);
    // Keyboard keys read the keyboard's slot
    expect(getProfileSlotForInput({ key: { deviceid: 2, key: 4 } }, slots)?.item).toBe(keyboard);
  });
});

describe('editing slots', () => {
  const profile = (lists: proto.IProfileAssignmentInfo[][], version = 2): proto.IProfile => ({
    opts: {
      uid: 1,
      name: 'p',
      deviceToEmulate: ST.Gamepad,
      faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
      deviceSlotIdVersion: version,
    },
    assignments: lists.map((assignments) => ({ assignments })),
    mappings: [
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
        input: { usbButton: { deviceid: 1, button: { gamepadButton: 1 } } },
      },
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_B },
        input: { shortcut: { inputs: [{ key: { deviceid: 2, key: 4 } }] } },
      },
    ],
  });
  const deviceIds = (p: proto.IProfile) =>
    p.mappings!.map(
      (m) => m.input?.usbButton?.deviceid ?? m.input?.shortcut?.inputs?.[0].key?.deviceid
    );

  it('moves inputs to the ids their slots get when another slot is added', () => {
    // A guitar sorts before the keyboard, so the keyboard moves from 2 to 3
    const next = remapEditedSlotIds(
      profile([[gamepad, keyboard]]),
      profile([[gamepad, keyboard], [guitar]])
    );
    expect(deviceIds(next)).toEqual([1, 3]);
  });

  it('follows a slot whose type changed', () => {
    // The gamepad becomes a BeatMania controller, which sorts after the keyboard
    const next = remapEditedSlotIds(
      profile([[gamepad, keyboard]]),
      profile([[beatmania, keyboard]])
    );
    expect(deviceIds(next)).toEqual([2, 1]);
  });

  it("doesn't leave a removed slot's inputs on another slot", () => {
    const next = remapEditedSlotIds(profile([[gamepad, keyboard]]), profile([[keyboard]]));
    expect(deviceIds(next)).toEqual([0, 1]);
  });

  it('moves a turn off action to the id its slot gets', () => {
    const withAction = (p: proto.IProfile): proto.IProfile => ({
      ...p,
      mappings: [
        {
          mapping: { turnOffController: { usb: 1 } },
          input: { usbButton: { deviceid: 1, button: { gamepadButton: 1 } } },
        },
      ],
    });
    // The gamepad becomes a BeatMania controller, which sorts after the keyboard
    const moved = remapEditedSlotIds(
      withAction(profile([[gamepad, keyboard]])),
      withAction(profile([[beatmania, keyboard]]))
    );
    expect(moved.mappings![0].mapping).toEqual({ turnOffController: { usb: 2 } });
    expect(moved.mappings![0].input?.usbButton?.deviceid).toBe(2);
  });

  it('keeps inputs on their devices when lists are reordered', () => {
    const prev = profile([[gamepad], [guitar]]);
    const next = remapEditedSlotIds(prev, {
      ...prev,
      assignments: [prev.assignments![1], prev.assignments![0]],
    });
    expect(deviceIds(next)).toEqual(deviceIds(prev));
  });

  it('leaves older profiles alone', () => {
    const next = profile([[guitar, keyboard]], 1);
    expect(remapEditedSlotIds(profile([[gamepad, keyboard]], 1), next)).toBe(next);
  });
});

describe('migrating slot ids', () => {
  const profile = (
    lists: proto.IProfileAssignmentInfo[][],
    mappings: proto.IMapping[],
    version?: number
  ): proto.IProfile => ({
    opts: {
      uid: 1,
      name: 'p',
      deviceToEmulate: ST.Gamepad,
      faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
      deviceSlotIdVersion: version,
    },
    assignments: lists.map((assignments) => ({ assignments })),
    mappings,
  });
  const usbA = (deviceid: number): proto.IMapping => ({
    mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
    input: { usbButton: { deviceid, button: { gamepadButton: 1 } } },
  });
  const deviceIds = (p: proto.IProfile) => p.mappings!.map((m) => m.input!.usbButton!.deviceid);

  it('moves version 1 inputs onto the profile wide ids', () => {
    // Keyboard is slot 1 in its own list, but slot 2 across the profile
    const migrated = migrateSlotIds(
      profile(
        [[gamepad], [keyboard]],
        [
          {
            mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_B },
            input: { key: { deviceid: 1, key: 4 } },
          },
        ],
        1
      )
    );
    expect(migrated.opts!.deviceSlotIdVersion).toBe(3);
    expect(migrated.mappings!.map((m) => m.input!.key!.deviceid)).toEqual([2]);
  });

  it('copies mappings for a slot that was a different device in each list', () => {
    const migrated = migrateSlotIds(
      profile(
        [
          [console_, gamepad],
          [console_, guitar],
        ],
        [usbA(1)],
        1
      )
    );
    expect(deviceIds(migrated)).toEqual([1, 2]);
  });

  it('only copies mappings onto slots whose device has what they read', () => {
    const whammy: proto.IMapping = {
      mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX },
      input: {
        usbAxis: {
          deviceid: 1,
          axis: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
        },
      },
    };
    const key: proto.IMapping = {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_B },
      input: { key: { deviceid: 1, key: 4 } },
    };
    // Guitar Hero guitar is 1, Rock Band guitar 2 and keyboard 3 across the profile
    const migrated = migrateSlotIds(
      profile(
        [
          [console_, guitar],
          [console_, { usbType: ST.RockBandGuitar }],
          [console_, keyboard],
        ],
        [usbA(1), whammy, key],
        1
      )
    );
    expect(
      migrated.mappings!.map((m) => {
        const input = m.input!;
        return (input.usbButton ?? input.usbAxis ?? input.key)!.deviceid;
      })
    ).toEqual([1, 2, 1, 3]);
  });

  it('keeps a slot that was the same device in every list on one id', () => {
    const migrated = migrateSlotIds(profile([[gamepad], [gamepad, keyboard]], [usbA(1)], 1));
    expect(deviceIds(migrated)).toEqual([1]);
  });

  it('migrates version 0 ids, which counted every trigger', () => {
    // The gamepad was trigger 1, after the console type
    const migrated = migrateSlotIds(profile([[console_, gamepad]], [usbA(1)]));
    expect(migrated.opts!.deviceSlotIdVersion).toBe(3);
    expect(deviceIds(migrated)).toEqual([1]);
  });

  it('leaves profiles on the latest version alone', () => {
    const p = profile([[gamepad], [keyboard]], [usbA(1)], 3);
    expect(migrateSlotIds(p)).toBe(p);
  });

  it('numbers MIDI slots by channel and device like the firmware', () => {
    // Same lists and ids as the firmware's MidiSlotsOnDifferentChannelsOrDevicesAreDifferentSlots
    const fromUsb = { midiChannel: 10, midiDevice: { usbDevice: { vid: 1, pid: 2 } } };
    expect(
      getProfileWideSlotIds([
        [{ midiChannel: 10 }],
        [{ midiChannel: 5 }],
        [fromUsb],
        [{ midiChannel: 10 }],
      ])
    ).toEqual([[2], [1], [3], [2]]);
  });

  it('splits version 2 MIDI slots by channel and device, copying their inputs onto each', () => {
    const note: proto.IMapping = {
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
      input: {
        midi: {
          deviceid: 1,
          sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
          midiNote: { note: 38, channel: 10 },
        },
      },
    };
    const kitA = { midiChannel: 10, midiDevice: { deviceid: 4 } };
    const kitB = { midiChannel: 10, midiDevice: { usbHost: {} } };
    // Every MIDI slot was slot 1 in version 2
    const p = profile([[kitA], [kitB], [{ midiChannel: 5 }]], [note], 2);
    expect(getProfileSlotIds(p)).toEqual([[1], [1], [1]]);
    const migrated = migrateSlotIds(p);
    expect(migrated.opts!.deviceSlotIdVersion).toBe(3);
    expect(getProfileSlotIds(migrated)).toEqual([[3], [2], [1]]);
    // The note read whichever of them matched, so it reads each of them still
    expect(migrated.mappings!.map((m) => m.input!.midi!.deviceid)).toEqual([3, 2, 1]);
  });
});

describe('Wii drum defaults', () => {
  const drums: proto.IProfileAssignmentInfo = { wiiExt: proto.WiiExtType.WiiGuitarHeroDrums };
  const defaultsFor = (wiiSlotId: number) =>
    getWiiDefaults(ST.GuitarHeroDrums, wiiSlotId, {
      wiiExtType: proto.WiiExtType.WiiGuitarHeroDrums,
    });
  const notes = (mappings: proto.IMapping[]) => mappings.filter((m) => m.input?.midi?.midiNote);

  it('puts the pads on a MIDI channel 10 slot added next to the Wii slot', () => {
    const lists = [[console_, drums]];
    const mappings = moveWiiDrumNotesToMidiSlot(lists, 2, 1, defaultsFor(1));
    expect(lists).toEqual([[console_, drums, { midiChannel: 10 }]]);
    expect(notes(mappings).length).toBeGreaterThan(0);
    for (const mapping of notes(mappings)) {
      expect(mapping.input!.midi).toMatchObject({
        deviceid: 1,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
        midiNote: { channel: 10 },
      });
    }
    // the buttons and stick stay on the Wii slot
    expect(mappings.some((m) => m.input?.wiiButton?.deviceid === 1)).toBe(true);
  });

  it('reuses a channel 10 slot the list already has', () => {
    const lists = [[drums, { midiChannel: 5 }, { midiChannel: 10 }]];
    const mappings = moveWiiDrumNotesToMidiSlot(lists, 2, 1, defaultsFor(1));
    expect(lists[0]).toHaveLength(3);
    expect(notes(mappings).every((m) => m.input!.midi!.deviceid === 2)).toBe(true);
  });

  it('only adds the slot to lists with that Wii slot', () => {
    const lists = [[drums], [gamepad]];
    moveWiiDrumNotesToMidiSlot(lists, 2, 1, defaultsFor(1));
    expect(lists).toEqual([[drums, { midiChannel: 10 }], [gamepad]]);
  });

  it('leaves defaults without Wii drum notes alone', () => {
    const lists = [[{ wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar }]];
    const defaults = getWiiDefaults(ST.GuitarHeroGuitar, 1, {
      wiiExtType: proto.WiiExtType.WiiGuitarHeroGuitar,
    });
    expect(moveWiiDrumNotesToMidiSlot(lists, 2, 1, defaults)).toBe(defaults);
    expect(lists[0]).toHaveLength(1);
  });

  it('matches the firmware: the slot resolves as a MIDI slot', () => {
    const profile: proto.IProfile = {
      opts: { deviceSlotIdVersion: 2 } as proto.IProfileOpts,
      assignments: [{ assignments: [console_, drums] }],
    } as proto.IProfile;
    const mappings = moveWiiDrumNotesToMidiSlot(
      profile.assignments!.map((l) => l.assignments!),
      2,
      1,
      defaultsFor(1)
    );
    const slot = getProfileSlotForInput(notes(mappings)[0].input!, getProfileSlots(profile));
    expect(slot).toMatchObject({ deviceKind: 'midi', midiChannel: 10 });
  });
});
