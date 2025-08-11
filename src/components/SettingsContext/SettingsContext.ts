/// <reference types="w3c-web-hid" />
import { immerable } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {} from '@redux-devtools/extension';

import { CRC32 } from '@/CRC32.js';
import { proto } from './config.js';

export * from './config.js';
export class MappingStatus {
  [immerable] = true;
  constructor(id: number, mapping: proto.IMapping) {
    this.id = id;
    this.mapping = mapping;
    this.state = 0;
    this.lastUpdate = +new Date();
    this.fastCallCount = 0;
  }
  lastUpdate: number;
  fastCallCount: number;
  id: number;
  mapping: proto.IMapping;
  state: number;
}
export class DeviceStatus {
  [immerable] = true;
  constructor(id: string, type: string, device: proto.IDevice) {
    this.id = id;
    this.type = type;
    this.device = device;
    this.wiiExtType = proto.WiiExtType.WiiNoExtension;
  }
  id: string;
  type: string;
  connected: boolean = false;
  device: proto.IDevice;
  wiiExtType: proto.WiiExtType;
  static label(status: DeviceStatus) {
    let label = DeviceStatus.pins(status)
      ?.map((x) => `GP${x}`)
      .join(', ');
    switch (status.type) {
      case 'peripheral':
        return `${label}, 0x${status.device.peripheral?.address.toString(16)}`;
    }
    return label;
  }
  static pins(status: DeviceStatus) {
    switch (status.type) {
      case 'wii':
        return [status.device.wii?.i2c.sda, status.device.wii?.i2c.scl];
      case 'bhDrum':
        return [status.device.bhDrum?.i2c.sda, status.device.bhDrum?.i2c.scl];
      case 'mpu6050':
        return [status.device.accelerometer?.i2c.sda, status.device.accelerometer?.i2c.scl];
      case 'worldTourDrum':
        return [
          status.device.worldTourDrum?.spi.mosi,
          status.device.worldTourDrum?.spi.miso,
          status.device.worldTourDrum?.spi.sck,
        ];
      case 'usbHost':
        return [status.device.usbHost!.firstPin, status.device.usbHost!.firstPin + 1];
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
  mappingStatus: { [id: number]: MappingStatus }[];
  config: proto.IConfig;
  connected: boolean;
  hidDevice?: HIDDevice;
  crc: number;
  writing: boolean;
  lastUpdate: number;
  timeout?: NodeJS.Timeout;
}
export interface Actions {
  updateDevice: (device: proto.IDevice, id: string) => void;
  updateProfile: (profile: proto.IProfile, id: number) => void;
  addProfile: () => void;
  deleteProfile: (id: number) => void;
  updateConfig: (config: proto.IConfig) => void;
  deleteDevice: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
  deleteAllDevices: () => void;
  addDevice: (type: string) => void;
  onReport: (evt: HIDInputReportEvent) => void;
  setActiveProfile: (id: string | null) => void;
  saveConfig: () => void;
}

function InitState(config: proto.Config): ConfigState {
  const deviceStatus = Object.fromEntries(
    config.devices!.map((x, i) => [
      i,
      new DeviceStatus(i.toString(10), Object.entries(x).find((x) => x[1])![0], x),
    ])
  );
  const mappingStatus = config.profiles!.map((profile) =>
    Object.fromEntries(profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)]))
  );
  return {
    deviceStatus,
    mappingStatus,
    config,
    connected: false,
    crc: 0,
    lastUpdate: 0,
    writing: false,
  };
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

const magic = 0xd2f1e365;
export const useConfigStore = create<ConfigState & Actions>()(
  immer(
    devtools(
      (set, get) => ({
        ...initialConfig,
        updateDevice: (device: proto.IDevice, id: string) => {
          set((state) => {
            state.deviceStatus[id].device = device;
          });
          get().saveConfig();
        },
        setActiveProfile: (id: string | null) => {
          set((state) => {
            state.config = { ...state.config, currentProfile: parseInt(id ?? '0') };
          });
          get().saveConfig();
        },
        updateProfile: (profile: proto.IProfile, id: number) => {
          set((state) => {
            state.config = {
              ...state.config,
              profiles: [
                ...state.config.profiles!.map((prevProfile, prevIndex) =>
                  prevIndex == id ? profile : prevProfile
                ),
              ],
            };
            state.mappingStatus[id] = Object.fromEntries(
              profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
            );
          });
          get().saveConfig();
        },
        deleteProfile: (id: number) => {
          set((state) => {
            if (state.config.currentProfile == id) {
              state.config.currentProfile = Math.max(id - 1, 0);
            }
            state.config = {
              ...state.config,
              profiles: state.config.profiles?.filter((x, i) => i != id),
            };
            state.mappingStatus = state.config.profiles!.map((profile) =>
              Object.fromEntries(profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)]))
            );
          });
          get().saveConfig();
        },
        updateConfig: (config: proto.IConfig) => {
          set((state) => {
            state.config = { ...state.config, ...config };
          });
          get().saveConfig();
        },
        deleteDevice: (id: string) => {
          set((state) => {
            delete state.deviceStatus[id];
          });
          get().saveConfig();
        },
        addDevice: (type: string) => {
          set((state) => {
            let id = '0';
            if (Object.keys(state.deviceStatus).length) {
              id = (
                Math.max(...Object.keys(state.deviceStatus).map((x) => parseInt(x))) + 1
              ).toString();
            }
            state.deviceStatus[id] = createDefault(type, id);
          });
          get().saveConfig();
        },
        onReport: (evt: HIDInputReportEvent) => {
          if (evt.reportId != proto.ReportId.ReportIdConfig) {
            return;
          }
          const deviceEvent = proto.Event.decode(
            new Uint8Array(evt.data.buffer),
            evt.data.byteLength
          );
          if (deviceEvent.wii) {
            set((state) => {
              if (deviceEvent.wii!.id in state.deviceStatus) {
                state.deviceStatus[deviceEvent.wii!.id].wiiExtType = deviceEvent.wii!.extension;
              }
            });
          }
          if (deviceEvent.button) {
            set((state) => {
              if (state.mappingStatus.length) {
                const mappings = state.mappingStatus[state.config.currentProfile ?? 0];
                if (deviceEvent.button!.id in mappings) {
                  const mapping = mappings[deviceEvent.button!.id];
                  const now = +new Date();
                  // limit updates from digital inputs if they change rapidly
                  if (now - mapping.lastUpdate > 100) {
                    mapping.lastUpdate = now;
                    mapping.state = deviceEvent.button?.state ? 32767 : 0;
                  }
                }
              }
            });
          }
          if (deviceEvent.axis) {
            set((state) => {
              if (state.mappingStatus.length) {
                const mappings = state.mappingStatus[state.config.currentProfile ?? 0];
                if (deviceEvent.axis!.id in mappings) {
                  const mapping = mappings[deviceEvent.axis!.id];
                  const now = +new Date();
                  // limit updates from analog inputs if they change rapidly
                  if (now - mapping.lastUpdate > 100) {
                    mapping.lastUpdate = now;
                    mapping.state = deviceEvent.axis?.state!;
                  }
                }
              }
            });
          }
        },
        addProfile: () => {
          set((state) => {
            state.config = {
              ...state.config,
              profiles: [
                ...(state.config.profiles || []),
                {
                  faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
                  deviceToEmulate: proto.SubType.Gamepad,
                  name: 'Device',
                  activationMethod: [],
                  mappings: [],
                },
              ],
              currentProfile: state.config.profiles!.length,
            };
            state.mappingStatus[state.config.profiles!.length - 1] = [];
          });
          get().saveConfig();
        },
        deleteAllDevices: () => {
          set((state) => {
            state.deviceStatus = {};
          });
          get().saveConfig();
        },
        disconnect: () =>
          set((state) => {
            state.hidDevice?.removeEventListener('inputreport', state.onReport);
            state.hidDevice?.close();
            state.connected = false;
          }),
        saveConfig: async () => {
          const state = get();
          if (state.hidDevice == null || !state.connected) {
            return;
          }
          // debounce writes so we don't trash the flash on the pico
          const now = +new Date();
          if (now - state.lastUpdate < 500 || state.writing) {
            if (state.timeout) {
              clearTimeout(state.timeout);
            }
            state.timeout = setTimeout(() => get().saveConfig(), 500);
            return;
          }
          set((state) => {
            state.lastUpdate = now;
          });
          const config = { ...state.config };
          config.devices = Object.values(state.deviceStatus).map((x) => x.device);
          config.profiles = state.mappingStatus.map((x, i) => ({
            ...config.profiles![i],
            mappings: Object.values(x).map((x) => x.mapping),
          }));
          const buffer = proto.Config.encode(config).finish();
          const crc = new CRC32().calculate(buffer);
          // Don't write if nothing has changed
          if (crc == state.crc) {
            return;
          }
          set((state) => {
            state.writing = true;
            state.crc = crc;
          });
          const infoBuffer = proto.ConfigInfo.encode(
            proto.ConfigInfo.create({ dataSize: buffer.length, dataCrc: crc, magic })
          ).finish();
          await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdConfigInfo, infoBuffer);
          let start = 0;
          const len = 63;
          while (start <= buffer.length) {
            const slice = buffer.slice(start, start + len);
            start += len;
            await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdConfig, slice);
          }
          set((state) => {
            state.writing = false;
          });
        },
        connect: async () => {
          const devices = await navigator.hid.requestDevice({
            filters: [{ vendorId: 0x1209, productId: 0x2882, usagePage: 0xff00 }],
          });
          if (devices.length) {
            const device = devices[0];
            if (!device.opened) {
              await device.open();
            }
            device.addEventListener('inputreport', get().onReport);
            const infoData = await device.receiveFeatureReport(proto.ReportId.ReportIdConfigInfo);
            const info = proto.ConfigInfo.decode(
              new Uint8Array(infoData.buffer).slice(1),
              infoData.byteLength - 1
            );
            if (info.magic >>> 0 != magic) {
              console.log('magic didnt match!');
            }
            let data = new Uint8Array(info.dataSize);
            let start = 0;
            while (start < info.dataSize) {
              const slice = await device.receiveFeatureReport(proto.ReportId.ReportIdConfig);
              data.set(new Uint8Array(slice.buffer).slice(1), start);
              start += slice.byteLength - 1;
            }
            if (new CRC32().calculate(data) != info.dataCrc) {
              console.log('CRC didnt match!');
            }
            try {
              const config = proto.Config.decode(data, info.dataSize);
              set(
                (old) => ({
                  ...old,
                  ...InitState(config),
                  connected: true,
                  hidDevice: device,
                  crc: info.dataCrc,
                }),
                true
              );
              await device.sendFeatureReport(proto.ReportId.ReportIdLoaded, new Uint8Array([0]));
            } catch (e) {
              set(
                (old) => ({
                  ...old,
                  connected: true,
                  hidDevice: device,
                  crc: 0,
                }),
                true
              );
            }
          }
        },
      }),
      {
        name: 'config',
      }
    )
  )
);

navigator.hid.addEventListener('disconnect', (e) => {
  if (useConfigStore.getState().hidDevice == e.device) {
    useConfigStore.setState((state) => {
      state.connected = false;
      state.hidDevice = undefined;
    });
  }
});

// make sure we disconnect from the device when using HMR in development
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    useConfigStore.getState().disconnect();
  });
}
