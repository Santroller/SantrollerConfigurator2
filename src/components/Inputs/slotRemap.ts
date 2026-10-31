import { getOutputSubType } from '@/components/Defaults/defaultMappings';
import { proto } from '@/components/SettingsContext/config';
import {
  getInputDeviceId,
  getProfileSlotIds,
  getProfileWideSlotIds,
  getSlotDeviceKind,
  getSlotKeyType,
  getSlotSubtype,
  SLOT_ID_VERSION_LATEST,
  SLOT_UNTYPED,
} from './inputRegistry';

// Slot ids are profile-local, not ids in deviceStatus, even when the numbers coincide.
export function getInputLocalDeviceId(input: proto.IInput): number | undefined {
  return getInputSlotKind(input) || input.midi ? undefined : getInputDeviceId(input);
}

// The slot kind an input reads from, for inputs that read a device through a profile slot
export function getInputSlotKind(input: proto.IInput): string | undefined {
  if (input.usbAxis || input.usbButton || input.key || input.mouseAxis || input.mouseButton) {
    return 'usbHost';
  }
  if (input.btAxis || input.btButton) {
    return 'bt';
  }
  if (input.ps2Axis || input.ps2Button) {
    return 'psx';
  }
  if (input.wiiAxis || input.wiiButton) {
    return 'wii';
  }
  if (input.snesAxis || input.snesButton) {
    return 'snes';
  }
  if (input.joybusAxis || input.joybusButton) {
    return 'joybus';
  }
  switch (input.midi?.sourceType) {
    case proto.MidiInputSourceType.MidiInputSourceType_MIDI:
      return 'midi';
    case proto.MidiInputSourceType.MidiInputSourceType_USB:
      return 'usbHost';
    case proto.MidiInputSourceType.MidiInputSourceType_Bluetooth:
      return 'bt';
    case proto.MidiInputSourceType.MidiInputSourceType_Wii:
      return 'wii';
    default:
      return undefined;
  }
}

const SLOT_INPUT_KINDS = [
  'usbAxis',
  'usbButton',
  'key',
  'mouseAxis',
  'mouseButton',
  'btAxis',
  'btButton',
  'ps2Axis',
  'ps2Button',
  'wiiAxis',
  'wiiButton',
  'snesAxis',
  'snesButton',
  'joybusAxis',
  'joybusButton',
  'midi',
] as const;

// Returns the input with the slot ids of it and the inputs inside it changed by `remap`
export function remapSlotInputs(
  input: proto.IInput,
  remap: (kind: string, slotId: number, input: proto.IInput) => number
): proto.IInput {
  const kind = getInputSlotKind(input);
  if (kind) {
    for (const field of SLOT_INPUT_KINDS) {
      const value = input[field];
      if (value?.deviceid != null) {
        const deviceid = remap(kind, value.deviceid, input);
        return deviceid === value.deviceid ? input : { ...input, [field]: { ...value, deviceid } };
      }
    }
    return input;
  }
  const child = (x: proto.IInput | null | undefined) => (x ? remapSlotInputs(x, remap) : x);
  if (input.shortcut) {
    return {
      ...input,
      shortcut: {
        ...input.shortcut,
        inputs: input.shortcut.inputs?.map((x) => remapSlotInputs(x, remap)),
      },
    };
  }
  if (input.held) {
    return { ...input, held: { ...input.held, input: child(input.held.input)! } };
  }
  if (input.shifted) {
    return {
      ...input,
      shifted: {
        ...input.shifted,
        input: child(input.shifted.input),
        shift: child(input.shifted.shift),
      },
    };
  }
  if (input.cycle) {
    return {
      ...input,
      cycle: {
        ...input.cycle,
        input: child(input.cycle.input),
        inputReverse: child(input.cycle.inputReverse),
      },
    };
  }
  if (input.toggle) {
    return { ...input, toggle: { ...input.toggle, input: child(input.toggle.input) } };
  }
  return input;
}

// Returns the output with the slot a turn off controller action points at changed by `remap`. The
// slot is passed on as an input reading it, for remaps that look at what the input reads.
export function remapSlotOutput(
  output: proto.IOutput,
  remap: (kind: string, slotId: number, input: proto.IInput) => number
): proto.IOutput {
  const turnOff = output.turnOffController;
  if (turnOff?.usb != null) {
    const usb = remap('usbHost', turnOff.usb, { usbButton: { deviceid: turnOff.usb, button: {} } });
    return usb === turnOff.usb ? output : { ...output, turnOffController: { usb } };
  }
  if (turnOff?.bluetooth != null) {
    const bluetooth = remap('bt', turnOff.bluetooth, {
      btButton: { deviceid: turnOff.bluetooth, button: {} },
    });
    return bluetooth === turnOff.bluetooth
      ? output
      : { ...output, turnOffController: { bluetooth } };
  }
  return output;
}

// Returns the profile with the slot ids of every input in it changed by `remap`
export function remapProfileSlotInputs(
  profile: proto.IProfile,
  remap: (kind: string, slotId: number, input: proto.IInput) => number
): proto.IProfile {
  const inputOf = <T extends proto.IInput | null | undefined>(x: T): T =>
    x ? (remapSlotInputs(x, remap) as T) : x;
  return {
    ...profile,
    mappings: profile.mappings?.map((m) => {
      const mapping = m.mapping ? remapSlotOutput(m.mapping, remap) : m.mapping;
      const input = m.input ? remapSlotInputs(m.input, remap) : m.input;
      return mapping === m.mapping && input === m.input ? m : { ...m, mapping, input };
    }),
    leds: profile.leds?.map((led) =>
      led.mapping?.inputMapping?.input
        ? {
            ...led,
            mapping: {
              ...led.mapping,
              inputMapping: {
                ...led.mapping.inputMapping,
                input: inputOf(led.mapping.inputMapping.input),
              },
            },
          }
        : led
    ),
    assignments: profile.assignments?.map((list) => ({
      ...list,
      assignments: list.assignments?.map((item) => ({
        ...item,
        ...(item.input ? { input: { ...item.input, input: inputOf(item.input.input) } } : {}),
        ...(item.inputAnyTime
          ? { inputAnyTime: { ...item.inputAnyTime, input: inputOf(item.inputAnyTime.input) } }
          : {}),
      })),
    })),
  };
}

// The kind, type and n of each slot in each list, which say which slot it is when lists are added
// or removed
function slotKeys(profile: proto.IProfile) {
  const version = profile.opts?.deviceSlotIdVersion ?? 0;
  return (profile.assignments ?? []).map((list) => {
    const counts = new Map<string, number>();
    return (list.assignments ?? []).map((item) => {
      const kind = getSlotDeviceKind(item);
      if (!kind) {
        return undefined;
      }
      const type = getSlotKeyType(item, version);
      const n = (counts.get(`${kind}:${type}`) ?? 0) + 1;
      counts.set(`${kind}:${type}`, n);
      return `${kind}:${type}:${n}`;
    });
  });
}

// Whether `next` has the same lists as `prev`, in a different order
function isReorder(prev: proto.IProfileAssignment[], next: proto.IProfileAssignment[]): boolean {
  if (prev.length !== next.length || prev.every((list, i) => list === next[i])) {
    return false;
  }
  const encode = (list: proto.IProfileAssignment) =>
    proto.ProfileAssignment.encode(list).finish().join(',');
  const sorted = (lists: proto.IProfileAssignment[]) => lists.map(encode).sort().join('|');
  return sorted(prev) === sorted(next);
}

// deviceSlotIdVersion 2 numbers slots across the whole profile, so changing the assignments can
// change the ids of other slots. This moves the inputs of `next` to the ids their slots have now.
// Slots are followed by position when the lists keep their shape (eg a slot's type changed), and
// by kind, subtype and n otherwise (eg a list was added or removed).
export function remapEditedSlotIds(prev: proto.IProfile, next: proto.IProfile): proto.IProfile {
  if ((prev.opts?.deviceSlotIdVersion ?? 0) < 2 || (next.opts?.deviceSlotIdVersion ?? 0) < 2) {
    return next;
  }
  const prevLists = prev.assignments ?? [];
  const nextLists = next.assignments ?? [];
  // Ids don't depend on the order of the lists, so moving them around changes nothing. Pairing
  // slots by position, as below, would wrongly move inputs between the lists' devices instead.
  if (isReorder(prevLists, nextLists)) {
    return next;
  }
  const prevIds = getProfileSlotIds(prev);
  const nextIds = getProfileSlotIds(next);
  const sameShape =
    prevLists.length === nextLists.length &&
    prevLists.every(
      (list, i) => (list.assignments?.length ?? 0) === (nextLists[i].assignments?.length ?? 0)
    );

  // Every new id each old slot was paired with, and the one it keeps by kind, subtype and n
  const candidates = new Map<string, Set<number>>();
  const byKey = new Map<string, number>();
  const prevKeys = slotKeys(prev);
  const nextKeys = slotKeys(next);
  const nextIdOfKey = new Map<string, number>();
  nextKeys.forEach((list, i) =>
    list.forEach((key, j) => key && nextIdOfKey.set(key, nextIds[i][j]))
  );
  prevKeys.forEach((list, i) =>
    list.forEach((key, j) => {
      if (!key) {
        return;
      }
      const old = `${key.split(':')[0]}:${prevIds[i][j]}`;
      const kept = nextIdOfKey.get(key);
      if (kept != null) {
        byKey.set(old, kept);
      }
      let paired: number | undefined = kept;
      if (sameShape) {
        const nextItem = nextLists[i].assignments![j];
        paired = getSlotDeviceKind(nextItem) === key.split(':')[0] ? nextIds[i][j] : undefined;
      }
      if (paired != null) {
        candidates.set(old, (candidates.get(old) ?? new Set()).add(paired));
      }
    })
  );

  const remap = new Map<string, number>();
  // Inputs of a slot that was removed would otherwise read whichever slot has its id now
  const nextUsed = new Set(
    nextKeys.flatMap((list, i) =>
      list.flatMap((key, j) => (key ? [`${key.split(':')[0]}:${nextIds[i][j]}`] : []))
    )
  );
  prevKeys.forEach((list, i) =>
    list.forEach((key, j) => {
      const old = key && `${key.split(':')[0]}:${prevIds[i][j]}`;
      if (old && !candidates.has(old) && nextUsed.has(old)) {
        remap.set(old, 0);
      }
    })
  );
  for (const [old, ids] of candidates) {
    // A slot that changed in one list but not another stays with the unchanged one
    const id = ids.size === 1 ? [...ids][0] : (byKey.get(old) ?? [...ids][0]);
    if (`${old.split(':')[0]}:${id}` !== old) {
      remap.set(old, id);
    }
  }
  if (remap.size === 0) {
    return next;
  }
  return remapProfileSlotInputs(next, (kind, id) => remap.get(`${kind}:${id}`) ?? id);
}

const normalSubtype = (type: number) =>
  type === proto.SubType.ProGuitarSquier ? proto.SubType.ProGuitarMustang : type;

// Whether a slot of this subtype has what the input reads. Gamepad buttons and axes are read from
// every type of controller but a keyboard, and the rest only exist on their own type.
function inputFitsSubtype(input: proto.IInput, subtype: number): boolean {
  if (subtype === SLOT_UNTYPED) {
    return true;
  }
  if (input.key || input.mouseAxis || input.mouseButton) {
    return subtype === proto.SubType.KeyboardMouse;
  }
  const output =
    input.usbAxis?.axis ?? input.usbButton?.button ?? input.btAxis?.axis ?? input.btButton?.button;
  const outputType = getOutputSubType(output);
  // A keyboard has no gamepad buttons or axes
  if (subtype === proto.SubType.KeyboardMouse) {
    return outputType == null || outputType === proto.SubType.KeyboardMouse;
  }
  return (
    outputType == null ||
    outputType === proto.SubType.Gamepad ||
    normalSubtype(outputType) === normalSubtype(subtype)
  );
}

// Moves every input onto the new ids in `choices`, which has each new id a slot (keyed by kind and
// old id) became. A slot that became more than one (eg it was a different type of device in each
// list) gives each mapping reading it a copy per new id whose device has what it reads, as only
// the device that is connected is read. Other inputs only have room for one, so they get the
// first.
export function remapSlotChoices(
  profile: proto.IProfile,
  choices: Map<string, number[]>
): proto.IProfile {
  const lists = (profile.assignments ?? []).map((list) => list.assignments ?? []);
  const newIds = getProfileWideSlotIds(lists);
  const subtypes = new Map<string, number>();
  lists.forEach((list, i) =>
    list.forEach((item, j) => {
      const kind = getSlotDeviceKind(item);
      if (kind) {
        subtypes.set(`${kind}:${newIds[i][j]}`, getSlotSubtype(item));
      }
    })
  );
  const options = (kind: string, slotId: number, input: proto.IInput) => {
    const found = choices.get(`${kind}:${slotId}`);
    if (!found) {
      return undefined;
    }
    const fits = found.filter((id) => {
      const subtype = subtypes.get(`${kind}:${id}`);
      return subtype == null || inputFitsSubtype(input, subtype);
    });
    // Keep the input somewhere even when nothing fits, so it can be fixed by hand
    return fits.length ? fits : found;
  };
  const pick = (index: number) => (kind: string, slotId: number, input: proto.IInput) => {
    const found = options(kind, slotId, input);
    return found ? found[Math.min(index, found.length - 1)] : slotId;
  };
  const mappings = (profile.mappings ?? []).flatMap((mapping) => {
    if (!mapping.input) {
      return [mapping];
    }
    let copies = 1;
    remapSlotInputs(mapping.input, (kind, slotId, input) => {
      copies = Math.max(copies, options(kind, slotId, input)?.length ?? 1);
      return slotId;
    });
    return Array.from({ length: copies }, (_, index) => ({
      ...mapping,
      mapping: mapping.mapping ? remapSlotOutput(mapping.mapping, pick(index)) : mapping.mapping,
      input: remapSlotInputs(mapping.input!, pick(index)),
    }));
  });
  return { ...remapProfileSlotInputs({ ...profile, mappings: [] }, pick(0)), mappings };
}

// Moves a profile using older slot ids to the latest deviceSlotIdVersion. Before version 2 they were
// numbered within each list, so the same id could be a different slot in each list. Version 2 gave
// each slot an id of its own across the whole profile, but MIDI slots on different channels or
// devices still shared one.
export function migrateSlotIds(profile: proto.IProfile): proto.IProfile {
  if ((profile.opts?.deviceSlotIdVersion ?? 0) >= SLOT_ID_VERSION_LATEST) {
    return profile;
  }
  const lists = (profile.assignments ?? []).map((list) => list.assignments ?? []);
  const oldIds = getProfileSlotIds(profile);
  const newIds = getProfileWideSlotIds(lists);
  const choices = new Map<string, number[]>();
  lists.forEach((list, i) =>
    list.forEach((item, j) => {
      const kind = getSlotDeviceKind(item);
      if (!kind) {
        return;
      }
      const key = `${kind}:${oldIds[i][j]}`;
      const found = choices.get(key) ?? [];
      if (!found.includes(newIds[i][j])) {
        choices.set(key, [...found, newIds[i][j]]);
      }
    })
  );
  const migrated = remapSlotChoices(profile, choices);
  return { ...migrated, opts: { ...migrated.opts!, deviceSlotIdVersion: SLOT_ID_VERSION_LATEST } };
}
