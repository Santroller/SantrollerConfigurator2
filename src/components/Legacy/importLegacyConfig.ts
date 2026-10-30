import {
  getProfileWideSlotIds,
  getSlotDeviceKind,
  getSlotSubtype,
  SLOT_ID_VERSION_LATEST,
} from '@/components/Inputs/inputRegistry';
import { getInputSlotKind, remapSlotChoices } from '@/components/Inputs/slotRemap';
import { proto } from '@/components/SettingsContext/config';
import { MAX_PROFILE_NAME_BYTES } from '@/components/SettingsContext/profileName';
import { LegacyImportContext } from './context';
import { convertHostMidiSettings } from './families/hostMidi';
import { convertInstrumentPeripheralSettings } from './families/instrumentPeripherals';
import { convertLedsModesSettings } from './families/ledsModes';
import { convertWiiPs2Settings } from './families/wiiPs2';
import { festivalMappings } from './festival';

import './families';

import { legacy } from './legacy';
import { convertOutput } from './outputs';
import { legacyErrorReason, LegacyImportError, legacyWarning, LegacyWarning } from './warnings';

export interface LegacyImportResult {
  config: proto.Config;
  aux: proto.AuxConfigBlock;
  // Things that couldn't be imported exactly, to show to the user
  warnings: LegacyWarning[];
}

function emulatedSubType(
  old: legacy.SerializedConfiguration,
  warn: (key: string) => void
): proto.SubType {
  switch (old.emulationType) {
    case legacy.EmulationType.EmulationType_KeyboardMouse:
    case legacy.EmulationType.EmulationType_BluetoothKeyboardMouse:
      return proto.SubType.KeyboardMouse;
    case legacy.EmulationType.EmulationType_FortniteFestival:
      warn('legacyImport.fortniteFestival');
      break;
  }
  // The old controller types use the same numbers as the new ones
  const type = old.deviceType ?? legacy.DeviceControllerType.DeviceControllerType_Gamepad;
  return proto.SubType[type] != null ? (type as number as proto.SubType) : proto.SubType.Gamepad;
}

// Lists of slot combinations beyond this are left as all or nothing
const MAX_SLOT_COMBINATIONS = 16;

// Whether an input reads something other than a device in a profile slot, eg a pin
function readsLocalInput(input: proto.IInput | null | undefined): boolean {
  if (!input || getInputSlotKind(input)) {
    return false;
  }
  if (input.shortcut) {
    return (input.shortcut.inputs ?? []).some(readsLocalInput);
  }
  const children = [
    input.held?.input,
    input.shifted?.input,
    input.shifted?.shift,
    input.cycle?.input,
    input.cycle?.inputReverse,
    input.toggle?.input,
  ];
  if (input.held || input.shifted || input.cycle || input.toggle) {
    return children.some(readsLocalInput);
  }
  return !input.fixed;
}

// Tilt is a sensor on the board (a tilt switch or the accelerometer) even when the guitar itself
// comes from a device in a slot, so it isn't enough to play without that device
function isTilt(mapping: proto.IMapping) {
  const out = mapping.mapping ?? {};
  return (
    !!mapping.input?.accelerometer ||
    out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt ||
    out.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Tilt ||
    out.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt ||
    out.proAxis === proto.ProGuitarAxisType.ProGuitar_Tilt
  );
}

// Whether the inputs on the board are a controller on their own, so the profile should still be
// used while none of the devices in its slots are connected
function playsWithoutSlots(mappings: proto.IMapping[]) {
  return mappings.some((m) => readsLocalInput(m.input) && !isTilt(m));
}

// The old firmware read every device it had bindings for, whichever of them were plugged in, so
// each assignment list is copied for every combination of its slots (largest first) instead of
// needing all of them. Within a kind and subtype only later slots are left out, so the slots that
// are kept still have the same ids. A profile claims the first list that matches and keeps it, so
// the list without any slots, which always matches, is only added when there are other inputs.
function expandOptionalSlots(
  ctx: LegacyImportContext,
  lists: proto.IProfileAssignment[],
  withoutSlots: boolean
): proto.IProfileAssignment[] {
  return lists.flatMap((list) => {
    const items = list.assignments ?? [];
    const groups = new Map<string, proto.IProfileAssignmentInfo[]>();
    for (const item of items.filter((x) => ctx.slotPlaceholders.has(x))) {
      const key = `${getSlotDeviceKind(item)}:${getSlotSubtype(item)}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    if (groups.size === 0) {
      return [list];
    }
    let combinations: proto.IProfileAssignmentInfo[][] = [[]];
    const count = [...groups.values()].reduce((n, group) => n * (group.length + 1), 1);
    if (count > MAX_SLOT_COMBINATIONS) {
      ctx.warn('legacyImport.tooManyCombinations');
      combinations = [[...groups.values()].flat(), []];
    } else {
      for (const group of groups.values()) {
        combinations = combinations.flatMap((kept) =>
          Array.from({ length: group.length + 1 }, (_, i) => [
            ...kept,
            ...group.slice(0, group.length - i),
          ])
        );
      }
      // Array.sort is stable, so equal sizes keep the order above
      combinations.sort((a, b) => b.length - a.length);
    }
    return combinations
      .filter((kept) => withoutSlots || kept.length > 0)
      .map((kept) => ({
        ...list,
        assignments: items.filter((x) => !ctx.slotPlaceholders.has(x) || kept.includes(x)),
      }));
  });
}

// Moves the inputs from the slots used while converting to the profile wide ids of the final
// lists. A slot with alternatives (eg a Classic Controller Pro for a Classic Controller) has an id
// for each, so mappings reading it get a copy for each.
function assignSlotIds(
  ctx: LegacyImportContext,
  lists: proto.IProfileAssignment[],
  profile: proto.IProfile
): proto.IProfile {
  const ids = getProfileWideSlotIds(lists.map((list) => list.assignments ?? []));
  const choices = new Map<string, number[]>();
  lists.forEach((list, i) =>
    list.assignments?.forEach((item, j) => {
      const slot = ctx.slotPlaceholders.get(item);
      if (slot) {
        const key = `${slot.deviceKind}:${slot.slotId}`;
        const found = choices.get(key) ?? [];
        if (!found.includes(ids[i][j])) {
          choices.set(key, [...found, ids[i][j]]);
        }
      }
    })
  );
  return remapSlotChoices(profile, choices);
}

// The name for the Fortnite Festival profile, shortening the main profile's name to fit
function festivalProfileName(name: string) {
  const suffix = ' (Festival)';
  const size = (text: string) => new TextEncoder().encode(text).length;
  let base = name;
  while (base && size(base) + size(suffix) > MAX_PROFILE_NAME_BYTES) {
    base = [...base].slice(0, -1).join('');
  }
  return `${base.trimEnd()}${suffix}`;
}

// Converts a Santroller 1 .picoconfig file into a new config
export function importLegacyConfig(data: Uint8Array, name = 'Imported'): LegacyImportResult {
  const old = legacy.SerializedConfiguration.decode(data);
  const warnings: string[] = [];
  const subType = emulatedSubType(old, (key) => warnings.push(key));
  const ctx = new LegacyImportContext(old, subType);
  warnings.forEach((key) => ctx.warn(key));

  for (const binding of old.bindings) {
    convertOutput(ctx, binding);
  }
  convertInstrumentPeripheralSettings(ctx);
  convertHostMidiSettings(ctx);
  // This copies the profile's assignments into every console mode, so it goes after anything
  // that adds assignments
  const settings = convertLedsModesSettings(ctx);
  // Wii Remote / PS2 console output only matches while that console is talking to the device, so
  // each gets a list of its own (assignments in one list all have to match)
  const emulation = convertWiiPs2Settings(ctx).map((info) => ({
    assignments: [info, ...ctx.assignments],
  }));

  // Copy mappings onto the other devices their old input read from
  ctx.mappings.splice(
    0,
    ctx.mappings.length,
    ...ctx.mappings.flatMap((mapping) => [
      mapping,
      ...(ctx.extraInputs.get(mapping.input!) ?? []).map((input) => ({ ...mapping, input })),
    ])
  );

  // The firmware only turns the tap frets into a GH5 slider value when this is on
  const TAPS = proto.GuitarHeroGuitarButtonType;
  const supportsSlider = ctx.mappings.some(
    (m) =>
      m.mapping?.ghButton != null &&
      m.mapping.ghButton >= TAPS.GuitarHeroGuitar_TapGreen &&
      m.mapping.ghButton <= TAPS.GuitarHeroGuitar_TapOrange
  );

  // The festival profile's mappings come from these, so this decides for both profiles
  const withoutSlots = playsWithoutSlots(ctx.mappings);
  // A profile claims the first list that matches, and the USB lists match whenever USB is
  // connected, so they go last to give the Wii Remote / PS2 lists a chance to match
  const lists = ctx.expandSlotAlternatives(
    expandOptionalSlots(ctx, [...emulation, ...settings.assignments], withoutSlots)
  );
  const profileName = old.variant || name;
  const profile = assignSlotIds(ctx, lists, {
    opts: {
      uid: 1,
      name: profileName,
      deviceToEmulate: subType,
      deviceSlotIdVersion: SLOT_ID_VERSION_LATEST,
      faceButtonMappingMode: old.swapSwitchFaceButtons
        ? proto.FaceButtonMappingMode.PositionBased
        : proto.FaceButtonMappingMode.LegendBased,
      xinputOnWindows: old.xInputOnWindows,
      invertYAxisHid: old.invertHidYAxis,
      cymbalGlitchFix: old.rb3CymbalGlitchFix,
      queueInputs: old.queueBasedInputs,
      combinedStrumDebounce: old.combinedStrumDebounce,
      selectToDpadLeft: old.selectDpadLeftXb1,
      ps3OnRpcs3: old.ps3OnRpcs3,
      fullRangeTurntableOnPc: old.djFullRange,
      supportsSlider,
    },
    assignments: lists,
    mappings: ctx.mappings,
    leds: ctx.leds,
  });

  // The Fortnite Festival keyboard mode became a keyboard profile, held at startup like the other
  // console modes. Profiles are tried in order and the main one always matches, so it goes first.
  const profiles = [profile];
  if (settings.festival) {
    const mappings = festivalMappings(ctx.mappings, subType);
    const festivalLists = ctx.expandSlotAlternatives(
      expandOptionalSlots(ctx, settings.festival.assignments, withoutSlots)
    );
    profiles.unshift(
      assignSlotIds(ctx, festivalLists, {
        opts: {
          uid: 2,
          name: festivalProfileName(profileName),
          deviceToEmulate: proto.SubType.KeyboardMouse,
          deviceSlotIdVersion: SLOT_ID_VERSION_LATEST,
          faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
          queueInputs: old.queueBasedInputs,
          combinedStrumDebounce: old.combinedStrumDebounce,
        },
        assignments: festivalLists,
        mappings,
        leds: settings.festival.leds,
      })
    );
  }

  const config = proto.Config.fromObject({
    devices: ctx.devices,
    profiles,
    guiConfig: [],
    ...(settings.inactivity ? { inactivity: settings.inactivity } : {}),
  });
  const error = proto.Config.verify(config);
  if (error) {
    throw new LegacyImportError(
      legacyWarning('legacyImport.invalidConfig', { error }),
      `The imported config is invalid: ${error}`
    );
  }
  return {
    config,
    aux: proto.AuxConfigBlock.create({
      states: [],
      toggleStates: [],
      bluetoothStates: [],
      tlvEntries: [],
    }),
    warnings: ctx.warnings,
  };
}

// Returns the input with the device ids of it and the inputs inside it changed by `remap`. Inputs
// that read a profile slot keep their slot ids, as slots belong to the profile.
function remapDeviceIds(input: proto.IInput, remap: (id: number) => number): proto.IInput {
  const kind = Object.keys(input).find((key) => input[key as keyof proto.IInput] != null) as
    keyof proto.IInput | undefined;
  if (!kind || getInputSlotKind(input)) {
    return input;
  }
  const value = { ...(input[kind] as Record<string, unknown>) };
  if (typeof value.deviceid === 'number') {
    value.deviceid = remap(value.deviceid);
  }
  for (const field of ['input', 'inputReverse', 'shift'] as const) {
    if (value[field]) {
      value[field] = remapDeviceIds(value[field] as proto.IInput, remap);
    }
  }
  if (Array.isArray(value.inputs)) {
    value.inputs = (value.inputs as proto.IInput[]).map((x) => remapDeviceIds(x, remap));
  }
  return { [kind]: value };
}

function remapProfileDeviceIds(profile: proto.IProfile, remap: (id: number) => number) {
  const inputOf = <T extends proto.IInput | null | undefined>(x: T): T =>
    x ? (remapDeviceIds(x, remap) as T) : x;
  return {
    ...profile,
    mappings: profile.mappings?.map((m) => ({ ...m, input: inputOf(m.input) })),
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
    leds: profile.leds?.map((led) => {
      const [kind, device] = Object.entries(led.device ?? {}).find(([, v]) => v != null) ?? [];
      const deviceRef =
        kind && device && typeof device.deviceId === 'number'
          ? { [kind]: { ...device, deviceId: remap(device.deviceId) } }
          : led.device;
      const input = led.mapping?.inputMapping?.input;
      return {
        ...led,
        device: deviceRef,
        mapping: input
          ? {
              ...led.mapping,
              inputMapping: { ...led.mapping!.inputMapping!, input: inputOf(input) },
            }
          : led.mapping,
      };
    }),
  };
}

// Converts several Santroller 1 .picoconfig files into one config, with a profile for each. A
// device that more than one of them set up the same way is shared, the rest are given new ids.
export function importLegacyConfigs(
  files: { data: Uint8Array; name: string }[]
): LegacyImportResult {
  const devices: proto.IDevice[] = [];
  const deviceKeys = new Map<string, number>();
  const profiles: proto.IProfile[] = [];
  const warnings: LegacyWarning[] = [];
  // The sleep and LED timeouts are for the whole device, so the first file's are used
  let inactivity: { config: proto.IInactivityConfig; from: string } | undefined;
  for (const file of files) {
    let result: LegacyImportResult;
    try {
      result = importLegacyConfig(file.data, file.name);
    } catch (e) {
      if (files.length === 1) {
        throw e;
      }
      throw new LegacyImportError(
        legacyWarning('legacyImport.withFile', { file: file.name, message: legacyErrorReason(e) }),
        `${file.name}: ${e}`
      );
    }
    const config = proto.Config.toObject(result.config) as proto.IConfig;
    const ids = new Map<number, number>();
    for (const device of config.devices ?? []) {
      const key = JSON.stringify({ ...device, deviceid: undefined });
      // A toggle holds a state, so each file's toggles stay their own
      let id = device.toggle ? undefined : deviceKeys.get(key);
      if (id == null) {
        id = devices.length + 1;
        deviceKeys.set(key, id);
        devices.push({ ...device, deviceid: id });
      }
      ids.set(device.deviceid, id);
    }
    for (const imported of config.profiles ?? []) {
      const profile = remapProfileDeviceIds(imported, (id) => ids.get(id) ?? id);
      profiles.push({ ...profile, opts: { ...profile.opts!, uid: profiles.length + 1 } });
    }
    // Warnings are prefixed with the file they're about when there are several
    const withFile = (warning: LegacyWarning) =>
      files.length > 1
        ? legacyWarning('legacyImport.withFile', { file: file.name, message: warning })
        : warning;
    warnings.push(...result.warnings.map(withFile));
    if (config.inactivity) {
      if (!inactivity) {
        inactivity = { config: config.inactivity, from: file.name };
      } else if (JSON.stringify(inactivity.config) !== JSON.stringify(config.inactivity)) {
        warnings.push(
          withFile(legacyWarning('legacyImport.sharedTimeouts', { file: inactivity.from }))
        );
      }
    }
  }
  const config = proto.Config.fromObject({
    devices,
    profiles,
    guiConfig: [],
    ...(inactivity ? { inactivity: inactivity.config } : {}),
  });
  const error = proto.Config.verify(config);
  if (error) {
    throw new LegacyImportError(
      legacyWarning('legacyImport.invalidConfig', { error }),
      `The imported config is invalid: ${error}`
    );
  }
  return {
    config,
    aux: proto.AuxConfigBlock.create({
      states: [],
      toggleStates: [],
      bluetoothStates: [],
      tlvEntries: [],
    }),
    warnings,
  };
}
