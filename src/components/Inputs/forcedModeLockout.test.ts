import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { forcedModeLocksOutTool } from './forcedModeLockout';

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
