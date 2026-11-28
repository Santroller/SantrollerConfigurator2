import { isAxisOutput } from '@/components/SettingsContext/calibrationSync';
import { proto } from '@/components/SettingsContext/config';
import { analogPinInput } from './pinInput';

// A drum kit device holds the pads of a drum kit, each with the input it's on. Mappings read a pad through a
// drumKit input, which the firmware turns into the pad's own input, so every drum layout plays the same pads.
// Like any device, it can sync calibration, so each pad is calibrated once for every layout.

// Raw reading (0 - 65535) a hit has to pass by default, so piezo noise at rest doesn't count
export const DEFAULT_PAD_MIN = 4000;
// How long a hit is held by default (100us units), so a game sees even a short strike
export const DEFAULT_PAD_DEBOUNCE_100US = 300;

// What the firmware keeps (DrumKitDevice::MAX_PADS) is more than any kit needs
export const MAX_DRUM_PADS = 16;

type PadTypeInfo = {
  // translation key under drumKit.types
  key: string;
  // Mantine colour for the pad's badge
  color: string;
};

export const DRUM_PAD_TYPES: Record<proto.DrumPadType, PadTypeInfo> = {
  [proto.DrumPadType.DrumPadOther]: { key: 'other', color: 'gray' },
  [proto.DrumPadType.DrumPadRed]: { key: 'red', color: 'red' },
  [proto.DrumPadType.DrumPadYellow]: { key: 'yellow', color: 'yellow' },
  [proto.DrumPadType.DrumPadBlue]: { key: 'blue', color: 'blue' },
  [proto.DrumPadType.DrumPadGreen]: { key: 'green', color: 'green' },
  [proto.DrumPadType.DrumPadYellowCymbal]: { key: 'yellowCymbal', color: 'yellow' },
  [proto.DrumPadType.DrumPadBlueCymbal]: { key: 'blueCymbal', color: 'blue' },
  [proto.DrumPadType.DrumPadGreenCymbal]: { key: 'greenCymbal', color: 'green' },
  [proto.DrumPadType.DrumPadOrangeCymbal]: { key: 'orangeCymbal', color: 'orange' },
  [proto.DrumPadType.DrumPadKick]: { key: 'kick', color: 'grape' },
  [proto.DrumPadType.DrumPadKick2]: { key: 'kick2', color: 'grape' },
  [proto.DrumPadType.DrumPadHiHatPedal]: { key: 'hiHatPedal', color: 'gray' },
};

export type DrumKitTemplate = 'gh' | 'rb';

const TEMPLATE_PADS: Record<DrumKitTemplate, proto.DrumPadType[]> = {
  gh: [
    proto.DrumPadType.DrumPadRed,
    proto.DrumPadType.DrumPadYellowCymbal,
    proto.DrumPadType.DrumPadBlue,
    proto.DrumPadType.DrumPadOrangeCymbal,
    proto.DrumPadType.DrumPadGreen,
    proto.DrumPadType.DrumPadKick,
  ],
  rb: [
    proto.DrumPadType.DrumPadRed,
    proto.DrumPadType.DrumPadYellow,
    proto.DrumPadType.DrumPadBlue,
    proto.DrumPadType.DrumPadGreen,
    proto.DrumPadType.DrumPadYellowCymbal,
    proto.DrumPadType.DrumPadBlueCymbal,
    proto.DrumPadType.DrumPadGreenCymbal,
    proto.DrumPadType.DrumPadKick,
  ],
};

// A pad whose pin isn't picked yet
export function newDrumPad(id: number, type: proto.DrumPadType): proto.IDrumPad {
  return { id, type, input: analogPinInput() };
}

export function nextPadId(kit: proto.IDrumKitDevice): number {
  return (kit.pads ?? []).reduce((next, pad) => Math.max(next, (pad.id ?? 0) + 1), 0);
}

export function templatePads(template: DrumKitTemplate): proto.IDrumPad[] {
  return TEMPLATE_PADS[template].map((type, id) => newDrumPad(id, type));
}

// A pad is named by what it plays as (typeName translates that), numbered when the kit has more than one of
// those
export function padLabel(
  pads: proto.IDrumPad[],
  pad: proto.IDrumPad,
  typeName: (type: proto.DrumPadType) => string
): string {
  const type = pad.type ?? proto.DrumPadType.DrumPadOther;
  const same = pads.filter((p) => (p.type ?? proto.DrumPadType.DrumPadOther) === type);
  const name = typeName(type);
  return same.length > 1 ? `${name} ${same.indexOf(pad) + 1}` : name;
}

// A new mapping playing a pad on output. Drum lanes read like triggers, so a hit has to pass min (keeping noise
// at rest from counting) and holds its peak. Buttons (a kick on Rock Band) are pressed past the same point.
export function padMapping(output: proto.IOutput, deviceid: number, pad: number): proto.IMapping {
  const input: proto.IInput = { drumKit: { deviceid, pad } };
  if (!isAxisOutput(output)) {
    input.digitalTrigger = proto.AnalogToDigitalTriggerType.JoyHigh;
    input.digitalTriggerValue = DEFAULT_PAD_MIN;
  }
  return {
    mapping: output,
    input,
    min: DEFAULT_PAD_MIN,
    max: 65535,
    center: DEFAULT_PAD_MIN,
    peakBased: true,
    debounce100us: DEFAULT_PAD_DEBOUNCE_100US,
  };
}

// How many mappings, across every profile, play this pad (or any of the kit's pads, without pad)
export function countPadMappings(
  profiles: proto.IProfile[] | null | undefined,
  deviceid: number,
  pad?: number
): number {
  return (profiles ?? []).reduce(
    (count, profile) =>
      count +
      (profile.mappings ?? []).filter(
        (mapping) =>
          mapping.input?.drumKit?.deviceid === deviceid &&
          (pad == null || mapping.input.drumKit.pad === pad)
      ).length,
    0
  );
}

// The pads each lane of a drum layout plays, best match first. Every pad of a listed type plays the lane,
// so a Rock Band kit's yellow pad and cymbal both play Guitar Hero's yellow. Guitar Hero's yellow and
// orange are cymbals, which Rock Band plays as its yellow and green cymbals.
type Lane = { output: proto.IOutput; types: proto.DrumPadType[] };

const GH_LANES: Lane[] = [
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
    types: [proto.DrumPadType.DrumPadRed],
  },
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad },
    types: [proto.DrumPadType.DrumPadYellowCymbal, proto.DrumPadType.DrumPadYellow],
  },
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad },
    types: [proto.DrumPadType.DrumPadBlue],
  },
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad },
    types: [
      proto.DrumPadType.DrumPadOrangeCymbal,
      proto.DrumPadType.DrumPadGreenCymbal,
      proto.DrumPadType.DrumPadBlueCymbal,
    ],
  },
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad },
    types: [proto.DrumPadType.DrumPadGreen],
  },
  {
    output: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal },
    types: [proto.DrumPadType.DrumPadKick, proto.DrumPadType.DrumPadKick2],
  },
];

const RB_LANES: Lane[] = [
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad },
    types: [proto.DrumPadType.DrumPadRed],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad },
    types: [proto.DrumPadType.DrumPadYellow],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad },
    types: [proto.DrumPadType.DrumPadBlue],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad },
    types: [proto.DrumPadType.DrumPadGreen],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal },
    types: [proto.DrumPadType.DrumPadYellowCymbal],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal },
    types: [proto.DrumPadType.DrumPadBlueCymbal],
  },
  {
    output: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal },
    types: [proto.DrumPadType.DrumPadGreenCymbal, proto.DrumPadType.DrumPadOrangeCymbal],
  },
  {
    output: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal },
    types: [proto.DrumPadType.DrumPadKick],
  },
  {
    output: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal },
    types: [proto.DrumPadType.DrumPadKick2],
  },
];

export function drumLanes(subType: proto.SubType | null | undefined): Lane[] | undefined {
  switch (subType) {
    case proto.SubType.GuitarHeroDrums:
      return GH_LANES;
    case proto.SubType.RockBandDrums:
      return RB_LANES;
    default:
      return undefined;
  }
}

function sameOutput(a: proto.IOutput | null | undefined, b: proto.IOutput) {
  const [key, value] = Object.entries(b)[0];
  return a?.[key as keyof proto.IOutput] === value;
}

// A drum layout's mappings, with every lane played by the kit's pads for it. While the kit syncs calibration,
// the store gives them the calibration the pads already have. Lanes the kit has pads for replace the mappings the profile had for them, everything else
// is kept.
export function layoutFromKit(
  mappings: proto.IMapping[],
  deviceid: number,
  kit: proto.IDrumKitDevice,
  subType: proto.SubType | null | undefined
): proto.IMapping[] {
  const lanes = drumLanes(subType);
  if (!lanes) {
    return mappings;
  }
  const pads = kit.pads ?? [];
  const covered = lanes.filter((lane) => pads.some((pad) => lane.types.includes(pad.type!)));
  const kept = mappings.filter(
    (mapping) => !covered.some((lane) => sameOutput(mapping.mapping, lane.output))
  );
  const linked = covered.flatMap((lane) =>
    pads
      .filter((pad) => lane.types.includes(pad.type!))
      .map((pad) => padMapping(lane.output, deviceid, pad.id ?? 0))
  );
  return [...kept, ...linked];
}
