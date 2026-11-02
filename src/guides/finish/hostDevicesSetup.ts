import i18next from 'i18next';
import { DeviceStatusLike, getDefaultMappings } from '@/components/Defaults/defaultMappings';
import { getProfileSlotIds, moveWiiDrumNotesToMidiSlot } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';
import { truncateProfileName } from '@/components/SettingsContext/profileName';
import {
  ConfigState,
  profileInsertIndex,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { findDeviceStatus } from '../guideConfig';

// A kind of controller plugged into the board: what the profile emulates, and the slot that reads
// it. A slot only matches its own kind of controller, so each kind gets a profile of its own, used
// once for every matching controller plugged in.
export interface HostDevice {
  key: string;
  type: proto.SubType;
  slot: proto.IProfileAssignmentInfo;
  // Where its default mappings come from
  defaults: 'usbHost' | 'midiSerial' | 'wii' | 'psx' | 'bt';
  // The translation for its name, when it isn't just the kind of controller
  label?: string;
  // The translation its profile is named with, given the name, eg Wii {{name}}
  profileName?: string;
  // Wii and PS2 defaults follow the controller that's plugged in, so this says which to give
  plugged?: DeviceStatusLike;
}

const usbDevice = (type: proto.SubType): HostDevice => ({
  key: `usb-${proto.SubType[type]}`,
  type,
  slot: { usbType: type },
  defaults: 'usbHost',
});

// The controllers people plug into a USB host port
export const USB_DEVICES = [
  proto.SubType.GuitarHeroGuitar,
  proto.SubType.RockBandGuitar,
  proto.SubType.LiveGuitar,
  proto.SubType.GuitarHeroDrums,
  proto.SubType.RockBandDrums,
  proto.SubType.DjHeroTurntable,
  proto.SubType.ProKeys,
  proto.SubType.Gamepad,
].map(usbDevice);

// A USB microphone, passed through as a microphone of its own
export const USB_AUDIO_DEVICES = [usbDevice(proto.SubType.Microphone)];

// MIDI gear, through a 5-pin DIN port or plugged into the USB host port. The channels are the ones
// the MIDI defaults use: 10 for percussion, 1 for a keyboard.
export const MIDI_DRUMS: HostDevice = {
  key: 'midi-drums',
  type: proto.SubType.GuitarHeroDrums,
  slot: { midiChannel: 10 },
  defaults: 'midiSerial',
  label: 'guides.finish.hostDevices.midi.drums',
};
export const MIDI_DEVICES: HostDevice[] = [
  MIDI_DRUMS,
  {
    key: 'midi-keys',
    type: proto.SubType.ProKeys,
    slot: { midiChannel: 1 },
    defaults: 'midiSerial',
    label: 'guides.finish.hostDevices.midi.keys',
  },
  {
    key: 'midi-pro-guitar',
    type: proto.SubType.ProGuitarSquier,
    slot: { midiProGuitar: proto.SubType.ProGuitarSquier },
    defaults: 'midiSerial',
    label: 'guides.finish.hostDevices.midi.proGuitar',
  },
];

const wiiDevice = (ext: proto.WiiExtType, type: proto.SubType): HostDevice => ({
  key: `wii-${proto.WiiExtType[ext]}`,
  type,
  slot: { wiiExt: ext },
  defaults: 'wii',
  label: `wiiExt.${proto.WiiExtType[ext]}`,
  profileName: 'guides.finish.hostDevices.names.wii',
  plugged: { wiiExtType: ext },
});

// Wii extensions, through a Wii adapter
export const WII_DEVICES = [
  wiiDevice(proto.WiiExtType.WiiGuitarHeroGuitar, proto.SubType.GuitarHeroGuitar),
  wiiDevice(proto.WiiExtType.WiiGuitarHeroDrums, proto.SubType.GuitarHeroDrums),
  wiiDevice(proto.WiiExtType.WiiDjHeroTurntable, proto.SubType.DjHeroTurntable),
  wiiDevice(proto.WiiExtType.WiiTaikoNoTatsujinController, proto.SubType.Taiko),
  wiiDevice(proto.WiiExtType.WiiClassicController, proto.SubType.Gamepad),
  wiiDevice(proto.WiiExtType.WiiClassicControllerPro, proto.SubType.Gamepad),
  wiiDevice(proto.WiiExtType.WiiNunchuk, proto.SubType.Gamepad),
];

const ps2Device = (cnt: proto.PS2ControllerType, type: proto.SubType): HostDevice => ({
  key: `ps2-${proto.PS2ControllerType[cnt]}`,
  type,
  slot: { ps2Cnt: cnt },
  defaults: 'psx',
  label: `ps2Cnt.${proto.PS2ControllerType[cnt]}`,
  profileName: 'guides.finish.hostDevices.names.ps2',
  plugged: { ps2CntType: cnt },
});

// PS1 and PS2 controllers, through a PS2 adapter
export const PS2_DEVICES = [
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeGuitar, proto.SubType.GuitarHeroGuitar),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeDualshock2, proto.SubType.Gamepad),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeDualshock, proto.SubType.Gamepad),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeDigital, proto.SubType.Gamepad),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeTaiko, proto.SubType.Taiko),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypePopNMusic, proto.SubType.PopNMusic),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeGuitarFreaks, proto.SubType.GuitarFreaks),
  ps2Device(proto.PS2ControllerType.PS2ControllerTypeDrumMania, proto.SubType.DrumMania),
];

// The wireless controllers made for the Xbox 360, which reach the board through an RF module's
// receiver on the USB host port, so they're read the same as USB controllers
export const XBOX360_RF_DEVICES = USB_DEVICES.filter((device) =>
  [
    proto.SubType.GuitarHeroGuitar,
    proto.SubType.RockBandGuitar,
    proto.SubType.GuitarHeroDrums,
    proto.SubType.RockBandDrums,
    proto.SubType.ProKeys,
    proto.SubType.Gamepad,
  ].includes(device.type)
);

// The controllers that connect over Bluetooth: pads report themselves as gamepads, and instruments
// as what they are, through a Wii Remote, a PS4 / PS5 dongle-less instrument or another Santroller
export const BT_DEVICES = [
  proto.SubType.GuitarHeroGuitar,
  proto.SubType.RockBandGuitar,
  proto.SubType.LiveGuitar,
  proto.SubType.GuitarHeroDrums,
  proto.SubType.RockBandDrums,
  proto.SubType.DjHeroTurntable,
  proto.SubType.Gamepad,
].map((type): HostDevice => ({
  key: `bt-${proto.SubType[type]}`,
  type,
  slot: { bluetoothType: type },
  defaults: 'bt',
  profileName: 'guides.finish.hostDevices.names.bluetooth',
}));

const ALL_DEVICES = () => [
  ...USB_DEVICES,
  ...USB_AUDIO_DEVICES,
  ...MIDI_DEVICES,
  ...WII_DEVICES,
  ...PS2_DEVICES,
  ...BT_DEVICES,
];

const DRUM_TYPES = [proto.SubType.GuitarHeroDrums, proto.SubType.RockBandDrums];

const AUTO: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ps4OrPs5Mode: false },
};
const GAMEPAD: proto.IProfileAssignmentInfo = { usbType: proto.SubType.Gamepad };

// Whether a profile already reads this kind of controller. Any drum profile reading MIDI counts as
// the MIDI drum kit, whichever channel the MIDI DIN guide put it on.
function reads(profile: proto.IProfile, device: HostDevice) {
  const items = (profile.assignments ?? []).flatMap((list) => list.assignments ?? []);
  if (device === MIDI_DRUMS) {
    return (
      DRUM_TYPES.includes(profile.opts?.deviceToEmulate ?? proto.SubType.Gamepad) &&
      items.some((item) => item.midiChannel != null)
    );
  }
  if (device.slot.midiChannel != null) {
    return (
      profile.opts?.deviceToEmulate === device.type &&
      items.some((item) => item.midiChannel != null)
    );
  }
  return items.some(
    (item) =>
      (device.slot.usbType != null && item.usbType === device.slot.usbType) ||
      (device.slot.midiProGuitar != null && item.midiProGuitar != null) ||
      (device.slot.wiiExt != null && item.wiiExt === device.slot.wiiExt) ||
      (device.slot.ps2Cnt != null && item.ps2Cnt === device.slot.ps2Cnt) ||
      (device.slot.bluetoothType != null && item.bluetoothType === device.slot.bluetoothType)
  );
}

export function devicesWithProfiles(profiles: proto.IProfile[] | null | undefined) {
  return new Set(
    ALL_DEVICES()
      .filter((device) => (profiles ?? []).some((profile) => reads(profile, device)))
      .map((device) => device.key)
  );
}

// The MIDI drum kit's profile, if there is one
export function midiDrumsProfile(profiles: proto.IProfile[] | null | undefined) {
  return (profiles ?? []).findIndex((profile) => reads(profile, MIDI_DRUMS));
}

export function hasGamepadNavigation(profile: proto.IProfile | undefined) {
  return (profile?.assignments ?? []).some((list) =>
    (list.assignments ?? []).some((item) => item.usbType === proto.SubType.Gamepad)
  );
}

// The slot id each item of a profile's rules gets, by where it is in them
function slotIdOf(profile: proto.IProfile, wanted: proto.IProfileAssignmentInfo) {
  const ids = getProfileSlotIds(profile);
  for (const [listIdx, list] of (profile.assignments ?? []).entries()) {
    const at = (list.assignments ?? []).findIndex(
      (item) => JSON.stringify(item) === JSON.stringify(wanted)
    );
    if (at !== -1) {
      return ids[listIdx][at];
    }
  }
  return 0;
}

// Only the buttons for getting around menus come from the gamepad. A drum kit's pads already act as
// the face buttons, and the rest of a gamepad has nothing to do on a drum kit.
const NAVIGATION = new Set([
  proto.GamepadButtonType.Gamepad_Start,
  proto.GamepadButtonType.Gamepad_Back,
  proto.GamepadButtonType.Gamepad_Guide,
  proto.GamepadButtonType.Gamepad_DpadUp,
  proto.GamepadButtonType.Gamepad_DpadDown,
  proto.GamepadButtonType.Gamepad_DpadLeft,
  proto.GamepadButtonType.Gamepad_DpadRight,
]);

function navigationMappings(state: ConfigState, profile: proto.IProfile) {
  const usbHost = findDeviceStatus(state, 'usbHost');
  const type = profile.opts?.deviceToEmulate ?? proto.SubType.GuitarHeroDrums;
  return getDefaultMappings(
    'usbHost',
    type,
    slotIdOf(profile, GAMEPAD),
    usbHost,
    proto.SubType.Gamepad
  ).filter(
    (mapping) =>
      mapping.mapping?.gamepadButton != null && NAVIGATION.has(mapping.mapping.gamepadButton)
  );
}

// Lets a USB gamepad do the menus for a MIDI drum kit: a rule reading both comes first, so its
// Start, Select and d-pad work while it's plugged in, and the kit's own rule still matches without it
export function addGamepadNavigation(profileIdx: number) {
  const store = useConfigStore.getState();
  const profile = store.config.profiles?.[profileIdx];
  if (!profile || hasGamepadNavigation(profile)) {
    return;
  }
  const first = profile.assignments?.[0]?.assignments ?? [];
  const withGamepad: proto.IProfile = {
    ...profile,
    assignments: [{ assignments: [...first, GAMEPAD] }, ...(profile.assignments ?? [])],
  };
  store.updateProfile(
    {
      ...withGamepad,
      mappings: [...(profile.mappings ?? []), ...navigationMappings(store, withGamepad)],
    },
    profileIdx
  );
}

// Adds a profile for each kind of controller that doesn't have one yet, reading it from its slot,
// with that controller's default mappings
export function addHostDeviceProfiles(devices: HostDevice[]) {
  const store = useConfigStore.getState();
  const usbHost = findDeviceStatus(store, 'usbHost');
  const have = devicesWithProfiles(store.config.profiles);
  const before = store.config.profiles?.[store.currentProfile];
  // The profile being edited stays selected, unless there wasn't one, as a build that only adds a
  // driver makes none. Then the first new one is, which an adapter guide's live test reads.
  const editing =
    before && !before.opts?.standbyLighting
      ? store.currentProfile
      : profileInsertIndex(store.config.profiles);
  for (const device of devices.filter((device) => !have.has(device.key))) {
    store.addProfile();
    const { config, currentProfile } = useConfigStore.getState();
    const added = config.profiles![currentProfile];
    const label = i18next.t(device.label ?? `subType.${proto.SubType[device.type]}`);
    const rule = [AUTO, device.slot];
    const profile: proto.IProfile = {
      ...added,
      opts: {
        ...added.opts,
        name: truncateProfileName(
          device.profileName ? i18next.t(device.profileName, { name: label }) : label
        ),
        deviceToEmulate: device.type,
        setUp: true,
      },
      assignments: [{ assignments: rule }],
    };
    const slotId = slotIdOf(profile, device.slot);
    let mappings = getDefaultMappings(
      device.defaults,
      device.type,
      slotId,
      device.defaults === 'usbHost' ? usbHost : device.plugged
    );
    // Wii drum pads arrive as MIDI notes, so they go on a MIDI slot added to the rule, the same as
    // loading the defaults on the profile page does
    if (device.defaults === 'wii') {
      mappings = moveWiiDrumNotesToMidiSlot(
        [rule],
        profile.opts?.deviceSlotIdVersion ?? 0,
        slotId,
        mappings
      );
    }
    store.updateProfile({ ...profile, mappings }, currentProfile);
  }
  // New profiles go below the existing ones, so the one being edited stays where it was
  if (useConfigStore.getState().config.profiles?.[editing]) {
    useConfigStore.getState().setActiveProfile(editing.toString(), 0);
  }
}
