import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { findProfileShadow, findRuleShadow } from './profileShadowing';

const usb = (extra: Partial<proto.IUsbDeviceAssignment> = {}): proto.IProfileAssignmentInfo => ({
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ...extra },
});
const local: proto.IProfileAssignmentInfo = { localInputs: {} };
const held = (pin: number): proto.IProfileAssignmentInfo => ({
  input: { input: { gpio: { pin, pinMode: proto.PinMode.PullUp, analog: false } } },
});
const guitar: proto.IProfileAssignmentInfo = { usbType: proto.SubType.GuitarHeroGuitar };

const profile = (name: string, ...rules: proto.IProfileAssignmentInfo[][]): proto.IProfile =>
  ({
    opts: { name },
    assignments: rules.map((assignments) => ({ assignments })),
  }) as proto.IProfile;

describe('profile shadowing', () => {
  it('reports a festival profile below the guitar profile it reads from', () => {
    const profiles = [
      profile('Guitar', [usb(), local]),
      profile('Festival', [usb({ xinputOnWindows: false }), local, held(3)]),
    ];
    expect(findRuleShadow(profiles, 1, 0)).toEqual({
      profileIdx: 0,
      listIdx: 0,
      reason: 'localInputs',
    });
    expect(findProfileShadow(profiles, 1)?.profileIdx).toBe(0);
  });

  it('is fine with the festival profile above', () => {
    const profiles = [
      profile('Festival', [usb(), local, held(3)]),
      profile('Guitar', [usb(), local]),
    ];
    expect(findRuleShadow(profiles, 0, 0)).toBeUndefined();
    expect(findRuleShadow(profiles, 1, 0)).toBeUndefined();
  });

  it('looks past an earlier rule that takes the same thing', () => {
    const profiles = [
      profile(
        'Guitar',
        [usb({ forcedType: proto.ConsoleMode.ModeXboxOne }), local, held(4)],
        [usb(), local]
      ),
      profile('Festival', [usb(), local, held(3)]),
    ];
    expect(findRuleShadow(profiles, 1, 0)).toMatchObject({ profileIdx: 0, listIdx: 1 });
  });

  it('ignores profiles that only share USB', () => {
    const profiles = [profile('A', [usb(), held(2)]), profile('B', [usb(), held(2)])];
    expect(findRuleShadow(profiles, 1, 0)).toBeUndefined();
  });

  it('ignores an earlier rule that needs something this one does not', () => {
    const profiles = [profile('A', [usb(), local, held(2)]), profile('B', [usb(), local])];
    expect(findRuleShadow(profiles, 1, 0)).toBeUndefined();
  });

  it('ignores rules waiting for different consoles', () => {
    const profiles = [
      profile('A', [usb({ consoleType: proto.ConsoleType.ConsolePS3 }), local]),
      profile('B', [usb({ consoleType: proto.ConsoleType.ConsoleXbox360 }), local]),
    ];
    expect(findRuleShadow(profiles, 1, 0)).toBeUndefined();
  });

  it('reports connected controllers and exclusive outputs', () => {
    expect(
      findRuleShadow([profile('A', [usb(), guitar]), profile('B', [usb(), guitar, held(1)])], 1, 0)
        ?.reason
    ).toBe('devices');
    const ps2: proto.IProfileAssignmentInfo = { ps2Emulation: {} };
    expect(
      findRuleShadow([profile('A', [ps2, held(1)]), profile('B', [ps2, held(1), held(2)])], 1, 0)
        ?.reason
    ).toBe('output');
  });

  it('reports a later rule in the same profile', () => {
    const profiles = [profile('A', [usb(), local], [usb(), local, held(2)])];
    expect(findRuleShadow(profiles, 0, 1)).toEqual({ profileIdx: 0, listIdx: 0 });
    // The profile still matches through its first rule
    expect(findProfileShadow(profiles, 0)).toBeUndefined();
  });

  it('needs every rule shadowed to report the profile', () => {
    const profiles = [
      profile('Guitar', [usb(), local]),
      profile('Festival', [usb(), local, held(3)], [usb(), guitar]),
    ];
    expect(findProfileShadow(profiles, 1)).toBeUndefined();
  });

  it('ignores standby lighting', () => {
    const standby = {
      ...profile('Standby', [usb(), local]),
      opts: { standbyLighting: true },
    } as proto.IProfile;
    expect(findRuleShadow([standby, profile('B', [usb(), local])], 1, 0)).toBeUndefined();
  });
});
