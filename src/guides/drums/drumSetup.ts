import { layoutFromKit, newDrumPad, nextPadId } from '@/components/Devices/drumKit';
import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { ensureDeviceToEmulate } from '../adapters/adapterLiveStatus';
import { wiredInput } from '../wiredInputs';

// Every piezo goes through one multiplexer, so a single ADC pin reads them all (with velocity)
export const MUX_COM_PIN = 26;
export const MUX_COM_PHYSICAL_PIN = 31;
export const MUX_SELECT_PINS = [2, 3, 4, 5];
export const MUX_SELECT_PHYSICAL_PINS = [4, 5, 6, 7];

export type DrumFamily = 'gh' | 'rb';
export type MuxChip = '74hc4051' | 'cd4051' | '74hc4067' | 'cd4067';

export const MUX_CHIPS: { value: MuxChip; label: string; sixteen: boolean; slow: boolean }[] = [
  { value: '74hc4051', label: '74HC4051', sixteen: false, slow: false },
  { value: 'cd4051', label: 'CD4051', sixteen: false, slow: true },
  { value: '74hc4067', label: '74HC4067', sixteen: true, slow: false },
  { value: 'cd4067', label: 'CD4067', sixteen: true, slow: true },
];

export interface DrumPad {
  key: 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'kick';
  channel: number;
  color: string;
  gh: proto.IOutput;
  // Rock Band kits have no orange pad
  rb?: proto.IOutput;
  // What it is on the drum kit the guide sets up. Guitar Hero kits' yellow and orange are cymbals.
  type: Record<DrumFamily, proto.DrumPadType>;
}

export const DRUM_PADS: DrumPad[] = [
  {
    key: 'red',
    channel: 0,
    color: 'red',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad },
    type: { gh: proto.DrumPadType.DrumPadRed, rb: proto.DrumPadType.DrumPadRed },
  },
  {
    key: 'yellow',
    channel: 1,
    color: 'yellow',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad },
    type: { gh: proto.DrumPadType.DrumPadYellowCymbal, rb: proto.DrumPadType.DrumPadYellow },
  },
  {
    key: 'blue',
    channel: 2,
    color: 'blue',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad },
    type: { gh: proto.DrumPadType.DrumPadBlue, rb: proto.DrumPadType.DrumPadBlue },
  },
  {
    key: 'green',
    channel: 3,
    color: 'green',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad },
    type: { gh: proto.DrumPadType.DrumPadGreen, rb: proto.DrumPadType.DrumPadGreen },
  },
  {
    key: 'orange',
    channel: 4,
    color: 'orange',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad },
    type: { gh: proto.DrumPadType.DrumPadOrangeCymbal, rb: proto.DrumPadType.DrumPadOrangeCymbal },
  },
  {
    key: 'kick',
    channel: 5,
    color: 'grape',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal },
    rb: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal },
    type: { gh: proto.DrumPadType.DrumPadKick, rb: proto.DrumPadType.DrumPadKick },
  },
];

export function drumFamily(state: ConfigState): DrumFamily {
  return state.config.profiles?.[state.currentProfile]?.opts.deviceToEmulate ===
    proto.SubType.RockBandDrums
    ? 'rb'
    : 'gh';
}

export function padOutput(pad: DrumPad, family: DrumFamily) {
  return family === 'rb' ? pad.rb : pad.gh;
}

export function sameOutput(a: proto.IOutput | null | undefined, b: proto.IOutput) {
  const [key, value] = Object.entries(b)[0];
  return a?.[key as keyof proto.IOutput] === value;
}

export function findMux(state: ConfigState) {
  return Object.values(state.deviceStatus).find(
    (d) => d.device.multiplexer?.inputPin === MUX_COM_PIN
  );
}

/** Number of pads for the family that read from the guide's multiplexer */
export function countMappedPads(state: ConfigState, family: DrumFamily) {
  const mux = findMux(state);
  const mappings = state.config.profiles?.[state.currentProfile]?.mappings ?? [];
  return DRUM_PADS.filter((pad) => {
    const output = padOutput(pad, family);
    return (
      output &&
      mux &&
      mappings.some((m) => {
        // On the guide's drum kit, or straight on the multiplexer
        const input = wiredInput(state, m.input);
        return (
          sameOutput(m.mapping, output) &&
          input?.multiplexer?.deviceid === Number(mux.id) &&
          input.multiplexer.channel === pad.channel
        );
      })
    );
  }).length;
}

/**
 * Adds (or updates) the multiplexer on GP26 with select pins GP2 - GP4 (GP5 for 16 channels),
 * switches the profile to the chosen drum kit type, and puts each pad on a drum kit on its multiplexer
 * channel, then maps the profile's lanes from the kit (replacing the mappings it had for them), so running
 * it twice doesn't duplicate them.
 */
export function configureDrumMux(family: DrumFamily, chip: MuxChip) {
  const { sixteen, slow } = MUX_CHIPS.find((c) => c.value === chip)!;
  const muxSettings: proto.IMultiplexerDevice = {
    inputPin: MUX_COM_PIN,
    s0Pin: MUX_SELECT_PINS[0],
    s1Pin: MUX_SELECT_PINS[1],
    s2Pin: MUX_SELECT_PINS[2],
    s3Pin: sixteen ? MUX_SELECT_PINS[3] : -1,
    sixteenChannel: sixteen,
    slow,
  };
  const existing = findMux(useConfigStore.getState());
  let id: string;
  if (existing) {
    id = existing.id;
    // Pins changed on the wiring step stay where they are, only the chip's settings change
    const current = existing.device.multiplexer!;
    const s3Pin = sixteen ? (current.s3Pin >= 0 ? current.s3Pin : MUX_SELECT_PINS[3]) : -1;
    useConfigStore.getState().updateDevice(
      {
        ...existing.device,
        multiplexer: { ...current, sixteenChannel: sixteen, slow, s3Pin },
      },
      id
    );
  } else {
    id = useConfigStore.getState().addDevice('multiplexer', undefined, (device) => {
      device.multiplexer = { ...device.multiplexer, ...muxSettings } as proto.IMultiplexerDevice;
    });
  }

  const subType = family === 'rb' ? proto.SubType.RockBandDrums : proto.SubType.GuitarHeroDrums;
  ensureDeviceToEmulate([subType], subType);

  // The pads go on a drum kit, which the profile is then mapped from
  const kitId = configureDrumKit(family, Number(id));
  const store = useConfigStore.getState();
  const idx = store.currentProfile;
  const profile = store.config.profiles?.[idx];
  const kit = store.deviceStatus[kitId]?.device.drumKit;
  if (!profile || !kit) {
    return;
  }
  store.updateProfile(
    { ...profile, mappings: layoutFromKit(profile.mappings ?? [], Number(kitId), kit, subType) },
    idx
  );
}

/**
 * Puts the family's pads on a drum kit, each on its multiplexer channel: the kit already there (keeping its
 * other pads), or a new one. Returns its id.
 */
function configureDrumKit(family: DrumFamily, muxId: number): string {
  const store = useConfigStore.getState();
  const existing = Object.values(store.deviceStatus).find((d) => d.device.drumKit);
  const guidePads = DRUM_PADS.filter((pad) => padOutput(pad, family));
  const inputOf = (pad: DrumPad): proto.IInput => ({
    multiplexer: { deviceid: muxId, channel: pad.channel },
  });
  if (!existing) {
    return store.addDevice('drumKit', undefined, (device) => {
      device.drumKit = {
        pads: guidePads.map((pad, i) => ({
          ...newDrumPad(i, pad.type[family]),
          input: inputOf(pad),
        })),
      };
    });
  }
  const pads = [...(existing.device.drumKit!.pads ?? [])];
  for (const pad of guidePads) {
    const type = pad.type[family];
    const current = pads.findIndex((p) => p.type === type);
    if (current === -1) {
      pads.push({ ...newDrumPad(nextPadId({ pads }), type), input: inputOf(pad) });
    } else {
      pads[current] = { ...pads[current], input: inputOf(pad) };
    }
  }
  store.updateDevice({ deviceid: existing.device.deviceid, drumKit: { pads } }, existing.id);
  return existing.id;
}
