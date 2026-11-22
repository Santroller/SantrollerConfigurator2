import { proto } from '@/components/SettingsContext/config';
import { deviceKinds, getDeviceName } from './deviceRegistry';

// The firmware gives each hardware I2C / SPI / UART block one set of pins, so devices sharing a
// block have to be on the same pins (and, for I2C, it runs the bus at the slowest of their clocks).
// Devices whose gates can never be open at once are never loaded together, so they can use the
// block however they like.

export type BusType = 'i2c' | 'spi' | 'uart';

export type Bus = {
  type: BusType;
  block: number;
  // The pins by role (sda / scl, mosi / miso / sck, tx / rx), -1 when unused
  pins: Record<string, number>;
  // Hz for I2C and SPI, the baud rate for UART
  clock: number;
};

// Just what's needed of a DeviceStatus, so this doesn't pull in the settings store
export type BusDeviceStatus = {
  type: string;
  device: proto.IDevice;
  parentId?: string;
};

export type BusConflict = {
  id: string;
  title: string;
  bus: Bus;
};

const pinsUsed = (pins: Record<string, number>) => Object.values(pins).some((pin) => pin >= 0);

/** The I2C / SPI / UART buses a device drives, leaving out ones without any pins picked */
export function deviceBuses(device: proto.IDevice): Bus[] {
  const kind = deviceKinds.find((candidate) => device[candidate] != null);
  const value = kind
    ? (device[kind] as {
        i2c?: proto.II2CDevice | null;
        spi?: proto.ISPIDevice | null;
        uart?: proto.IUARTDevice | null;
      })
    : null;
  if (!value) {
    return [];
  }
  const buses: Bus[] = [];
  // A display wired over SPI ignores its I2C settings
  if (value.i2c && !(kind === 'display' && value.spi)) {
    buses.push({
      type: 'i2c',
      block: value.i2c.block,
      pins: { sda: value.i2c.sda, scl: value.i2c.scl },
      clock: value.i2c.clock,
    });
  }
  if (value.spi) {
    buses.push({
      type: 'spi',
      block: value.spi.block,
      pins: { mosi: value.spi.mosi, miso: value.spi.miso, sck: value.spi.sck },
      clock: value.spi.clock,
    });
  }
  if (value.uart) {
    buses.push({
      type: 'uart',
      block: value.uart.block,
      pins: { tx: value.uart.tx, rx: value.uart.rx },
      clock: value.uart.baudrate,
    });
  }
  return buses.filter((bus) => pinsUsed(bus.pins));
}

// Digital gates are active low with a pull up, and active high otherwise (see device_gate.hpp)
const gateActiveHigh = (gate: proto.IDeviceGate) => gate.pinMode !== proto.PinMode.PullUp;

/**
 * Whether two gates can never both be open: the same pin, read for opposite levels or for voltage
 * ranges that don't overlap. Anything else (no gate, different pins) could load both devices.
 */
export function gatesExclusive(
  a: proto.IDeviceGate | null | undefined,
  b: proto.IDeviceGate | null | undefined
): boolean {
  if (!a || !b || a.pin < 0 || a.pin !== b.pin) {
    return false;
  }
  if (!a.analog && !b.analog) {
    return gateActiveHigh(a) !== gateActiveHigh(b);
  }
  if (a.analog && b.analog) {
    const aMin = a.minMv ?? 0;
    const aMax = a.maxMv ?? 0;
    const bMin = b.minMv ?? 0;
    const bMax = b.maxMv ?? 0;
    return aMax < bMin || bMax < aMin;
  }
  return false;
}

// Pins for the same role that are both picked and differ. Roles only one of them uses can share
const pinsClash = (a: Bus, b: Bus) =>
  Object.keys(a.pins).some(
    (role) => a.pins[role] >= 0 && b.pins[role] >= 0 && a.pins[role] !== b.pins[role]
  );

/** The other devices that could be loaded alongside one with this gate, on the same chip */
function concurrentDevices(
  statuses: Record<string, BusDeviceStatus>,
  gate: proto.IDeviceGate | null | undefined,
  parentId: string | undefined,
  exclude: (id: string, status: BusDeviceStatus) => boolean
) {
  return Object.entries(statuses).filter(
    ([id, status]) =>
      status.parentId === parentId &&
      !exclude(id, status) &&
      !gatesExclusive(gate, status.device.gate)
  );
}

/**
 * Devices using the same block as `bus` on different pins, that could be loaded at the same time
 * as a device with `gate` on the chip `parentId` (undefined for the main Pico)
 */
export function findBusConflicts(
  statuses: Record<string, BusDeviceStatus>,
  bus: Bus,
  gate: proto.IDeviceGate | null | undefined,
  parentId: string | undefined,
  exclude: (id: string, status: BusDeviceStatus) => boolean = () => false
): BusConflict[] {
  const conflicts: BusConflict[] = [];
  for (const [id, status] of concurrentDevices(statuses, gate, parentId, exclude)) {
    for (const other of deviceBuses(status.device)) {
      if (other.type === bus.type && other.block === bus.block && pinsClash(bus, other)) {
        conflicts.push({ id, title: getDeviceName(status.type, status.device), bus: other });
      }
    }
  }
  return conflicts;
}

/** Devices that put a configured device's bus of `type` on different pins to it */
export function deviceBusConflicts(
  statuses: Record<string, BusDeviceStatus>,
  id: string,
  type: BusType
): BusConflict[] {
  const status = statuses[id];
  const bus = status && deviceBuses(status.device).find((candidate) => candidate.type === type);
  if (!bus) {
    return [];
  }
  return findBusConflicts(
    statuses,
    bus,
    status.device.gate,
    status.parentId,
    (other) => other === id
  );
}

/**
 * The clock a device's I2C bus runs at, the slowest of the devices that could be loaded on it with
 * this one, and which of them are slower than it asked for. Null without an I2C bus
 */
export function i2cBusClock(
  statuses: Record<string, BusDeviceStatus>,
  id: string
): { clock: number; slower: string[] } | null {
  const status = statuses[id];
  const bus = status && deviceBuses(status.device).find((candidate) => candidate.type === 'i2c');
  if (!bus) {
    return null;
  }
  let clock = bus.clock;
  const slower: string[] = [];
  for (const [, other] of concurrentDevices(
    statuses,
    status.device.gate,
    status.parentId,
    (otherId) => otherId === id
  )) {
    const otherBus = deviceBuses(other.device).find(
      (candidate) => candidate.type === 'i2c' && candidate.block === bus.block
    );
    if (otherBus && otherBus.clock > 0 && otherBus.clock < bus.clock) {
      clock = Math.min(clock, otherBus.clock);
      slower.push(getDeviceName(other.type, other.device));
    }
  }
  return { clock, slower };
}
