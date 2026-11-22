import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  BusDeviceStatus,
  deviceBusConflicts,
  deviceBuses,
  gatesExclusive,
  i2cBusClock,
} from './busConflicts';

const i2c = (sda: number, scl: number, block: number, clock = 400000) => ({
  sda,
  scl,
  block,
  clock,
});

const wii = (bus: proto.II2CDevice, gate?: proto.IDeviceGate): BusDeviceStatus => ({
  type: 'wii',
  device: {
    deviceid: 1,
    wii: { i2c: bus, mappingMode: proto.MappingMode.PerInput },
    gate,
  } as proto.IDevice,
});

const display = (bus: proto.II2CDevice, gate?: proto.IDeviceGate): BusDeviceStatus => ({
  type: 'display',
  device: {
    deviceid: 2,
    display: { i2c: bus, controller: proto.DisplayController.DisplaySSD1306 },
    gate,
  } as proto.IDevice,
});

const digitalGate = (pin: number, pinMode: proto.PinMode): proto.IDeviceGate => ({
  pin,
  pinMode,
  analog: false,
});

const analogGate = (pin: number, minMv: number, maxMv: number): proto.IDeviceGate => ({
  pin,
  pinMode: proto.PinMode.Floating,
  analog: true,
  minMv,
  maxMv,
});

describe('deviceBuses', () => {
  it('skips a display wired over SPI', () => {
    const device = {
      deviceid: 1,
      display: {
        i2c: i2c(-1, -1, 0),
        spi: { mosi: 3, miso: -1, sck: 2, block: 0, clock: 8000000 },
      },
    } as proto.IDevice;
    expect(deviceBuses(device).map((bus) => bus.type)).toEqual(['spi']);
  });

  it('leaves out buses without pins', () => {
    expect(deviceBuses(wii(i2c(-1, -1, 0)).device)).toEqual([]);
  });
});

describe('gatesExclusive', () => {
  it('needs both gates on the same pin', () => {
    expect(gatesExclusive(undefined, digitalGate(5, proto.PinMode.PullUp))).toBe(false);
    expect(
      gatesExclusive(digitalGate(5, proto.PinMode.PullUp), digitalGate(6, proto.PinMode.PullDown))
    ).toBe(false);
  });

  it('separates opposite digital levels', () => {
    expect(
      gatesExclusive(digitalGate(5, proto.PinMode.PullUp), digitalGate(5, proto.PinMode.PullDown))
    ).toBe(true);
    // Floating gates are active high, like pull downs
    expect(
      gatesExclusive(digitalGate(5, proto.PinMode.PullDown), digitalGate(5, proto.PinMode.Floating))
    ).toBe(false);
  });

  it('separates analog ranges that do not overlap', () => {
    expect(gatesExclusive(analogGate(26, 0, 1000), analogGate(26, 1001, 3300))).toBe(true);
    expect(gatesExclusive(analogGate(26, 0, 1000), analogGate(26, 1000, 3300))).toBe(false);
  });
});

describe('deviceBusConflicts', () => {
  it('flags the same block on different pins', () => {
    const statuses = { a: wii(i2c(18, 19, 1)), b: display(i2c(2, 3, 1)) };
    expect(deviceBusConflicts(statuses, 'a', 'i2c').map((conflict) => conflict.id)).toEqual(['b']);
  });

  it('allows sharing the same pins, or different blocks', () => {
    expect(
      deviceBusConflicts({ a: wii(i2c(18, 19, 1)), b: display(i2c(18, 19, 1)) }, 'a', 'i2c')
    ).toEqual([]);
    expect(
      deviceBusConflicts({ a: wii(i2c(18, 19, 1)), b: display(i2c(20, 21, 0)) }, 'a', 'i2c')
    ).toEqual([]);
  });

  it('allows devices whose gates are never open together', () => {
    const statuses = {
      a: wii(i2c(18, 19, 1), digitalGate(10, proto.PinMode.PullUp)),
      b: display(i2c(2, 3, 1), digitalGate(10, proto.PinMode.PullDown)),
    };
    expect(deviceBusConflicts(statuses, 'a', 'i2c')).toEqual([]);
  });

  it('only compares devices on the same chip', () => {
    const statuses = { a: wii(i2c(18, 19, 1)), b: { ...display(i2c(2, 3, 1)), parentId: 'x' } };
    expect(deviceBusConflicts(statuses, 'a', 'i2c')).toEqual([]);
  });
});

describe('i2cBusClock', () => {
  it('runs at the slowest clock of the devices that load together', () => {
    const statuses = { a: display(i2c(18, 19, 1, 400000)), b: wii(i2c(18, 19, 1, 100000)) };
    expect(i2cBusClock(statuses, 'a')?.clock).toBe(100000);
    expect(i2cBusClock(statuses, 'a')?.slower).toHaveLength(1);
    expect(i2cBusClock(statuses, 'b')).toEqual({ clock: 100000, slower: [] });
  });

  it('ignores slower devices behind an exclusive gate', () => {
    const statuses = {
      a: display(i2c(18, 19, 1, 400000), analogGate(26, 0, 1000)),
      b: wii(i2c(18, 19, 1, 100000), analogGate(26, 2000, 3300)),
    };
    expect(i2cBusClock(statuses, 'a')).toEqual({ clock: 400000, slower: [] });
  });
});
