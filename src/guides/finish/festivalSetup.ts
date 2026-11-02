import i18next from 'i18next';
import { MAPPING_PRESETS } from '@/components/Defaults/mappingPresets';
import { getHostSourceType } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';
import { truncateProfileName } from '@/components/SettingsContext/profileName';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

const INSTRUMENT_TYPES = {
  guitar: [proto.SubType.GuitarHeroGuitar, proto.SubType.RockBandGuitar],
  drums: [proto.SubType.GuitarHeroDrums, proto.SubType.RockBandDrums],
};

export type Instrument = 'guitar' | 'drums';

// Whether a profile is a guitar or drums, which Festival can be set up from
export function instrumentOf(profile: proto.IProfile | undefined): Instrument | undefined {
  const type = profile?.opts?.deviceToEmulate ?? proto.SubType.Gamepad;
  return INSTRUMENT_TYPES.guitar.includes(type)
    ? 'guitar'
    : INSTRUMENT_TYPES.drums.includes(type)
      ? 'drums'
      : undefined;
}

// What's been picked for one guitar or drum profile on the setup guide's games step
export interface FestivalChoice {
  games: string[];
  // The Festival parts to play on consoles, each getting a keyboard profile of its own
  parts?: FestivalPart[];
  // The button held for each part, and for PC, when not the default
  partButtons?: Partial<Record<FestivalPart, string | null>>;
  pcButton?: string | null;
}

// The Festival parts an instrument can play, the first being the default
export const FESTIVAL_PARTS: Record<Instrument, FestivalPart[]> = {
  guitar: ['festival_pro_guitar', 'festival_guitar'],
  drums: ['festival_pro_drums', 'festival_drums'],
};

// The keyboard profile a part gets, named after the profile it's made from, so each guitar or drum
// kit, and each part, can have its own
export function festivalProfileName(name: string | null | undefined, part: FestivalPart) {
  return truncateProfileName(
    i18next.t('guides.finish.games.profileName', {
      name,
      part: i18next.t(`guides.finish.games.partShort.${part}`),
    })
  );
}

/**
 * What a choice comes to for a profile: the buttons it can be held with, and the ones picked or
 * defaulted to for each console part and for PC. The defaults all differ, so no two setups are
 * picked by the same button: a guitar's frets from the last one down, or Select then Start for
 * drums, which kits have and nobody hits by accident. They're handed out in the same order whatever
 * is ticked (the first part, PC, then the other part), so ticking another doesn't move them.
 */
export function festivalPlan(profile: proto.IProfile | undefined, choice: FestivalChoice) {
  const instrument = instrumentOf(profile) ?? 'guitar';
  const drums = instrument === 'drums';
  const buttons = holdButtons(profile);
  const frets = buttons.filter((button) => button.kind === 'fret');
  const named = (name: string) => buttons.find((button) => button.name === name);
  const preferred = [
    ...(drums ? [named('Gamepad_Back'), named('Gamepad_Start')] : [...frets].reverse()),
    ...buttons,
  ].filter((button) => button != null);
  const allParts = FESTIVAL_PARTS[instrument];
  const parts = allParts.filter((part) => (choice.parts ?? allParts.slice(0, 1)).includes(part));
  const slots: (FestivalPart | 'pc')[] = [allParts[0], 'pc', ...allParts.slice(1)];
  const explicit = (slot: FestivalPart | 'pc') =>
    slot === 'pc' ? choice.pcButton : choice.partButtons?.[slot];
  const used = new Set(slots.map(explicit).filter((name) => name != null));
  const chosen = {} as Record<FestivalPart | 'pc', string | null>;
  for (const slot of slots) {
    const name = explicit(slot) ?? preferred.find((button) => !used.has(button.name))?.name ?? null;
    if (name) {
      used.add(name);
    }
    chosen[slot] = name;
  }
  const wantConsole = choice.games.includes('console') && parts.length > 0;
  const wantPc = choice.games.includes('pc');
  const active = [...(wantConsole ? parts : []), ...(wantPc ? ['pc' as const] : [])].map(
    (slot) => chosen[slot]
  );
  return {
    instrument,
    drums,
    buttons,
    allParts,
    parts,
    partChoice: (part: FestivalPart) => chosen[part],
    pcChoice: chosen.pc,
    wantConsole,
    wantPc,
    clash: new Set(active).size < active.length,
    inputFor: (name: string | null) => buttons.find((button) => button.name === name)?.input,
  };
}

export type FestivalPart =
  'festival_guitar' | 'festival_pro_guitar' | 'festival_drums' | 'festival_pro_drums';

const FRET_NAME = /_(Green|Red|Yellow|Blue|Orange)$/;

// The profile's buttons that can be held at startup to pick a Fortnite Festival setup: a guitar's
// frets, a kick pedal that's a switch, then buttons like Start and Select. Drum pads only send a
// hit, so they can't be held.
export function holdButtons(profile: proto.IProfile | undefined) {
  const seen = new Set<string>();
  const found = (profile?.mappings ?? []).flatMap((mapping) => {
    const out = mapping.mapping;
    // Analog inputs only count as pressed past a point, so they're left out
    if (!out || !mapping.input || mapping.trigger != null || mapping.input.gpio?.analog) {
      return [];
    }
    let name: string | undefined;
    // Translation keys, the first that exists being used
    let label: string[] | undefined;
    let kind: 'fret' | 'kick' | 'button' = 'button';
    if (out.ghButton != null || out.rbButton != null) {
      name =
        out.ghButton != null
          ? proto.GuitarHeroGuitarButtonType[out.ghButton]
          : proto.RockBandGuitarButtonType[out.rbButton!];
      if (!name || !FRET_NAME.test(name)) {
        return [];
      }
      label = [`outputs.${name}`];
      kind = 'fret';
    } else if (out.rbDrumButton != null) {
      name = proto.RockBandDrumsButtonType[out.rbDrumButton];
      label = [`outputs.${name}`];
      kind = 'kick';
    } else if (out.gamepadButton != null) {
      name = proto.GamepadButtonType[out.gamepadButton];
      // Most buttons are named per console, the d-pad only generically
      label = [`outputs.Xbox360.${name}`, `outputs.Generic.${name}`];
    }
    if (!name || !label || seen.has(name)) {
      return [];
    }
    seen.add(name);
    return [{ name, label, kind, input: mapping.input }];
  });
  const order = ['fret', 'kick', 'button'];
  return found.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

const usb = (forcedType?: proto.ConsoleMode): proto.IProfileAssignmentInfo => ({
  consoleType: {
    consoleType: null,
    forcedType: forcedType ?? null,
    xinputOnWindows: true,
    ps4OrPs5Mode: false,
  },
});

// The parts of the guitar profile's first rule that say where its inputs come from: the connected
// controllers, and the claim on the board's own pins. Rules for Festival keep these, so they read
// the same buttons and take turns with the guitar profile the same way.
function inputParts(profile: proto.IProfile) {
  return (profile.assignments?.[0]?.assignments ?? []).filter(
    (item) => getHostSourceType(item) !== null || item.localInputs != null
  );
}

const isPcRule = (list: proto.IProfileAssignment) =>
  (list.assignments ?? []).some(
    (item) => item.consoleType?.forcedType === proto.ConsoleMode.ModeXboxOne
  ) && (list.assignments ?? []).some((item) => item.input != null);

// Festival on PC takes Xbox One guitars and drum kits, so the instrument's profile gets a rule
// forcing that mode while a button is held at startup. It goes first, as the first rule that
// matches is used.
export function addPcFestivalRule(profileIdx: number, button: proto.IInput) {
  const store = useConfigStore.getState();
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }
  const rule: proto.IProfileAssignment = {
    assignments: [
      usb(proto.ConsoleMode.ModeXboxOne),
      ...inputParts(profile),
      { input: { input: button } },
    ],
  };
  store.updateProfile(
    {
      ...profile,
      assignments: [rule, ...(profile.assignments ?? []).filter((list) => !isPcRule(list))],
    },
    profileIdx
  );
}

// Festival on consoles needs a keyboard, as consoles only let keyboards skip authentication. This
// adds (or redoes) a keyboard profile for a part above the guitar one, with the guitar's buttons converted to
// Festival's keys, used while a button is held at startup. Returns false, adding nothing, when none
// of the profile's buttons have a Festival key, eg as it isn't the guitar or drums.
export function addConsoleFestivalProfile(
  guitarIdx: number,
  part: FestivalPart,
  button: proto.IInput
) {
  const store = useConfigStore.getState();
  const guitar = store.config.profiles?.[guitarIdx];
  const preset = MAPPING_PRESETS.find((p) => p.id === part);
  if (!guitar || !preset) {
    return false;
  }
  const name = festivalProfileName(guitar.opts?.name, part);
  const seen = new Set<string>();
  const mappings = (guitar.mappings ?? []).flatMap(preset.convert).filter((mapping) => {
    const key = JSON.stringify(mapping);
    return !seen.has(key) && !!seen.add(key);
  });
  if (mappings.length === 0) {
    return false;
  }
  const festival = (profile: proto.IProfile): proto.IProfile => ({
    ...profile,
    opts: {
      ...profile.opts,
      name,
      deviceToEmulate: proto.SubType.KeyboardMouse,
      faceButtonMappingMode: guitar.opts?.faceButtonMappingMode,
      deviceSlotIdVersion: guitar.opts?.deviceSlotIdVersion,
      setUp: true,
    },
    assignments: [{ assignments: [usb(), ...inputParts(guitar), { input: { input: button } }] }],
    mappings,
    leds: [],
  });

  // Running it again redoes the Festival profile instead of adding a second one
  const existing = (store.config.profiles ?? []).findIndex(
    (p) => p.opts?.name === name && p.opts?.deviceToEmulate === proto.SubType.KeyboardMouse
  );
  const update = (idx: number) =>
    store.updateProfile(festival(useConfigStore.getState().config.profiles![idx]), idx);
  if (existing !== -1) {
    update(existing);
    return true;
  }
  store.addProfile();
  const added = useConfigStore.getState();
  const newIdx = added.currentProfile;
  update(newIdx);
  // Above the guitar profile, so holding the button picks it before the guitar's own rule
  added.moveProfile(newIdx, guitarIdx);
  added.setActiveProfile((guitarIdx + 1).toString(), 0);
  return true;
}
