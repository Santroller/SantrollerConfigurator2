import { proto } from '@/components/SettingsContext/config';
import { swapFaceButtonInputs } from '@/components/SettingsContext/faceButtonSwap';
import { remapMappingsForSubType } from '@/components/SettingsContext/subTypeMappings';
import {
  getProfileSlotIds,
  getProfileSlotKey,
  getProfileSlots,
  getSlotDeviceKind,
  getSlotKeyType,
  getSlotSubtype,
  ProfileSlot,
} from './inputRegistry';
import { remapProfileSlotInputs } from './slotRemap';

export type CopyItems = { mappings?: number[]; leds?: number[] };

// What each slot the copied items read becomes in the target: a target slot id, or null to leave
// out the items that read it. Keyed by getProfileSlotKey in the source profile.
export type SlotChoices = Map<string, number | null>;

// Copies, so fitting them to the target never touches the source's
function pickItems(profile: proto.IProfile, items: CopyItems): proto.IProfile {
  return {
    opts: profile.opts,
    mappings: (items.mappings ?? []).flatMap((idx) =>
      profile.mappings?.[idx]
        ? [proto.Mapping.decode(proto.Mapping.encode(profile.mappings[idx]).finish())]
        : []
    ),
    leds: (items.leds ?? []).flatMap((idx) =>
      profile.leds?.[idx] ? [proto.Led.decode(proto.Led.encode(profile.leds[idx]).finish())] : []
    ),
  };
}

// The slot keys (getProfileSlotKey) a profile's mappings and LEDs read
function slotKeysRead(profile: proto.IProfile): Set<string> {
  const keys = new Set<string>();
  remapProfileSlotInputs(profile, (kind, slotId) => {
    keys.add(getProfileSlotKey(kind, slotId));
    return slotId;
  });
  return keys;
}

// The slots of the source profile that the copied items read, in the order the source lists them.
// Inputs reading a slot the source doesn't have are already broken, and are copied as they are.
export function getCopiedSlots(
  source: proto.IProfile,
  items: CopyItems,
  t?: (key: string) => string
): ProfileSlot[] {
  const read = slotKeysRead(pickItems(source, items));
  return getProfileSlots(source, t).filter((slot) => read.has(slot.key));
}

// What tells each slot apart across profiles, keyed by getProfileSlotKey: its kind, type and which
// one of that kind and type it is within its list, as remapEditedSlotIds follows slots by
function slotIdentities(profile: proto.IProfile): Map<string, string> {
  const version = profile.opts?.deviceSlotIdVersion ?? 0;
  const ids = getProfileSlotIds(profile);
  const identities = new Map<string, string>();
  (profile.assignments ?? []).forEach((list, i) => {
    const counts = new Map<string, number>();
    (list.assignments ?? []).forEach((item, j) => {
      const kind = getSlotDeviceKind(item);
      if (!kind) {
        return;
      }
      const type = getSlotKeyType(item, version);
      const n = (counts.get(`${kind}:${type}`) ?? 0) + 1;
      counts.set(`${kind}:${type}`, n);
      const key = getProfileSlotKey(kind, ids[i][j]);
      if (!identities.has(key)) {
        identities.set(key, `${kind}:${type}:${n}`);
      }
    });
  });
  return identities;
}

// The target slot each copied slot most likely means: the same kind, type and n, then the first
// slot of the same kind and subtype. Slots with no match are left out (null), as reading a
// different type of device would read the wrong inputs.
export function defaultSlotChoices(
  source: proto.IProfile,
  target: proto.IProfile,
  slots: ProfileSlot[]
): SlotChoices {
  const sourceIds = slotIdentities(source);
  const targetByIdentity = new Map(
    [...slotIdentities(target)].map(([key, identity]) => [identity, key])
  );
  const targetSlots = getProfileSlots(target);
  return new Map(
    slots.map((slot) => {
      const identity = sourceIds.get(slot.key);
      const sameKey = identity ? targetByIdentity.get(identity) : undefined;
      const match =
        targetSlots.find((x) => x.key === sameKey) ??
        targetSlots.find(
          (x) =>
            x.deviceKind === slot.deviceKind && getSlotSubtype(x.item) === getSlotSubtype(slot.item)
        );
      return [slot.key, match ? match.slotId : null];
    })
  );
}

export type CopyResult = {
  profile: proto.IProfile;
  mappings: number;
  leds: number;
  // Left out as they read a slot that was left out
  skipped: number;
  // Instrument outputs the target's device type can't send
  dropped: number;
};

// Appends copies of the source's selected mappings and LEDs to the target, moved onto the slots in
// `choices`, and fitted to the target's device type and face button mode
export function copyItemsToProfile(
  source: proto.IProfile,
  target: proto.IProfile,
  items: CopyItems,
  choices: SlotChoices
): CopyResult {
  const picked = pickItems(source, items);
  const left = (fragment: proto.IProfile) =>
    [...slotKeysRead(fragment)].some((key) => choices.get(key) === null);
  const remap = (fragment: proto.IProfile) =>
    remapProfileSlotInputs(fragment, (kind, slotId) => {
      const choice = choices.get(getProfileSlotKey(kind, slotId));
      return choice ?? slotId;
    });
  const keptMappings = picked.mappings!.filter((m) => !left({ opts: source.opts, mappings: [m] }));
  const keptLeds = picked.leds!.filter((led) => !left({ opts: source.opts, leds: [led] }));
  const moved = remap({ opts: source.opts, mappings: keptMappings, leds: keptLeds });

  let mappings = moved.mappings ?? [];
  // Left unset, it's the proto's default of legend based
  const faceMode = (profile: proto.IProfile) =>
    profile.opts?.faceButtonMappingMode ?? proto.FaceButtonMappingMode.LegendBased;
  if (faceMode(source) !== faceMode(target)) {
    mappings = mappings.map(swapFaceButtonInputs);
  }
  const fitted =
    remapMappingsForSubType(source.opts?.deviceToEmulate, { opts: target.opts, mappings }) ?? [];
  const leds = moved.leds ?? [];
  return {
    profile: {
      ...target,
      mappings: [...(target.mappings ?? []), ...fitted],
      leds: [...(target.leds ?? []), ...leds],
    },
    mappings: fitted.length,
    leds: leds.length,
    skipped:
      picked.mappings!.length - keptMappings.length + (picked.leds!.length - keptLeds.length),
    dropped: mappings.length - fitted.length,
  };
}
