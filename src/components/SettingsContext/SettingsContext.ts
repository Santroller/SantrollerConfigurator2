/// <reference types="w3c-web-hid" />
import { immerable } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {} from '@redux-devtools/extension';

import { CRC32 } from '@/CRC32.js';
import { proto } from './config.js';

export * from './config.js';
export class DeviceStatus {
  [immerable] = true;
  constructor(id: string, type: string, device: proto.IDevice) {
    this.id = id;
    this.type = type;
    this.device = device;
  }
  id: string;
  type: string;
  connected: boolean = false;
  device: proto.IDevice;
  static pins(status: DeviceStatus) {
    switch (status.type) {
      case 'wii':
        return [status.device.wii?.i2c.sda, status.device.wii?.i2c.scl];
      case 'bhDrum':
        return [status.device.bhDrum?.i2c.sda, status.device.bhDrum?.i2c.scl];
      case 'mpu6050':
        return [status.device.mpu6050?.i2c.sda, status.device.mpu6050?.i2c.scl];
      case 'worldTourDrum':
        return [
          status.device.worldTourDrum?.spi.mosi,
          status.device.worldTourDrum?.spi.miso,
          status.device.worldTourDrum?.spi.sck,
        ];
      case 'usbHost':
        return [status.device.usbHost!.firstPin, status.device.usbHost!.firstPin + 1];
      case 'adxl':
        return [status.device.adxl?.i2c.sda, status.device.adxl?.i2c.scl];
      case 'lis3dh':
        return [status.device.lis3dh?.i2c.sda, status.device.lis3dh?.i2c.scl];
      case 'mpr121':
        return [status.device.mpr121?.i2c.sda, status.device.mpr121?.i2c.scl];
      case 'crazyGuitarNeck':
        return [status.device.crazyGuitarNeck?.i2c.sda, status.device.crazyGuitarNeck?.i2c.scl];
      case 'gh5Neck':
        return [status.device.gh5Neck?.i2c.sda, status.device.gh5Neck?.i2c.scl];
      case 'djhTurntable':
        return [status.device.djhTurntable?.i2c.sda, status.device.djhTurntable?.i2c.scl];
      case 'midiSerial':
        return [status.device.midiSerial?.uart.tx, status.device.midiSerial?.uart.rx];
      case 'multiplexer':
        return [
          status.device.multiplexer?.s0Pin,
          status.device.multiplexer?.s1Pin,
          status.device.multiplexer?.s2Pin,
          status.device.multiplexer?.s3Pin,
          status.device.multiplexer?.inputPin,
        ];
      case 'psx':
        return [
          status.device.psx?.spi.mosi,
          status.device.psx?.spi.miso,
          status.device.psx?.spi.sck,
          status.device.psx?.ackPin,
          status.device.psx?.attPin,
        ];
      case 'snes':
        return [
          status.device.snes?.clockPin,
          status.device.snes?.latchPin,
          status.device.snes?.dataPin,
        ];
      case 'joybus':
        return [status.device.joybus?.dataPin];
      case 'wiiEmulation':
        return [status.device.wiiEmulation?.i2c.sda, status.device.wiiEmulation?.i2c.scl];
      case 'psxEmulation':
        return [
          status.device.psxEmulation?.commandPin,
          status.device.psxEmulation?.attentionPin,
          status.device.psxEmulation?.acknowledgePin,
          status.device.psxEmulation?.dataPin,
          status.device.psxEmulation?.clockPin,
        ];
      case 'joybusEmulation':
        return [status.device.joybusEmulation?.dataPin];
      case 'peripheral':
        return [status.device.peripheral?.i2c.sda, status.device.peripheral?.i2c.scl];
    }
  }
}
export interface ConfigState {
  deviceStatus: { [id: string]: DeviceStatus };
  config: proto.IConfig;
  connected: boolean;
  hidDevice?: HIDDevice;
}
export interface Actions {
  updateDevice: (device: proto.IDevice, id: string) => void;
  updateConfig: (config: proto.IConfig) => void;
  deleteDevice: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
  deleteAllDevices: () => void;
  addDevice: (type: string) => void;
}

function InitState(config: proto.Config): ConfigState {
  const deviceStatus = Object.fromEntries(
    config.devices!.map((x, i) => [
      i,
      new DeviceStatus(i.toString(10), Object.entries(x).find((x) => x[1])![0], x),
    ])
  );
  return { deviceStatus, config, connected: false };
}

export const initialConfig = InitState(
  proto.Config.create({
    devices: [],
    profiles: [],
  })
);

function createDefault(type: string, id: string) {
  let device = {};
  const i2c = { sda: -1, scl: -1 };
  const spi = { mosi: -1, miso: -1, sck: -1 };
  const uart = { tx: -1, rx: -1 };
  const mappingMode = proto.MappingMode.PerInput;
  switch (type) {
    case 'mpu6050':
    case 'wii':
    case 'bhDrum':
    case 'adxl':
    case 'lis3dh':
    case 'mpr121':
    case 'crazyGuitarNeck':
    case 'gh5Neck':
    case 'djhTurntable':
    case 'wiiEmulation':
      device = { i2c };
      break;
    case 'peripheral':
      device = { i2c, address: 0x45 };
      break;
    case 'worldTourDrum':
      device = { spi };
      break;
    case 'usbHost':
      device = { firstPin: -1 };
      break;
    case 'midiSerial':
      device = { uart };
      break;
    case 'multiplexer':
      device = { s0Pin: -1, s1Pin: -1, s2Pin: -1, s3Pin: -1, inputPin: -1 };
      break;
    case 'psx':
      device = { spi, ackPin: -1, attPin: -1 };
      break;
    case 'snes':
      device = { clockPin: -1, latchPin: -1, dataPin: -1 };
      break;
    case 'joybus':
    case 'joybusEmulation':
      device = { dataPin: -1 };
      break;
    case 'psxEmulation':
      device = { commandPin: -1, attentionPin: -1, acknowledgePin: -1, dataPin: -1, clockPin: -1 };
      break;
  }
  return new DeviceStatus(id, type, { [type]: { ...device, mappingMode } });
}

export const useConfigStore = create<ConfigState & Actions>()(
  immer(
    devtools(
      (set) => ({
        ...initialConfig,
        updateDevice: (device: proto.IDevice, id: string) =>
          set((config) => {
            config.deviceStatus[id].device = device;
          }),
        updateConfig: (config: proto.IConfig) =>
          set((state) => {
            state.config = { ...state.config, ...config };
          }),
        deleteDevice: (id: string) =>
          set((state) => {
            delete state.deviceStatus[id];
          }),
        addDevice: (type: string) =>
          set((state) => {
            const id = (
              Math.max(...Object.keys(state.deviceStatus).map((x) => parseInt(x))) + 1
            ).toString();
            state.deviceStatus[id] = createDefault(type, id);
          }),
        deleteAllDevices: () =>
          set((state) => {
            state.deviceStatus = {};
            state.config.devices = [];
          }),
        disconnect: () =>
          set((state) => {
            state.hidDevice?.close();
            state.connected = false;
          }),
        connect: async () => {
          const devices = await navigator.hid.requestDevice({
            filters: [{ vendorId: 0x1209, productId: 0x2882, usagePage: 0xff00 }],
          });
          if (devices.length) {
            const device = devices[0];
            if (!device.opened) {
              await device.open();
            }
            device.addEventListener('inputreport', console.log);
            const infoData = await device.receiveFeatureReport(0x23);
            const info = proto.ConfigInfo.decode(
              new Uint8Array(infoData.buffer).slice(1),
              infoData.byteLength - 1
            );
            let data = new Uint8Array(info.dataSize);
            let start = 0;
            while (start < info.dataSize) {
              const slice = await device.receiveFeatureReport(0x22);
              data.set(new Uint8Array(slice.buffer).slice(1), start);
              start += slice.byteLength - 1;
            }
            if (new CRC32().calculate(data) != info.dataCrc) {
              console.log('CRC didnt match!');
            }
            const config = proto.Config.decode(data, info.dataSize);
            set(
              (old) => ({ ...old, ...InitState(config), connected: true, hidDevice: device }),
              true
            );
          }
        }
      }),
      {
        name: 'config',
      }
    )
  )
);

navigator.hid.addEventListener("disconnect", e=>{
  if ((useConfigStore.getState().hidDevice == e.device)) {
    useConfigStore.setState(state=>{
      state.connected = false
      state.hidDevice = undefined
    })
  }
})