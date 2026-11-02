import { getDevicePins } from '@/components/Devices/deviceRegistry';
import { getProfileSlots } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';
import {
  ConfigState,
  isMidiOutDevice,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import {
  assignMidiDrumSlot,
  ensureDrumKitProfile,
  hasMidiPadMappings,
} from '../bhdrums/bhDrumSetup';

// MIDI runs at 31250 baud, 8N1
export const MIDI_BAUD = 31250;
// General MIDI puts drums on channel 10, which is what most e-drum kits send on
export const DEFAULT_MIDI_CHANNEL = 10;

export interface MidiDinPinOption {
  // UART RX, which the optocoupler's output drives. MIDI in never transmits, so TX is left unset
  rx: number;
  block: number;
  rxPhysical: number;
}

// The Pico's UART RX pins (src/devices/pico/pins.ts UARTPins), in the order setup prefers them.
// GP1 (UART0) is first because no other guide uses it, while GP9 / GP13 are guitar and drum button
// pins, GP21 is the wireless guide's fuel gauge bus and GP5 is a fret / SPI pin.
export const MIDI_DIN_PINS: MidiDinPinOption[] = [
  { rx: 1, block: 0, rxPhysical: 2 },
  { rx: 17, block: 0, rxPhysical: 22 },
  { rx: 9, block: 1, rxPhysical: 12 },
  { rx: 13, block: 0, rxPhysical: 17 },
  { rx: 21, block: 1, rxPhysical: 27 },
  { rx: 5, block: 1, rxPhysical: 7 },
];

export function findMidiDin(state: ConfigState) {
  return Object.values(state.deviceStatus).find(
    (d) => d.device.midiSerial != null && !isMidiOutDevice(d.device)
  );
}

export function midiDinPinOption(rx: number | undefined) {
  return MIDI_DIN_PINS.find((option) => option.rx === rx);
}

type DeviceStatuses = ConfigState['deviceStatus'];

function otherDevices(deviceStatus: DeviceStatuses) {
  return Object.values(deviceStatus).filter(
    (status) => !status.parentId && status.device.midiSerial == null
  );
}

/** Pins of the option that other devices already use */
export function midiDinPinConflicts(
  deviceStatus: DeviceStatuses,
  option: MidiDinPinOption
): number[] {
  const used = new Set(
    otherDevices(deviceStatus).flatMap((status) => getDevicePins(status.device))
  );
  return [option.rx].filter((pin) => used.has(pin));
}

/** Whether another device already runs the option's UART block */
export function midiDinUartInUse(deviceStatus: DeviceStatuses, option: MidiDinPinOption) {
  return otherDevices(deviceStatus).some((status) =>
    Object.values(status.device).some((config) => {
      const uart = (config as { uart?: proto.IUARTDevice } | null)?.uart;
      return uart?.block === option.block && (uart.rx ?? -1) >= 0;
    })
  );
}

/** The first pin option that is free, falling back to GP1 */
export function pickMidiDinPins(state: ConfigState): MidiDinPinOption {
  return (
    MIDI_DIN_PINS.find(
      (option) =>
        !midiDinPinConflicts(state.deviceStatus, option).length &&
        !midiDinUartInUse(state.deviceStatus, option)
    ) ?? MIDI_DIN_PINS[0]
  );
}

/** The channel of the profile's MIDI slot, if it has one */
export function midiSlotChannel(state: ConfigState): number | undefined {
  const profile = state.config.profiles?.[state.currentProfile];
  for (const list of profile?.assignments ?? []) {
    for (const item of list.assignments ?? []) {
      if (item.midiChannel != null) {
        return item.midiChannel;
      }
    }
  }
  return undefined;
}

export function isMidiDinConfigured(state: ConfigState) {
  const uart = findMidiDin(state)?.device.midiSerial?.uart;
  return (
    uart != null &&
    midiDinPinOption(uart.rx) !== undefined &&
    midiSlotChannel(state) !== undefined &&
    hasMidiPadMappings(state)
  );
}

function withChannel(midi: proto.IMidiInput, channel: number): proto.IMidiInput {
  if (midi.midiNote) {
    return { ...midi, midiNote: { ...midi.midiNote, channel } };
  }
  if (midi.midiControlChange) {
    return { ...midi, midiControlChange: { ...midi.midiControlChange, channel } };
  }
  if (midi.midiPitchBend) {
    return { ...midi, midiPitchBend: { ...midi.midiPitchBend, channel } };
  }
  return midi;
}

/**
 * Moves the profile's MIDI slot, and every mapping reading a MIDI slot, onto one channel. The
 * firmware filters twice: the slot only claims a MIDI device once it has seen a message on the
 * slot's channel, and each note mapping only reads notes on its own channel. The MIDI drum
 * defaults are always written for channel 10, so both are rewritten here.
 */
export function applyMidiChannel(channel: number) {
  const store = useConfigStore.getState();
  const idx = store.currentProfile;
  const profile = store.config.profiles?.[idx];
  if (!profile) {
    return;
  }
  const midiSlots = new Set(
    getProfileSlots(profile)
      .filter((slot) => slot.deviceKind === 'midi')
      .map((slot) => slot.slotId)
  );
  const assignments = (profile.assignments ?? []).map((list) => ({
    ...list,
    assignments: (list.assignments ?? []).map((item) =>
      item.midiChannel != null ? { ...item, midiChannel: channel } : item
    ),
  }));
  const mappings = (profile.mappings ?? []).map((mapping) => {
    const midi = mapping.input?.midi;
    if (
      !midi ||
      midi.sourceType !== proto.MidiInputSourceType.MidiInputSourceType_MIDI ||
      !midiSlots.has(midi.deviceid)
    ) {
      return mapping;
    }
    return { ...mapping, input: { ...mapping.input, midi: withChannel(midi, channel) } };
  });
  store.updateProfile({ ...profile, assignments, mappings }, idx);
}

/**
 * Adds the 5-pin DIN MIDI input (a midiSerial device on the chosen UART RX pin at 31250 baud), or
 * moves it to that pin. This is all the wiring step does, as the pin is part of the wiring.
 */
export function ensureMidiDinDevice(option: MidiDinPinOption): string {
  const uart: proto.IUARTDevice = {
    block: option.block,
    tx: -1,
    rx: option.rx,
    baudrate: MIDI_BAUD,
  };
  const direction = proto.MidiSerialDirection.MidiSerialIn;
  const store = useConfigStore.getState();
  const existing = findMidiDin(store);
  if (!existing) {
    return store.addDevice('midiSerial', undefined, (device) => {
      device.midiSerial!.uart = uart;
      device.midiSerial!.direction = direction;
    });
  }
  const current = existing.device.midiSerial!;
  if (
    current.uart.rx !== uart.rx ||
    current.uart.tx !== uart.tx ||
    current.uart.block !== uart.block ||
    current.uart.baudrate !== uart.baudrate
  ) {
    store.updateDevice(
      { ...existing.device, midiSerial: { ...current, uart, direction } },
      existing.id
    );
  }
  return existing.id;
}

/**
 * Makes sure the MIDI input is there, gives the profile a MIDI slot for it, loads the MIDI drum
 * defaults and moves the slot and the pad mappings onto the chosen channel. The profile is switched
 * to a Guitar Hero kit first unless it already emulates a drum kit.
 */
export function addMidiDinInput(option: MidiDinPinOption, channel: number) {
  ensureDrumKitProfile();
  const id = ensureMidiDinDevice(option);
  assignMidiDrumSlot(id);
  applyMidiChannel(channel);
}
