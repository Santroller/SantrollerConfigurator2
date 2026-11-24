import { proto } from '@/components/SettingsContext/config';

// What a rule takes when it's used, so a rule further down that needs the same thing can't have it:
// the board's own inputs, connected controllers (a profile is loaded again for each one that
// matches, so it takes all of them), and the outputs that only one profile can use per boot
export type ShadowReason = 'localInputs' | 'devices' | 'output';

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
// USB isn't here, as each profile gets its own interfaces on it
const EXCLUSIVE_OUTPUTS: (keyof proto.IProfileAssignmentInfo)[] = [
  'bluetooth',
  'ps2Emulation',
  'wiiEmulation',
  'joybusEmulation',
  'snesEmulation',
];

function reasonFor(info: proto.IProfileAssignmentInfo): ShadowReason | undefined {
  if (info.localInputs != null) {
    return 'localInputs';
  }
  if (DEVICE_TYPES.some((type) => info[type] != null)) {
    return 'devices';
  }
  if (EXCLUSIVE_OUTPUTS.some((type) => info[type] != null)) {
    return 'output';
  }
  return undefined;
}

// Items that match in the same situations get the same key. Xbox One auth doesn't decide whether a
// rule matches, so it has none
function matchKey(info: proto.IProfileAssignmentInfo): string | undefined {
  if (info.xboxOneAuth != null) {
    return undefined;
  }
  // Only the console it waits for changes when it matches, not the mode it forces or its options
  if (info.consoleType != null) {
    return `usb:${info.consoleType.consoleType ?? 'any'}`;
  }
  return JSON.stringify(
    proto.ProfileAssignmentInfo.toObject(proto.ProfileAssignmentInfo.fromObject(info))
  );
}

interface RuleKeys {
  keys: Map<string, ShadowReason | undefined>;
}

function ruleKeys(list: proto.IProfileAssignment): RuleKeys | undefined {
  const keys = new Map<string, ShadowReason | undefined>();
  for (const info of list.assignments ?? []) {
    const key = matchKey(info);
    if (key !== undefined) {
      keys.set(key, reasonFor(info));
    }
  }
  // An empty rule never matches, so it can't be used ahead of anything
  return keys.size ? { keys } : undefined;
}

const isSubset = (a: RuleKeys, b: RuleKeys) => [...a.keys.keys()].every((key) => b.keys.has(key));

export interface RuleShadow {
  // The rule that's used instead
  profileIdx: number;
  listIdx: number;
  // Unset when it's an earlier rule in the same profile, as a profile only uses its first match
  reason?: ShadowReason;
}

/**
 * The rule further up that is always used whenever this one would match, so this one never is.
 * Only certain cases are reported: the earlier rule needs nothing this one doesn't, and it takes
 * something this one needs.
 */
export function findRuleShadow(
  profiles: proto.IProfile[],
  profileIdx: number,
  listIdx: number
): RuleShadow | undefined {
  const profile = profiles[profileIdx];
  const list = profile?.assignments?.[listIdx];
  if (!profile || !list || profile.opts?.standbyLighting) {
    return undefined;
  }
  const rule = ruleKeys(list);
  if (!rule) {
    return undefined;
  }

  const lists = profile.assignments ?? [];
  for (let i = 0; i < listIdx; i++) {
    const earlier = ruleKeys(lists[i]);
    if (earlier && isSubset(earlier, rule)) {
      return { profileIdx, listIdx: i };
    }
  }

  for (let p = 0; p < profileIdx; p++) {
    const other = profiles[p];
    if (other.opts?.standbyLighting) {
      continue;
    }
    const otherRules = (other.assignments ?? []).map(ruleKeys);
    for (let k = 0; k < otherRules.length; k++) {
      const earlier = otherRules[k];
      if (!earlier || !isSubset(earlier, rule)) {
        continue;
      }
      // The other profile matches whenever this rule would. It takes something this rule needs
      // if every rule of it that could be used first takes it too
      for (const [key, reason] of earlier.keys) {
        if (reason && otherRules.slice(0, k).every((prior) => !prior || prior.keys.has(key))) {
          return { profileIdx: p, listIdx: k, reason };
        }
      }
    }
  }
  return undefined;
}

/**
 * Where to move a profile so a rule of it that another profile blocks gets used: the lowest spot with
 * nothing above it that blocks it, which keeps the order of everything else as it was. The top
 * always works, as a profile can't block itself out completely.
 */
export function unshadowedPosition(
  profiles: proto.IProfile[],
  profileIdx: number,
  listIdx: number
): number {
  for (let to = profileIdx - 1; to > 0; to--) {
    const moved = [...profiles];
    moved.splice(to, 0, ...moved.splice(profileIdx, 1));
    const shadow = findRuleShadow(moved, to, listIdx);
    if (!shadow || shadow.profileIdx === to) {
      return to;
    }
  }
  return 0;
}

/** The same for a rule blocked by one further up in its own profile: where to move the rule to */
export function unshadowedRulePosition(
  profiles: proto.IProfile[],
  profileIdx: number,
  listIdx: number
): number {
  const profile = profiles[profileIdx];
  for (let to = listIdx - 1; to > 0; to--) {
    const assignments = [...(profile.assignments ?? [])];
    assignments.splice(to, 0, ...assignments.splice(listIdx, 1));
    const moved = [...profiles];
    moved[profileIdx] = { ...profile, assignments };
    if (findRuleShadow(moved, profileIdx, to)?.profileIdx !== profileIdx) {
      return to;
    }
  }
  return 0;
}

/** Whether every rule of the profile is shadowed, returning the first that is used instead */
export function findProfileShadow(
  profiles: proto.IProfile[],
  profileIdx: number
): RuleShadow | undefined {
  const lists = profiles[profileIdx]?.assignments ?? [];
  let first: RuleShadow | undefined;
  for (let i = 0; i < lists.length; i++) {
    if (!ruleKeys(lists[i])) {
      continue;
    }
    const shadow = findRuleShadow(profiles, profileIdx, i);
    if (!shadow) {
      return undefined;
    }
    // A rule hidden by one in its own profile has the same fate as that one
    if (shadow.profileIdx !== profileIdx) {
      first ??= shadow;
    }
  }
  return first;
}
