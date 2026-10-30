import { describe, expect, it } from 'vitest';
import { retargetRule, splitExtraTargets } from './assignmentTargets';
import { proto } from './config.js';

const BT = { bluetooth: proto.BluetoothMode.BTStandard };
const USB = { consoleType: { xinputOnWindows: true, ps4OrPs5Mode: true } };
const WII = { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar };

const configWith = (...lists: proto.IProfileAssignmentInfo[][]) =>
  ({
    profiles: [
      {
        opts: { deviceSlotIdVersion: 2 },
        assignments: lists.map((assignments) => ({ assignments })),
      },
    ],
  }) as proto.IConfig;
const rules = (config: proto.IConfig) => config.profiles![0].assignments!.map((x) => x.assignments);

describe('retargetRule', () => {
  it('puts the target where the old one was and drops the rest', () => {
    expect(retargetRule([USB, WII, BT], BT)).toEqual([BT, WII]);
  });

  it('puts the target in front of a rule without one', () => {
    expect(retargetRule([WII], BT)).toEqual([BT, WII]);
  });
});

describe('splitExtraTargets', () => {
  it('gives each extra target a rule of its own right after the original', () => {
    const input = {
      input: { input: { gpio: { pin: 1, pinMode: proto.PinMode.PullUp, analog: false } } },
    };
    const config = configWith([USB, BT, input, { localInputs: {} }], [{ localInputs: {} }]);
    expect(splitExtraTargets(config)).toBe(true);
    expect(rules(config)).toEqual([
      [USB, input, { localInputs: {} }],
      [BT, input, { localInputs: {} }],
      [{ localInputs: {} }],
    ]);
  });

  it('drops repeated targets and rules the split made twice', () => {
    // As a user's config had it, after the rule editor switched a copy of the first rule to bluetooth
    const config = configWith([USB, WII, BT], [BT, BT, WII]);
    expect(splitExtraTargets(config)).toBe(true);
    expect(rules(config)).toEqual([
      [USB, WII],
      [BT, WII],
    ]);
  });

  it('moves older slot numbering to profile wide ids, keeping mappings on their device', () => {
    const config = {
      profiles: [
        {
          opts: {},
          assignments: [{ assignments: [USB, BT, WII] }],
          mappings: [
            {
              mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green },
              // the wii extension is the third trigger in the rule
              input: {
                wiiButton: { deviceid: 2, button: proto.WiiButtonType.WiiButtonGuitarGreen },
              },
            },
          ],
        },
      ],
    } as proto.IConfig;
    expect(splitExtraTargets(config)).toBe(true);
    const profile = config.profiles![0];
    expect(profile.opts!.deviceSlotIdVersion).toBe(3);
    expect(rules(config)).toEqual([
      [USB, WII],
      [BT, WII],
    ]);
    expect(profile.mappings![0].input!.wiiButton!.deviceid).toBe(1);
  });

  it('leaves rules with at most one target alone', () => {
    const config = configWith([USB, { midiChannel: 10 }], [{ localInputs: {} }]);
    const before = structuredClone(config);
    expect(splitExtraTargets(config)).toBe(false);
    expect(config).toEqual(before);
  });
});
