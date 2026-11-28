import { getInputLocalDeviceId, getInputSlotKind } from '@/components/Inputs/slotRemap';
import { proto } from './config.js';

// Devices with syncCalibration keep every mapping that reads the same input of theirs calibrated the same
// way, across every profile. An input's range (min / max, center and deadzone), its filter and its debounce
// belong to the input, so every mapping on it shares them. A button's trigger point is only shared with other
// buttons, as a whammy used as a button wants its own point, not the whammy's min. LEDs lit by the input share
// its range (min and max), which is the only calibration they have.

const SHARED_FIELDS = ['min', 'max', 'center', 'deadzone', 'filter', 'debounceMode'] as const;
const TRIGGER_FIELDS = ['digitalTrigger', 'digitalTriggerValue', 'digitalMaxTriggerValue'] as const;

// Whether an output takes an analog value, rather than being held or not. MIDI notes are buttons (which
// still take their velocity from the calibration).
export function isAxisOutput(output: proto.IOutput | null | undefined): boolean {
  if (!output) {
    return false;
  }
  return (
    output.proKeySingle != null ||
    output.midiControl != null ||
    output.midiPitchBend != null ||
    Object.entries(output).some(([key, value]) => key.endsWith('Axis') && value != null)
  );
}

// Unset fields are left out, null or undefined depending on where the object came from (decoded, the
// store, or built here), and keys come in any order, so compare without either
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => (value as Record<string, unknown>)[key] != null)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

// What identifies an input, leaving out its trigger (which is calibration)
function inputIdentity(input: proto.IInput | null | undefined): string {
  const rest: Record<string, unknown> = { ...(input ?? {}) };
  TRIGGER_FIELDS.forEach((field) => delete rest[field]);
  return JSON.stringify(canonical(rest));
}

function debounce100us(mapping: proto.IMapping) {
  return mapping.debounce100us ?? (mapping.debounce != null ? mapping.debounce * 10 : null);
}

function sharedOf(mapping: proto.IMapping) {
  return {
    ...Object.fromEntries(SHARED_FIELDS.map((field) => [field, mapping[field]])),
    debounce100us: debounce100us(mapping),
  };
}

function triggerOf(mapping: proto.IMapping) {
  return Object.fromEntries(TRIGGER_FIELDS.map((field) => [field, mapping.input?.[field]]));
}

const isButton = (mapping: proto.IMapping) => !isAxisOutput(mapping.mapping);

// Whether the device an input reads from syncs calibration. Inputs that read a device through a profile slot
// (USB, bluetooth, Wii...) don't name the device, so any device of that kind syncing counts.
export function syncsCalibration(
  devices: proto.IDevice[] | null | undefined,
  input: proto.IInput | null | undefined
): boolean {
  if (!input || !devices) {
    return false;
  }
  const slotKind = getInputSlotKind(input);
  if (slotKind) {
    return devices.some(
      (device) => device.syncCalibration && device[slotKind as keyof proto.IDevice] != null
    );
  }
  const id = getInputLocalDeviceId(input);
  return id != null && devices.some((device) => device.deviceid === id && device.syncCalibration);
}

// target calibrated as source is: everything shared, and the trigger point when both are buttons. The same
// object when nothing changes.
export function calibrateLike(target: proto.IMapping, source: proto.IMapping): proto.IMapping {
  const next: proto.IMapping = {
    ...target,
    ...sharedOf(source),
    debounce: null,
  };
  if (isButton(target) && isButton(source)) {
    next.input = { ...target.input, ...triggerOf(source) };
  }
  return same(next, target) ? target : next;
}

type Range = { min?: number | null; max?: number | null };

const ledInputOf = (led: proto.ILed) => led.mapping?.inputMapping?.input;
const rangeOf = (item: Range): Range => ({ min: item.min, max: item.max });

// An LED lit by an input, with the input's range (which is all the calibration it has). The same object when
// nothing changes.
function ledWithRange(led: proto.ILed, range: Range): proto.ILed {
  const inputMapping = led.mapping.inputMapping!;
  if (same(rangeOf(inputMapping), range)) {
    return led;
  }
  return { ...led, mapping: { ...led.mapping, inputMapping: { ...inputMapping, ...range } } };
}

function mappingWithRange(mapping: proto.IMapping, range: Range): proto.IMapping {
  return same(rangeOf(mapping), range) ? mapping : { ...mapping, ...range };
}

// What calibration is kept in step: mappings, and LEDs lit by an input
type Item = { profile: number; index: number; led: boolean };

function replaceItem(
  profiles: proto.IProfile[],
  item: Item,
  value: proto.IMapping | proto.ILed
): proto.IProfile[] {
  return profiles.map((profile, i) => {
    if (i !== item.profile) {
      return profile;
    }
    return item.led
      ? {
          ...profile,
          leds: profile.leds?.map((l, j) => (j === item.index ? (value as proto.ILed) : l)),
        }
      : {
          ...profile,
          mappings: profile.mappings?.map((m, j) =>
            j === item.index ? (value as proto.IMapping) : m
          ),
        };
  });
}

// Everything on the input identity, apart from item
function others(profiles: proto.IProfile[], identity: string, item: Item) {
  const isItem = (i: number, j: number, led: boolean) =>
    i === item.profile && j === item.index && led === item.led;
  return {
    mappings: profiles.flatMap((profile, i) =>
      (profile.mappings ?? []).flatMap((mapping, j) =>
        !isItem(i, j, false) && inputIdentity(mapping.input) === identity
          ? [{ item: { profile: i, index: j, led: false }, mapping }]
          : []
      )
    ),
    leds: profiles.flatMap((profile, i) =>
      (profile.leds ?? []).flatMap((led, j) =>
        !isItem(i, j, true) && ledInputOf(led) && inputIdentity(ledInputOf(led)) === identity
          ? [{ item: { profile: i, index: j, led: true }, led }]
          : []
      )
    ),
  };
}

// Everything else on the same input as item, calibrated like it. An LED only has the range to give, and
// only takes the range.
function push(profiles: proto.IProfile[], item: Item) {
  const source = item.led
    ? profiles[item.profile].leds![item.index].mapping.inputMapping!
    : profiles[item.profile].mappings![item.index];
  const sourceMapping = item.led ? undefined : (source as proto.IMapping);
  const range = rangeOf(source);
  const { mappings, leds } = others(profiles, inputIdentity(source.input), item);
  let next = profiles;
  mappings.forEach(({ item: other, mapping }) => {
    const updated = sourceMapping
      ? calibrateLike(mapping, sourceMapping)
      : mappingWithRange(mapping, range);
    if (updated !== mapping) {
      next = replaceItem(next, other, updated);
    }
  });
  leds.forEach(({ item: other, led }) => {
    const updated = ledWithRange(led, range);
    if (updated !== led) {
      next = replaceItem(next, other, updated);
    }
  });
  return next;
}

// item calibrated like something else on its input: a mapping where there is one (a button, for a button,
// where there is one), otherwise an LED's range
function pull(profiles: proto.IProfile[], item: Item) {
  const target = item.led
    ? profiles[item.profile].leds![item.index]
    : profiles[item.profile].mappings![item.index];
  const input = item.led ? ledInputOf(target as proto.ILed) : (target as proto.IMapping).input;
  const { mappings, leds } = others(profiles, inputIdentity(input), item);
  const mappingSource =
    (!item.led &&
      mappings.find(({ mapping }) => isButton(mapping) === isButton(target as proto.IMapping))) ||
    mappings[0];
  const range = mappingSource
    ? rangeOf(mappingSource.mapping)
    : leds[0]
      ? rangeOf(leds[0].led.mapping.inputMapping!)
      : undefined;
  let updated: proto.IMapping | proto.ILed = target;
  if (item.led) {
    updated = range ? ledWithRange(target as proto.ILed, range) : target;
  } else if (mappingSource) {
    updated = calibrateLike(target as proto.IMapping, mappingSource.mapping);
  } else if (range) {
    updated = mappingWithRange(target as proto.IMapping, range);
  }
  return updated === target ? profiles : replaceItem(profiles, item, updated);
}

// After profiles[profileIdx] was edited from before: a mapping or LED on a synced input whose calibration
// changed takes everything else on it along, and one that just moved onto a synced input (or was added)
// takes the calibration the input already has. They're matched up by position, so when mappings (or LEDs)
// were added or removed, they all count as new. Returns the profiles, or the same array when nothing changed.
export function syncEditedCalibrations(
  devices: proto.IDevice[],
  before: proto.IProfile | undefined,
  profiles: proto.IProfile[],
  profileIdx: number
): proto.IProfile[] {
  let next = profiles;
  const previous = before?.mappings ?? [];
  const mappingsMatched = previous.length === (profiles[profileIdx].mappings ?? []).length;
  (profiles[profileIdx].mappings ?? []).forEach((mapping, i) => {
    if (!syncsCalibration(devices, mapping.input)) {
      return;
    }
    const item = { profile: profileIdx, index: i, led: false };
    const old = mappingsMatched ? previous[i] : undefined;
    if (old && inputIdentity(old.input) === inputIdentity(mapping.input)) {
      if (
        !same(sharedOf(old), sharedOf(mapping)) ||
        (isButton(mapping) && !same(triggerOf(old), triggerOf(mapping)))
      ) {
        next = push(next, item);
      }
    } else {
      next = pull(next, item);
    }
  });
  const previousLeds = before?.leds ?? [];
  const ledsMatched = previousLeds.length === (profiles[profileIdx].leds ?? []).length;
  (profiles[profileIdx].leds ?? []).forEach((led, i) => {
    const input = ledInputOf(led);
    if (!input || !syncsCalibration(devices, input)) {
      return;
    }
    const item = { profile: profileIdx, index: i, led: true };
    const old = ledsMatched ? previousLeds[i].mapping?.inputMapping : undefined;
    if (old && inputIdentity(old.input) === inputIdentity(input)) {
      if (!same(rangeOf(old), rangeOf(led.mapping.inputMapping!))) {
        next = push(next, item);
      }
    } else {
      next = pull(next, item);
    }
  });
  return next;
}

// Lines up the calibration of everything on each synced input of the device, from the first mapping on it
// (or the first LED, for inputs only LEDs use), for when the device starts syncing
export function unifyCalibrations(
  devices: proto.IDevice[],
  profiles: proto.IProfile[],
  deviceid: number
): proto.IProfile[] {
  const device = devices.find((d) => d.deviceid === deviceid);
  if (!device) {
    return profiles;
  }
  const seen = new Set<string>();
  let next = profiles;
  const unify = (input: proto.IInput | null | undefined, item: Item) => {
    const identity = inputIdentity(input);
    if (!input || seen.has(identity) || !syncsCalibration([device], input)) {
      return;
    }
    seen.add(identity);
    next = push(next, item);
  };
  profiles.forEach((profile, i) =>
    profile.mappings?.forEach((mapping, j) =>
      unify(mapping.input, { profile: i, index: j, led: false })
    )
  );
  profiles.forEach((profile, i) =>
    profile.leds?.forEach((led, j) => unify(ledInputOf(led), { profile: i, index: j, led: true }))
  );
  return next;
}
