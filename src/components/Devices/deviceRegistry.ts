import i18next from 'i18next';
import { proto } from '@/components/SettingsContext/config';

export type DeviceKind = Exclude<keyof proto.IDevice, 'deviceid'>;

export type DeviceStatusSnapshot = {
  id: string;
  connected: boolean;
  device: proto.IDevice;
  wiiExtType: proto.WiiExtType;
  ps2CntType: proto.PS2ControllerType;
  usbDevices: Record<number, unknown>;
};

type DeviceDefinitions = {
  [Kind in DeviceKind]: {
    create: () => NonNullable<proto.IDevice[Kind]>;
    pins?: (device: NonNullable<proto.IDevice[Kind]>) => number[];
    formatStatus?: (status: DeviceStatusSnapshot, pins: string) => string;
    detail?: (device: NonNullable<proto.IDevice[Kind]>) => string;
  };
};

const i2c = (clock: number) => ({ sda: -1, scl: -1, block: 0, clock });
const spi = (clock: number) => ({ mosi: -1, miso: -1, sck: -1, block: 0, clock });
const uart = (baudrate = 0) => ({ tx: -1, rx: -1, block: 0, baudrate });

const deviceRegistry: DeviceDefinitions = {
  accelerometer: {
    create: () => ({ i2c: i2c(400000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  max1704x: {
    create: () => ({ i2c: i2c(400000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  xboxOneAuth: {
    create: () => ({ i2c: i2c(400000), resetPin: -1 }),
    pins: ({ i2c, resetPin }) => [
      i2c.sda,
      i2c.scl,
      ...(resetPin != null && resetPin >= 0 ? [resetPin] : []),
    ],
  },
  mpr121: {
    create: () => ({ i2c: i2c(400000), touchpadCount: 0, ddrPins: 0, enablePins: 0 }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  wii: {
    create: () => ({
      i2c: i2c(400000),
      mappingMode: proto.MappingMode.PerInput,
      turntablePollIntervalMs: 5,
    }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
    formatStatus: (status, pins) =>
      `${status.wiiExtType !== proto.WiiExtType.WiiNoExtension ? i18next.t('connected', 'Connected') : i18next.t('disconnected', 'Disconnected')}, ${pins}`,
  },
  crazyGuitarNeck: {
    create: () => ({ i2c: i2c(100000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  gh5Neck: {
    create: () => ({ i2c: i2c(150000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  djhTurntable: {
    create: () => ({ i2c: i2c(150000), left: true, pollIntervalMs: 5 }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  bhDrum: {
    create: () => ({ i2c: i2c(100000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  midiSerial: {
    create: () => ({ uart: uart(31250) }),
    pins: ({ uart }) => [uart.tx, uart.rx],
  },
  infiniumFader: {
    create: () => ({ uart: uart(31250) }),
    pins: ({ uart }) => [uart.tx, uart.rx],
  },
  usbHost: {
    create: () => ({
      firstPin: -1,
      enable5v: false,
      dmFirst: false,
      mappingMode: proto.MappingMode.PerInput,
    }),
    pins: ({ firstPin }) => [firstPin, firstPin + 1],
    formatStatus: (status, pins) =>
      `${Object.values(status.usbDevices).length ? i18next.t('connected', 'Connected') : i18next.t('disconnected', 'Disconnected')}, ${pins}`,
  },
  multiplexer: {
    create: () => ({
      s0Pin: -1,
      s1Pin: -1,
      s2Pin: -1,
      s3Pin: -1,
      inputPin: -1,
      sixteenChannel: false,
    }),
    pins: (device) => [
      device.s0Pin,
      device.s1Pin,
      device.s2Pin,
      ...(device.sixteenChannel ? [device.s3Pin] : []),
      device.inputPin,
    ],
    formatStatus: (_, pins) => pins,
  },
  worldTourDrum: {
    create: () => ({ spi: spi(500000), csPin: -1 }),
    pins: ({ spi }) => [spi.mosi, spi.miso, spi.sck],
  },
  psx: {
    create: () => ({
      spi: spi(500000),
      ackPin: -1,
      attPin: -1,
      mappingMode: proto.MappingMode.PerInput,
    }),
    pins: ({ spi, ackPin, attPin }) => [spi.mosi, spi.miso, spi.sck, ackPin, attPin],
    formatStatus: (status, pins) =>
      `${status.ps2CntType !== proto.PS2ControllerType.PS2ControllerTypeUnknown ? i18next.t('connected', 'Connected') : i18next.t('disconnected', 'Disconnected')}, ${pins}`,
  },
  snes: {
    create: () => ({
      clockPin: -1,
      latchPin: -1,
      dataPin: -1,
      mappingMode: proto.MappingMode.PerInput,
    }),
    pins: ({ clockPin, latchPin, dataPin }) => [clockPin, latchPin, dataPin],
  },
  joybus: {
    create: () => ({ dataPin: -1, mappingMode: proto.MappingMode.PerInput }),
    pins: ({ dataPin }) => [dataPin],
  },
  wiiEmulation: {
    create: () => ({ i2c: i2c(400000) }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  psxEmulation: {
    create: () => ({
      commandPin: -1,
      attentionPin: -1,
      acknowledgePin: -1,
      dataPin: -1,
      clockPin: -1,
    }),
    pins: ({ commandPin, attentionPin, acknowledgePin, dataPin, clockPin }) => [
      commandPin,
      attentionPin,
      acknowledgePin,
      dataPin,
      clockPin,
    ],
  },
  joybusEmulation: {
    create: () => ({ dataPin: -1 }),
    pins: ({ dataPin }) => [dataPin],
  },
  peripheral: {
    create: () => ({ i2c: i2c(400000), address: 0x75 }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
    detail: ({ address }) => `0x${address.toString(16)}`,
  },
  crkdNeck: {
    create: () => ({ uart: uart() }),
    pins: ({ uart }) => [uart.tx, uart.rx],
  },
  ads1115: {
    create: () => ({ i2c: i2c(400000), interrupt: -1 }),
    pins: ({ i2c }) => [i2c.sda, i2c.scl],
  },
  encoder: { create: () => ({ dataPin: -1 }), pins: ({ dataPin }) => [dataPin, dataPin + 1] },
  debug: { create: () => ({ uart: uart() }), pins: ({ uart }) => [uart.tx, uart.rx] },
  ws2812: {
    create: () => ({ pin: -1, count: 0, type: proto.WS2812Type.Ws2812Rgb }),
    pins: ({ pin }) => [pin],
    formatStatus: (_, pins) => pins,
  },
  apa102: {
    create: () => ({ spi: spi(12000000), count: 0, type: proto.APA102Type.Apa102Rgb }),
    pins: ({ spi }) => [spi.mosi, spi.sck],
    formatStatus: (_, pins) => pins,
  },
  stp16cpc: {
    create: () => ({ spi: spi(500000), oe: -1, le: -1, count: 0 }),
    pins: ({ spi, le, oe }) => [spi.mosi, spi.miso, spi.sck, le, oe],
    formatStatus: (_, pins) => pins,
  },
  bt: {
    create: () => ({}),
    pins: ({ syncPin }) => (syncPin != null && syncPin >= 0 ? [syncPin] : []),
  },
  protarNeck: {
    create: () => ({ spi: spi(100000), attPin: -1 }),
    pins: ({ spi, attPin }) => [spi.mosi, spi.miso, spi.sck, attPin],
  },
  vtechExpander: {
    create: () => ({ spi: spi(10000), attPin: -1 }),
    pins: ({ spi, attPin }) => [spi.mosi, spi.miso, spi.sck, attPin],
  },
  matrix: {
    create: () => ({ inPins: 0, outPins: 0 }),
    pins: ({ inPins, outPins }) =>
      Array.from(Array(32).keys()).filter((pin) => (outPins | inPins) & (1 << pin)),
    formatStatus: (_, pins) => pins,
  },
  switchNetwork: {
    create: () => ({ pins: 0, buttons: [] }),
    pins: ({ pins }) => Array.from(Array(32).keys()).filter((pin) => pins & (1 << pin)),
    formatStatus: (_, pins) => pins,
  },
  crkdDrum: {
    create: () => ({ uart: uart() }),
    pins: ({ uart }) => [uart.tx, uart.rx],
  },
  cycle: {
    create: () => ({ type: proto.CycleType.custom, values: [0] }),
    formatStatus: (status) => status.id,
  },
  toggle: { create: () => ({}) },
  dmx: { create: () => ({ pin: -1, channelCount: 1 }) },
  xbox360Rf: {
    create: () => ({
      type: proto.Xbox360RfModuleType.Xbox360RfFat,
      dataPin: -1,
      clockPin: -1,
      syncPin: -1,
    }),
    pins: ({ dataPin, clockPin, syncPin }) => [dataPin, clockPin, syncPin ?? -1],
    formatStatus: (_, pins) => pins,
  },
  adcBattery: {
    // GP29 reads VSYS through the Pico's divide by 3, and 3.3V to 4.2V covers a single LiPo cell
    create: () => ({ pin: 29, dividerX1000: 3000, emptyMv: 3300, fullMv: 4200 }),
    pins: ({ pin }) => [pin],
    formatStatus: (_, pins) => pins,
  },
  powerManagement: {
    // Nothing is driven until a pin is picked
    create: () => ({
      heartbeatPin: -1,
      heartbeatPeriodMs: 10000,
      heartbeatPulseMs: 100,
      heartbeatTimeoutMs: 60000,
      inactivityPin: -1,
      inactivityTimeoutMs: 300000,
      inactivityPulseCount: 0,
      inactivityPulsePeriodMs: 1000,
      inactivityPulseMs: 200,
    }),
    pins: ({ heartbeatPin, inactivityPin }) =>
      [heartbeatPin ?? -1, inactivityPin ?? -1].filter((pin) => pin >= 0),
    formatStatus: (_, pins) => pins,
  },
};

export const deviceKinds = Object.keys(deviceRegistry) as DeviceKind[];

const nonInputDeviceKinds = new Set<DeviceKind>([
  'debug',
  'xboxOneAuth',
  'ws2812',
  'apa102',
  'stp16cpc',
  'dmx',
  'psxEmulation',
  'wiiEmulation',
  'xbox360Rf',
  'powerManagement',
  'adcBattery',
  'max1704x',
]);
const ledDeviceKinds = new Set<DeviceKind>(['ws2812', 'apa102', 'vtechExpander', 'stp16cpc']);
const defaultMappingDeviceKinds = new Set<DeviceKind>([
  'crkdDrum',
  'crkdNeck',
  'wii',
  'psx',
  'gh5Neck',
  'crazyGuitarNeck',
  'djhTurntable',
  'protarNeck',
  'midiSerial',
  'bhDrum',
  'worldTourDrum',
  'usbHost',
  'bt',
]);

export function isDeviceKind(value: string): value is DeviceKind {
  return value in deviceRegistry;
}

export function isInputDeviceKind(value: string): boolean {
  return isDeviceKind(value) && !nonInputDeviceKinds.has(value);
}

export function isLedDeviceKind(value: string): boolean {
  return isDeviceKind(value) && ledDeviceKinds.has(value);
}

export function hasDefaultMappings(value: string): boolean {
  return isDeviceKind(value) && defaultMappingDeviceKinds.has(value);
}

export function createDeviceConfig(kind: DeviceKind, deviceid: number): proto.IDevice {
  return {
    deviceid,
    [kind]: deviceRegistry[kind].create(),
  } as proto.IDevice;
}

function resolveDevicePins<Kind extends DeviceKind>(kind: Kind, device: proto.IDevice): number[] {
  const value = device[kind];
  return value ? (deviceRegistry[kind].pins?.(value) ?? []) : [];
}

function resolveDeviceDetail<Kind extends DeviceKind>(kind: Kind, device: proto.IDevice): string {
  const value = device[kind];
  return value ? (deviceRegistry[kind].detail?.(value) ?? '') : '';
}

export function getDevicePins(device: proto.IDevice): number[] {
  const kind = deviceKinds.find((candidate) => device[candidate] != null);
  return kind ? resolveDevicePins(kind, device) : [];
}

export function getDeviceStatusLabel(status: DeviceStatusSnapshot): string {
  const kind = deviceKinds.find((candidate) => status.device[candidate] != null);
  const pins = getDevicePins(status.device)
    .map((pin) => `GP${pin}`)
    .join(', ');
  if (!kind) {
    return `${status.connected ? i18next.t('connected', 'Connected') : i18next.t('disconnected', 'Disconnected')}, ${pins}`;
  }

  const label = deviceRegistry[kind].formatStatus
    ? deviceRegistry[kind].formatStatus(status, pins)
    : `${status.connected ? i18next.t('connected', 'Connected') : i18next.t('disconnected', 'Disconnected')}, ${pins}`;
  const detail = resolveDeviceDetail(kind, status.device);
  return detail ? `${label}, ${detail}` : label;
}
