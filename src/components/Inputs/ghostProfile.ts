import { isTarget } from '@/components/SettingsContext/assignmentTargets';
import { proto } from '@/components/SettingsContext/config';
import { getInputSlotKind } from './slotRemap';

// What makes a rule wait for a controller to be connected
const DEVICE_TYPES: (keyof proto.IProfileAssignmentInfo)[] = [
  'wiiExt',
  'ps2Cnt',
  'snesCnt',
  'joybusCnt',
  'usbType',
  'usbDevice',
  'bluetoothType',
  'bluetoothDevice',
  'midiChannel',
  'midiProGuitar',
];

const waitsForDevice = (list: proto.IProfileAssignment) =>
  (list.assignments ?? []).some((info) => DEVICE_TYPES.some((type) => info[type] != null));

// A rule with only an output (and maybe Xbox One auth) matches whenever that output is there, with no
// controller, held button or local inputs needed
const alwaysMatches = (list: proto.IProfileAssignment) => {
  const assignments = list.assignments ?? [];
  return (
    assignments.some(isTarget) &&
    assignments.every((info) => isTarget(info) || info.xboxOneAuth != null)
  );
};

const isAdapterProfile = (profile: proto.IProfile) =>
  (profile.assignments ?? []).some(waitsForDevice);

// An input on the board itself that's actually set up. Adapter inputs (USB host, Wii, MIDI...) don't
// count, as a profile without a rule for their controller doesn't get one, and neither do pins never
// picked or fixed values
const isConfiguredLocalInput = (input: proto.IInput) =>
  !getInputSlotKind(input) && !input.fixed && !(input.gpio && (input.gpio.pin ?? -1) < 0);

/**
 * On an adapter, where every other profile waits for its controller, a profile that is always used
 * anyway shows up to the console as an extra controller next to the real one. When it has none of
 * the board's own inputs set up either (eg the drum profile from first setup, left with every pin
 * unpicked), that controller never does anything, and games can pick it over the real one.
 */
export function isGhostProfile(profiles: proto.IProfile[], profileIdx: number): boolean {
  const profile = profiles[profileIdx];
  if (!profile || profile.opts?.standbyLighting) {
    return false;
  }
  const lists = profile.assignments ?? [];
  if (lists.some(waitsForDevice) || !lists.some(alwaysMatches)) {
    return false;
  }
  if (
    (profile.mappings ?? []).some(
      (mapping) => mapping.input && isConfiguredLocalInput(mapping.input)
    )
  ) {
    return false;
  }
  const others = profiles.filter((other, i) => i !== profileIdx && !other.opts?.standbyLighting);
  return others.length >= 2 && others.every(isAdapterProfile);
}

/** The rules of a ghost profile that make it always used, for warning on in the rule editor */
export function isGhostRule(
  profiles: proto.IProfile[],
  profileIdx: number,
  listIdx: number
): boolean {
  const list = profiles[profileIdx]?.assignments?.[listIdx];
  return !!list && alwaysMatches(list) && isGhostProfile(profiles, profileIdx);
}
