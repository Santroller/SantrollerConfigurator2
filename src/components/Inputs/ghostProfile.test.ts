import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { isGhostProfile, isGhostRule } from './ghostProfile';

const usb: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true },
};
const usbDrums: proto.IProfileAssignmentInfo = { usbType: proto.SubType.GuitarHeroDrums };
const wiiDrums: proto.IProfileAssignmentInfo = { wiiExt: proto.WiiExtType.WiiGuitarHeroDrums };
const usbGuitar: proto.IProfileAssignmentInfo = { usbType: proto.SubType.GuitarHeroGuitar };
const local: proto.IProfileAssignmentInfo = { localInputs: {} };
const held: proto.IProfileAssignmentInfo = {
  input: { input: { gpio: { pin: 3, pinMode: proto.PinMode.PullUp, analog: false } } },
};

const usbPad: proto.IMapping = {
  mapping: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
  input: {
    usbAxis: {
      deviceid: 1,
      axis: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
    },
  },
};
const gpioButton: proto.IMapping = {
  mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
  input: { gpio: { pin: 4, pinMode: proto.PinMode.PullUp, analog: false } },
};

const profile = (
  name: string,
  mappings: proto.IMapping[],
  ...rules: proto.IProfileAssignmentInfo[][]
): proto.IProfile =>
  ({
    opts: { name },
    assignments: rules.map((assignments) => ({ assignments })),
    mappings,
  }) as proto.IProfile;

const adapterProfiles = () => [
  profile('Guitar', [usbPad], [usb, usbGuitar]),
  profile('Wii Drums', [usbPad], [usb, wiiDrums]),
];

const unpickedPad: proto.IMapping = {
  mapping: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
  input: { gpio: { pin: -1, pinMode: proto.PinMode.PullUp, analog: true } },
};

describe('ghost profiles', () => {
  it('reports the profile from first setup left with no pins picked', () => {
    // a USB host / Wii adapter that kept its first setup drum profile: the 360 saw a second kit
    const profiles = [profile('wii/usb host', [unpickedPad], [usb]), ...adapterProfiles()];
    expect(isGhostProfile(profiles, 0)).toBe(true);
  });

  it('warns on the rules that keep it in use', () => {
    const profiles = [
      profile('wii/usb host', [unpickedPad], [usb, held], [usb]),
      ...adapterProfiles(),
    ];
    expect(isGhostRule(profiles, 0, 0)).toBe(false);
    expect(isGhostRule(profiles, 0, 1)).toBe(true);
    expect(isGhostRule(profiles, 1, 0)).toBe(false);
  });

  it('reports an adapter profile that lost its controller from its rule', () => {
    const profiles = [...adapterProfiles(), profile('Drums', [usbPad], [usb])];
    expect(isGhostProfile(profiles, 2)).toBe(true);
    expect(isGhostProfile(profiles, 0)).toBe(false);
  });

  it('is fine once the rule waits for its controller again', () => {
    const profiles = [...adapterProfiles(), profile('Drums', [usbPad], [usb, usbDrums])];
    expect(isGhostProfile(profiles, 2)).toBe(false);
  });

  it('leaves a profile for the board’s own inputs alone', () => {
    expect(
      isGhostProfile([...adapterProfiles(), profile('Built in', [gpioButton], [usb])], 2)
    ).toBe(false);
    expect(
      isGhostProfile([...adapterProfiles(), profile('Built in', [usbPad], [usb, local])], 2)
    ).toBe(false);
  });

  it('leaves a profile picked with a held button alone', () => {
    expect(isGhostProfile([...adapterProfiles(), profile('Held', [usbPad], [usb, held])], 2)).toBe(
      false
    );
  });

  it('needs most of the config to be adapter profiles', () => {
    // one adapter profile isn't enough to call it an adapter
    expect(
      isGhostProfile(
        [profile('Guitar', [usbPad], [usb, usbGuitar]), profile('Drums', [usbPad], [usb])],
        1
      )
    ).toBe(false);
    // and another profile without a controller means it's not the odd one out
    expect(
      isGhostProfile(
        [
          ...adapterProfiles(),
          profile('Pad', [gpioButton], [usb]),
          profile('Drums', [usbPad], [usb]),
        ],
        3
      )
    ).toBe(false);
  });

  it('ignores standby lighting', () => {
    const standby = {
      ...profile('Drums', [usbPad], [usb]),
      opts: { name: 'Standby', standbyLighting: true },
    };
    expect(isGhostProfile([...adapterProfiles(), standby as proto.IProfile], 2)).toBe(false);
  });
});
