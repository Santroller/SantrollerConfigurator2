import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proto } from '@/components/SettingsContext/config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
});

await import('@/i18n/config');
const { DeviceStatus, initialConfig, useConfigStore } =
  await import('@/components/SettingsContext/SettingsContext');
const {
  addGamepadNavigation,
  addHostDeviceProfiles,
  BT_DEVICES,
  devicesWithProfiles,
  MIDI_DEVICES,
  midiDrumsProfile,
  USB_DEVICES,
  PS2_DEVICES,
  WII_DEVICES,
} = await import('./hostDevicesSetup');

const AUTO: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ps4OrPs5Mode: false },
};
const GAMEPAD: proto.IProfileAssignmentInfo = { usbType: proto.SubType.Gamepad };

const profile = (
  name: string,
  type: proto.SubType,
  rule: proto.IProfileAssignmentInfo[]
): proto.IProfile => ({
  opts: {
    uid: name.length,
    name,
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceToEmulate: type,
  },
  assignments: [{ assignments: rule }],
  mappings: [],
  leds: [],
});

// What the build guides leave: a gamepad reading the USB port, and the MIDI DIN guide's drum kit,
// which it may have moved to another channel
const gamepad = profile('USB Controller', proto.SubType.Gamepad, [AUTO, GAMEPAD]);
const drums = profile('Drums', proto.SubType.GuitarHeroDrums, [AUTO, { midiChannel: 3 }]);
const usbHost: proto.IDevice = {
  deviceid: 1,
  usbHost: {
    firstPin: 2,
    dmFirst: false,
    enable5v: false,
    mappingMode: proto.MappingMode.PerInput,
  },
};

const profiles = () => useConfigStore.getState().config.profiles ?? [];
const device = (key: string) =>
  [...USB_DEVICES, ...MIDI_DEVICES, ...WII_DEVICES, ...PS2_DEVICES, ...BT_DEVICES].find(
    (d) => d.key === key
  )!;

describe('profiles for plugged in controllers', () => {
  beforeEach(() => {
    useConfigStore.setState({
      ...initialConfig,
      config: proto.Config.create({ profiles: [gamepad, drums], devices: [usbHost] }),
      deviceStatus: { 1: new DeviceStatus('1', 'usbHost', usbHost) },
      currentProfile: 0,
      // nothing to save to
      saveConfig: () => Promise.resolve(false),
    });
  });

  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  it('finds the kinds that already have a profile, the drum kit on any channel', () => {
    expect([...devicesWithProfiles(profiles())]).toEqual(['usb-Gamepad', 'midi-drums']);
    expect(midiDrumsProfile(profiles())).toBe(1);
  });

  it('adds a profile for each new kind, with its slot and default mappings', () => {
    addHostDeviceProfiles([
      device('usb-GuitarHeroGuitar'),
      device('usb-Gamepad'),
      device('midi-keys'),
      device('midi-pro-guitar'),
    ]);
    // The gamepad already had one
    const [, , guitar, keys, proGuitar] = profiles();
    expect(profiles()).toHaveLength(5);
    expect(guitar.opts?.deviceToEmulate).toBe(proto.SubType.GuitarHeroGuitar);
    expect(guitar.assignments).toEqual([
      { assignments: [AUTO, { usbType: proto.SubType.GuitarHeroGuitar }] },
    ]);
    expect(guitar.mappings?.length).toBeGreaterThan(0);
    expect(guitar.mappings?.every((m) => (m.input?.usbButton ?? m.input?.usbAxis) != null)).toBe(
      true
    );

    expect(keys.opts?.name).toBe('MIDI keyboard (Pro Keys)');
    expect(keys.assignments).toEqual([{ assignments: [AUTO, { midiChannel: 1 }] }]);
    expect(keys.mappings?.length).toBeGreaterThan(0);
    expect(keys.mappings?.every((m) => m.input?.midi != null)).toBe(true);

    expect(proGuitar.opts?.deviceToEmulate).toBe(proto.SubType.ProGuitarSquier);
    expect(proGuitar.mappings?.length).toBeGreaterThan(0);
    // The profile being edited stays the same
    expect(useConfigStore.getState().currentProfile).toBe(0);
  });

  it('lets a USB gamepad do the menus for the drum kit, once', () => {
    addGamepadNavigation(1);
    addGamepadNavigation(1);
    const kit = profiles()[1];
    // Kit and gamepad first, then the kit on its own
    expect(kit.assignments).toEqual([
      { assignments: [AUTO, { midiChannel: 3 }, GAMEPAD] },
      { assignments: [AUTO, { midiChannel: 3 }] },
    ]);
    const buttons = kit.mappings?.map((m) => m.mapping?.gamepadButton);
    expect(buttons).toContain(proto.GamepadButtonType.Gamepad_Start);
    expect(buttons).toContain(proto.GamepadButtonType.Gamepad_DpadUp);
    // Only menu buttons, read from the gamepad
    expect(buttons).not.toContain(proto.GamepadButtonType.Gamepad_A);
    expect(kit.mappings?.every((m) => m.input?.usbButton != null)).toBe(true);
  });

  it('adds profiles for adapter controllers, mapped for the kind ticked', () => {
    const wiiGuitar = { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar };
    // The Wii adapter guide has set up the guitar
    useConfigStore.setState({
      config: proto.Config.create({
        profiles: [profile('Guitar', proto.SubType.GuitarHeroGuitar, [AUTO, wiiGuitar])],
      }),
    });
    expect(devicesWithProfiles(profiles()).has('wii-WiiGuitarHeroGuitar')).toBe(true);

    addHostDeviceProfiles([
      device('wii-WiiGuitarHeroGuitar'),
      device('wii-WiiGuitarHeroDrums'),
      device('ps2-PS2ControllerTypeDualshock2'),
    ]);
    const [, drums, dualshock] = profiles();
    expect(profiles()).toHaveLength(3);
    expect(drums.opts?.name).toBe('Wii Guitar Hero Drums');
    // Its pads arrive as MIDI notes, so the rule gets a MIDI slot for them
    expect(drums.assignments?.[0].assignments).toContainEqual({ midiChannel: 10 });
    expect(drums.mappings?.some((m) => m.input?.midi != null)).toBe(true);
    expect(drums.mappings?.some((m) => m.input?.wiiButton != null)).toBe(true);

    expect(dualshock.opts?.name).toBe('PS2 DualShock 2');
    expect(dualshock.opts?.deviceToEmulate).toBe(proto.SubType.Gamepad);
    expect(dualshock.mappings?.length).toBeGreaterThan(0);
    expect(dualshock.mappings?.every((m) => m.input?.ps2Button ?? m.input?.ps2Axis)).toBeTruthy();
  });

  it('selects the first new profile when there was none, for the adapter guide to test', () => {
    // An adapter build only adds the driver, so there's no profile yet
    useConfigStore.setState({ config: proto.Config.create({ profiles: [] }), currentProfile: 0 });
    addHostDeviceProfiles([device('wii-WiiGuitarHeroGuitar'), device('wii-WiiNunchuk')]);
    expect(profiles().map((p) => p.opts?.name)).toEqual(['Wii Guitar Hero Guitar', 'Wii Nunchuk']);
    expect(useConfigStore.getState().currentProfile).toBe(0);
  });

  it('adds profiles for Bluetooth controllers, read by the kind they report', () => {
    useConfigStore.setState({ config: proto.Config.create({ profiles: [] }), currentProfile: 0 });
    addHostDeviceProfiles([device('bt-GuitarHeroGuitar')]);
    const [guitar] = profiles();
    expect(guitar.opts?.name).toBe('Bluetooth Guitar Hero Guitar');
    expect(guitar.assignments).toEqual([
      { assignments: [AUTO, { bluetoothType: proto.SubType.GuitarHeroGuitar }] },
    ]);
    expect(guitar.mappings?.length).toBeGreaterThan(0);
    expect(guitar.mappings?.every((m) => (m.input?.btButton ?? m.input?.btAxis) != null)).toBe(
      true
    );
    expect(devicesWithProfiles(profiles()).has('bt-GuitarHeroGuitar')).toBe(true);
  });
});
