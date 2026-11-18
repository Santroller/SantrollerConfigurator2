import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { forcedModeLocksOutTool, profileForcesMode } from './forcedModeLockout';

const forced = (forcedType: proto.ConsoleMode | null): proto.IProfileAssignmentInfo => ({
  consoleType: { consoleType: null, forcedType },
});
const held: proto.IProfileAssignmentInfo = {
  input: { input: { gpio: { pin: 2, pinMode: proto.PinMode.PullUp, analog: false } } },
};

describe('forced mode lockout', () => {
  it('warns for a forced mode the tool cannot connect in', () => {
    expect(forcedModeLocksOutTool([forced(proto.ConsoleMode.ModePs3)], proto.SubType.Gamepad)).toBe(
      true
    );
  });

  it('allows modes that keep the config interface', () => {
    for (const mode of [proto.ConsoleMode.ModeHid, proto.ConsoleMode.ModeXbox360]) {
      expect(forcedModeLocksOutTool([forced(mode)], proto.SubType.Gamepad)).toBe(false);
    }
    expect(forcedModeLocksOutTool([forced(null)], proto.SubType.Gamepad)).toBe(false);
  });

  it('warns for a 360 microphone, which drops the config interface', () => {
    expect(
      forcedModeLocksOutTool([forced(proto.ConsoleMode.ModeXbox360)], proto.SubType.Microphone)
    ).toBe(true);
  });

  it('is fine with a held input, but not one with nothing picked', () => {
    expect(
      forcedModeLocksOutTool([forced(proto.ConsoleMode.ModePs4), held], proto.SubType.Gamepad)
    ).toBe(false);
    expect(
      forcedModeLocksOutTool(
        [forced(proto.ConsoleMode.ModePs4), { inputAnyTime: { input: {} } }],
        proto.SubType.Gamepad
      )
    ).toBe(true);
  });
});

describe('profileForcesMode', () => {
  const profile = (...rules: proto.IProfileAssignmentInfo[][]): proto.IProfile => ({
    opts: {
      uid: 1,
      name: 'test',
      deviceToEmulate: proto.SubType.Gamepad,
      faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    },
    assignments: rules.map((assignments) => ({ assignments })),
  });

  it('finds the mode in any rule', () => {
    const p = profile([held], [held, forced(proto.ConsoleMode.ModeGameCubeAdapter)]);
    expect(profileForcesMode(p, proto.ConsoleMode.ModeGameCubeAdapter)).toBe(true);
    expect(profileForcesMode(p, proto.ConsoleMode.ModePs3)).toBe(false);
  });

  it('is false without a forced mode', () => {
    expect(profileForcesMode(profile([forced(null)]), proto.ConsoleMode.ModeGameCubeAdapter)).toBe(
      false
    );
    expect(profileForcesMode(undefined, proto.ConsoleMode.ModeGameCubeAdapter)).toBe(false);
  });
});
