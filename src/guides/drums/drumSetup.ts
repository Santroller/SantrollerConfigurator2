import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { ensureDeviceToEmulate } from '../adapters/adapterLiveStatus';

// Every piezo goes through one multiplexer, so a single ADC pin reads them all (with velocity)
export const MUX_COM_PIN = 26;
export const MUX_COM_PHYSICAL_PIN = 31;
export const MUX_SELECT_PINS = [2, 3, 4, 5];
export const MUX_SELECT_PHYSICAL_PINS = [4, 5, 6, 7];

// Raw reading (0 - 65535) a hit has to pass, so piezo noise at rest doesn't trigger pads
export const DRUM_THRESHOLD = 4000;
// How long a hit is held (ms), so a game sees even a short strike
const DRUM_DEBOUNCE = 30;

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
}

export const DRUM_PADS: DrumPad[] = [
  {
    key: 'red',
    channel: 0,
    color: 'red',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad },
  },
  {
    key: 'yellow',
    channel: 1,
    color: 'yellow',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad },
  },
  {
    key: 'blue',
    channel: 2,
    color: 'blue',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_BluePad },
  },
  {
    key: 'green',
    channel: 3,
    color: 'green',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad },
    rb: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad },
  },
  {
    key: 'orange',
    channel: 4,
    color: 'orange',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad },
  },
  {
    key: 'kick',
    channel: 5,
    color: 'grape',
    gh: { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal },
    rb: { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal },
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
      mappings.some(
        (m) =>
          sameOutput(m.mapping, output) &&
          m.input?.multiplexer?.deviceid === Number(mux.id) &&
          m.input.multiplexer.channel === pad.channel
      )
    );
  }).length;
}

function padMapping(output: proto.IOutput, input: proto.IInput): proto.IMapping {
  if (output.rbDrumButton != null) {
    // A button can't take a velocity, so the kick fires once the reading passes the threshold
    return {
      mapping: output,
      input,
      trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      triggerValue: DRUM_THRESHOLD,
      debounce: DRUM_DEBOUNCE,
    };
  }
  // Drum axes read like triggers, so min + deadzone is the strike threshold
  return {
    mapping: output,
    input,
    min: 0,
    max: 65535,
    center: 0,
    deadzone: DRUM_THRESHOLD,
    debounce: DRUM_DEBOUNCE,
    peakBased: true,
  };
}

/**
 * Adds (or updates) the multiplexer on GP26 with select pins GP2 - GP4 (GP5 for 16 channels),
 * switches the profile to the chosen drum kit type, and maps each pad to its multiplexer channel.
 * Existing mappings for the same pads are reused, so running it twice doesn't duplicate them.
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

  const store = useConfigStore.getState();
  const idx = store.currentProfile;
  const profile = store.config.profiles?.[idx];
  if (!profile) {
    return;
  }
  const mappings = [...(profile.mappings ?? [])];
  for (const pad of DRUM_PADS) {
    const output = padOutput(pad, family);
    if (!output) {
      continue;
    }
    const mapping = padMapping(output, {
      multiplexer: { deviceid: Number(id), channel: pad.channel },
    });
    const current = mappings.findIndex((m) => sameOutput(m.mapping, output));
    if (current === -1) {
      mappings.push(mapping);
    } else {
      mappings[current] = mapping;
    }
  }
  store.updateProfile({ ...profile, mappings }, idx);
}
