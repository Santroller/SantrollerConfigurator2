import { create } from 'zustand';
import { getDevicePins } from '@/components/Devices/deviceRegistry';
import { migrateSlotIds } from '@/components/Inputs/slotRemap';
import { retargetRule } from '@/components/SettingsContext/assignmentTargets';
import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { findDeviceStatus } from '../guideConfig';

// GP29 reads VSYS through the Pico's own divide by 3 (the adcBattery defaults in deviceRegistry).
// On a Pico W it is shared with the wireless chip, which the firmware handles while bluetooth is
// set up.
export const VSYS_ADC_PIN = 29;

// The MAX1704x gets its own bus on I2C0, GP20 (SDA) / GP21 (SCL), which no other guide uses
// (GP18 / GP19 is the Wii / platter / drum brain bus, GP2 / GP3 the USB host port)
export const GAUGE_I2C = { sda: 20, scl: 21, block: 0 };
export const GAUGE_I2C_PHYSICAL = { sda: 26, scl: 27 };

export type BatterySensor = 'adc' | 'max1704x';
export type WirelessBoard = 'wireless' | 'plain';

const BOARD_STORAGE_KEY = 'santroller.guides.wireless.board';

function loadBoard(): WirelessBoard | null {
  try {
    const saved = localStorage.getItem(BOARD_STORAGE_KEY);
    return saved === 'wireless' || saved === 'plain' ? saved : null;
  } catch {
    return null;
  }
}

// The firmware is one build for both the Pico and Pico W (it only finds out whether the wireless
// chip is there when bluetooth starts, and falls back to a USB bluetooth adapter if it isn't), so
// the configurator can't tell them apart. The user says which board they have instead.
export const useWirelessBoard = create<{
  board: WirelessBoard | null;
  setBoard: (board: WirelessBoard) => void;
}>((set) => ({
  board: loadBoard(),
  setBoard: (board) => {
    try {
      localStorage.setItem(BOARD_STORAGE_KEY, board);
    } catch {
      // Ignore storage issues
    }
    set({ board });
  },
}));

// The firmware reports the board it was built for (pico_w_compat / pico2_w_compat), which only
// tells the chip apart, not whether the wireless chip is fitted
export function boardChip(type: string | undefined): 'rp2040' | 'rp2350' | undefined {
  if (!type) {
    return undefined;
  }
  if (type.startsWith('pico2')) {
    return 'rp2350';
  }
  if (type.startsWith('pico')) {
    return 'rp2040';
  }
  return undefined;
}

const BT_OUTPUT: proto.IProfileAssignmentInfo = { bluetooth: proto.BluetoothMode.BTStandard };

const defaultConsoleAssignment: proto.IProfileAssignmentInfo = {
  consoleType: {
    consoleType: null,
    forcedType: null,
    xinputOnWindows: true,
    ps4OrPs5Mode: false,
  },
};

export function profileHasBluetoothOutput(state: ConfigState): boolean {
  const profile = state.config.profiles?.[state.currentProfile];
  return (profile?.assignments ?? []).some((list) =>
    (list.assignments ?? []).some((item) => item.bluetooth != null)
  );
}

export function profileBluetoothMode(state: ConfigState): proto.BluetoothMode | undefined {
  const profile = state.config.profiles?.[state.currentProfile];
  for (const list of profile?.assignments ?? []) {
    for (const item of list.assignments ?? []) {
      if (item.bluetooth != null) {
        return item.bluetooth;
      }
    }
  }
  return undefined;
}

/**
 * Makes the active profile act as a Bluetooth controller: adds the bt device (the Pico W's radio)
 * and a Bluetooth output to the profile.
 *
 * A rule has one output, and only one rule per profile is ever claimed. A USB rule stops matching
 * without a USB host, so each USB rule gets a Bluetooth copy right after it, reading the same
 * devices: the controller is USB while plugged into something and Bluetooth otherwise.
 */
export function enableBluetoothOutput() {
  const store = useConfigStore.getState();
  if (!findDeviceStatus(store, 'bt')) {
    store.addDevice('bt');
  }
  const state = useConfigStore.getState();
  const profileIdx = state.currentProfile;
  const current = state.config.profiles?.[profileIdx];
  if (!current || profileHasBluetoothOutput(state)) {
    return;
  }
  // Copies of a rule only keep reading the same devices with profile wide slot ids
  const profile = migrateSlotIds(current);
  const lists = profile.assignments ?? [];
  const isUsbList = (list: proto.IProfileAssignment) =>
    (list.assignments ?? []).some((item) => item.consoleType != null);
  const assignments = lists.some(isUsbList)
    ? lists.flatMap((list) =>
        isUsbList(list)
          ? [list, { assignments: retargetRule(list.assignments ?? [], BT_OUTPUT) }]
          : [list]
      )
    : [...lists, { assignments: [defaultConsoleAssignment] }, { assignments: [BT_OUTPUT] }];
  state.updateProfile({ ...profile, assignments }, profileIdx);
}

export function findBatteryStatus(state: ConfigState) {
  return findDeviceStatus(state, 'adcBattery') ?? findDeviceStatus(state, 'max1704x');
}

export function addAdcBattery(): string {
  const store = useConfigStore.getState();
  // The registry's defaults are GP29 / VSYS, divide by 3, 3300 to 4200 mV for one LiPo cell
  return findDeviceStatus(store, 'adcBattery')?.id ?? store.addDevice('adcBattery');
}

export function addFuelGauge(): string {
  const store = useConfigStore.getState();
  return (
    findDeviceStatus(store, 'max1704x')?.id ??
    store.addDevice('max1704x', undefined, (device) => {
      device.max1704x!.i2c = { ...device.max1704x!.i2c, ...GAUGE_I2C };
    })
  );
}

function collectGpioPins(value: unknown, pins: Set<number>) {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectGpioPins(item, pins));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'gpio' && child && typeof child === 'object') {
      const pin = (child as { pin?: unknown }).pin;
      if (typeof pin === 'number' && pin >= 0) {
        pins.add(pin);
      }
    }
    collectGpioPins(child, pins);
  }
}

/**
 * What the fuel gauge's GP20 / GP21 bus would clash with: other devices or GPIO inputs on those
 * pins, or another device already driving I2C0 on different pins. Empty when it is safe to add.
 */
export function fuelGaugeConflicts(
  deviceStatus: ConfigState['deviceStatus'],
  profiles: proto.IProfile[] | null | undefined
): string[] {
  const conflicts = new Set<string>();
  const gaugePins = [GAUGE_I2C.sda, GAUGE_I2C.scl];
  for (const status of Object.values(deviceStatus)) {
    if (status.device.max1704x) {
      continue;
    }
    const kind = Object.keys(status.device).find(
      (key) =>
        key !== 'deviceid' && key !== 'gate' && status.device[key as keyof proto.IDevice] != null
    );
    const value = kind ? (status.device[kind as keyof proto.IDevice] as { i2c?: unknown }) : null;
    const i2c = value?.i2c as proto.II2CDevice | undefined;
    if (
      i2c &&
      i2c.block === GAUGE_I2C.block &&
      (i2c.sda !== GAUGE_I2C.sda || i2c.scl !== GAUGE_I2C.scl)
    ) {
      conflicts.add(`I2C0 (GP${i2c.sda} / GP${i2c.scl})`);
    }
    for (const pin of getDevicePins(status.device)) {
      if (gaugePins.includes(pin)) {
        conflicts.add(`GP${pin}`);
      }
    }
  }
  const gpioPins = new Set<number>();
  for (const profile of profiles ?? []) {
    collectGpioPins(profile.mappings, gpioPins);
  }
  for (const pin of gaugePins) {
    if (gpioPins.has(pin)) {
      conflicts.add(`GP${pin}`);
    }
  }
  return [...conflicts];
}

// Mirrors InactivityManager::configure: sleep only happens with both a timeout and a wake pin
export function sleepConfigured(state: ConfigState): boolean {
  const inactivity = state.config.inactivity;
  return (inactivity?.sleepTimeoutSec ?? 0) > 0 && (inactivity?.wakePin ?? -1) >= 0;
}
