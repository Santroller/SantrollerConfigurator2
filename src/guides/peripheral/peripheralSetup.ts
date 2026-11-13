import { create } from 'zustand';
import { getDevicePins } from '@/components/Devices/deviceRegistry';
import { DEFAULT_PERIPHERAL_BOOT, PeripheralBootPins } from '@/components/Devices/peripheralUf2';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { I2CGroups, SdaPins } from '@/devices/pico/pins';
import { findDeviceStatus } from '../guideConfig';
import { PICO_PHYSICAL_PINS } from '../wiringText';

const BOOT_STORAGE_KEY = 'santroller.guides.peripheral.boot';

function loadBootPins(): PeripheralBootPins {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOT_STORAGE_KEY) ?? 'null');
    return saved ? { ...DEFAULT_PERIPHERAL_BOOT, ...saved } : DEFAULT_PERIPHERAL_BOOT;
  } catch {
    return DEFAULT_PERIPHERAL_BOOT;
  }
}

// The secondary Pico's pins only live in the UF2 it's flashed with, so the guide remembers what it
// was flashed with for the wiring step
export const usePeripheralBootPins = create<{
  pins: PeripheralBootPins;
  setPins: (pins: Partial<PeripheralBootPins>) => void;
}>((set, get) => ({
  pins: loadBootPins(),
  setPins: (changes) => {
    const pins = { ...get().pins, ...changes };
    try {
      localStorage.setItem(BOOT_STORAGE_KEY, JSON.stringify(pins));
    } catch {
      //
    }
    set({ pins });
  },
}));

/** SDA pins on the Pico's header; SCL is always the next pin */
export const HEADER_SDA_PINS = Object.keys(SdaPins)
  .map(Number)
  .filter(
    (pin) => PICO_PHYSICAL_PINS[pin] !== undefined && PICO_PHYSICAL_PINS[pin + 1] !== undefined
  );

export const HEADER_PINS = Object.keys(PICO_PHYSICAL_PINS).map(Number);

// SDA candidates for the main Pico's side of the bus, skipping GP0/1 as they're often buttons
const MAIN_SDA_CANDIDATES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 26, 0, 2];

export function findPeripheral(state: ConfigState) {
  return findDeviceStatus(state, 'peripheral');
}

/** The I2C pins the guide adds the peripheral with, kept off pins other devices already use */
function pickMainI2c(state: ConfigState) {
  const taken = new Set(
    Object.values(state.deviceStatus)
      .filter((status) => !status.parentId)
      .flatMap((status) => getDevicePins(status.device))
  );
  const sda = MAIN_SDA_CANDIDATES.find((pin) => !taken.has(pin) && !taken.has(pin + 1)) ?? 4;
  return { sda, scl: sda + 1, block: parseInt(I2CGroups[sda], 10) };
}

/** Adds the peripheral device to the main Pico unless there already is one */
export function ensurePeripheralDevice(): string {
  const store = useConfigStore.getState();
  const existing = findPeripheral(store);
  if (existing) {
    return existing.id;
  }
  const i2c = pickMainI2c(store);
  return store.addDevice('peripheral', undefined, (device) => {
    device.peripheral!.i2c = { ...device.peripheral!.i2c!, ...i2c };
  });
}
