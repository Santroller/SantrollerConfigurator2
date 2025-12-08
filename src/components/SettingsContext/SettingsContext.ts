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
    this.stateRaw = 0;
  }
  id: number;
  mapping: proto.IMapping;
  state: number;
  stateRaw: number;
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
      case 'accelerometer':
        return [status.device.accelerometer?.i2c.sda, status.device.accelerometer?.i2c.scl];
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
      case 'crkdNeck':
        return [status.device.crkdNeck?.uart.tx, status.device.crkdNeck?.uart.rx];
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
  polling: boolean;
  lastUpdate: number;
  writeTimeout?: NodeJS.Timeout;
  keepaliveTimeout?: NodeJS.Timeout;
  currentProfile: number;
  lastProfile: number;
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
  sendKeepAlive: () => void;
  saveConfig: () => void;
  pollInputs: (poll: boolean) => void;
  loadDefaults: (device: DeviceStatus | undefined) => void;
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
    polling: false,
    currentProfile: 0,
    lastProfile: 0,
  };
}

export const initialConfig = InitState(
  proto.Config.create({
    devices: [],
    profiles: [],
  })
);

const WiiMappings = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.WiiButtonType.WiiButtonGuitarMinus]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarBack,
    [proto.WiiButtonType.WiiButtonGuitarPlus]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarStart,
    [proto.WiiButtonType.WiiButtonGuitarStrumUp]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarStrumUp,
    [proto.WiiButtonType.WiiButtonGuitarStrumDown]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarStrumDown,
    [proto.WiiButtonType.WiiButtonGuitarGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarGreen,
    [proto.WiiButtonType.WiiButtonGuitarRed]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarRed,
    [proto.WiiButtonType.WiiButtonGuitarYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarYellow,
    [proto.WiiButtonType.WiiButtonGuitarBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarBlue,
    [proto.WiiButtonType.WiiButtonGuitarOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarOrange,
    [proto.WiiButtonType.WiiButtonGuitarTapGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapGreen,
    [proto.WiiButtonType.WiiButtonGuitarTapRed]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapRed,
    [proto.WiiButtonType.WiiButtonGuitarTapYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapYellow,
    [proto.WiiButtonType.WiiButtonGuitarTapBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapBlue,
    [proto.WiiButtonType.WiiButtonGuitarTapOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapOrange,
  },
  [proto.SubType.Gamepad]: {
    [proto.WiiButtonType.WiiButtonClassicA]: proto.GamepadButtonType.GamepadA,
    [proto.WiiButtonType.WiiButtonClassicB]: proto.GamepadButtonType.GamepadB,
    [proto.WiiButtonType.WiiButtonClassicX]: proto.GamepadButtonType.GamepadX,
    [proto.WiiButtonType.WiiButtonClassicY]: proto.GamepadButtonType.GamepadY,
    [proto.WiiButtonType.WiiButtonClassicDPadUp]: proto.GamepadButtonType.GamepadDpadUp,
    [proto.WiiButtonType.WiiButtonClassicDPadDown]: proto.GamepadButtonType.GamepadDpadDown,
    [proto.WiiButtonType.WiiButtonClassicDPadLeft]: proto.GamepadButtonType.GamepadDpadLeft,
    [proto.WiiButtonType.WiiButtonClassicDPadRight]: proto.GamepadButtonType.GamepadDpadRight,
    [proto.WiiButtonType.WiiButtonClassicZl]: proto.GamepadButtonType.GamepadLeftShoulder,
    [proto.WiiButtonType.WiiButtonClassicZr]: proto.GamepadButtonType.GamepadRightShoulder,
    [proto.WiiButtonType.WiiButtonClassicPlus]: proto.GamepadButtonType.GamepadStart,
    [proto.WiiButtonType.WiiButtonClassicMinus]: proto.GamepadButtonType.GamepadBack,
    [proto.WiiButtonType.WiiButtonClassicHome]: proto.GamepadButtonType.GamepadGuide,
  },
};

const CrkdMappings = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarStrumUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarStrumDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarDpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarDpadRight,
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarGreen,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarRed,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarYellow,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarBlue,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarOrange,
    [proto.CrkdNeckButtonType.CrkdSoloGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapGreen,
    [proto.CrkdNeckButtonType.CrkdSoloRed]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapRed,
    [proto.CrkdNeckButtonType.CrkdSoloYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapYellow,
    [proto.CrkdNeckButtonType.CrkdSoloBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapBlue,
    [proto.CrkdNeckButtonType.CrkdSoloOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitarTapOrange,
  },
  [proto.SubType.Gamepad]: {
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.GamepadButtonType.GamepadA,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.GamepadButtonType.GamepadB,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.GamepadButtonType.GamepadX,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.GamepadButtonType.GamepadY,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.GamepadButtonType.GamepadLeftShoulder,
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.GamepadButtonType.GamepadDpadUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]: proto.GamepadButtonType.GamepadDpadDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]: proto.GamepadButtonType.GamepadDpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]: proto.GamepadButtonType.GamepadDpadRight,
  },
};

const WiiMappingsStick = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.WiiAxisType.WiiAxisGuitarJoystickX]:
      proto.GuitarHeroGuitarAxisType.GuitarHeroGuitarLeftStickX,
    [proto.WiiAxisType.WiiAxisGuitarJoystickY]:
      proto.GuitarHeroGuitarAxisType.GuitarHeroGuitarLeftStickY,
  },
  [proto.SubType.Gamepad]: {
    [proto.WiiAxisType.WiiAxisClassicLeftStickX]: proto.GamepadAxisType.GamepadLeftStickX,
    [proto.WiiAxisType.WiiAxisClassicLeftStickY]: proto.GamepadAxisType.GamepadLeftStickY,
    [proto.WiiAxisType.WiiAxisClassicRightStickX]: proto.GamepadAxisType.GamepadRightStickX,
    [proto.WiiAxisType.WiiAxisClassicRightStickY]: proto.GamepadAxisType.GamepadRightStickY,
  },
};
const WiiMappingsTrigger = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.WiiAxisType.WiiAxisGuitarWhammy]: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitarWhammy,
  },
  [proto.SubType.Gamepad]: {
    [proto.WiiAxisType.WiiAxisClassicLeftTrigger]: proto.GamepadAxisType.GamepadLeftTrigger,
    [proto.WiiAxisType.WiiAxisClassicRightTrigger]: proto.GamepadAxisType.GamepadRightTrigger,
  },
};

function createDefault(type: string, id: string) {
  let device = {};
  const i2c = { sda: -1, scl: -1 };
  const spi = { mosi: -1, miso: -1, sck: -1 };
  const uart = { tx: -1, rx: -1 };
  const mappingMode = proto.MappingMode.PerInput;
  switch (type) {
    case 'wii':
    case 'bhDrum':
    case 'accelerometer':
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
    case 'ads1115':
      device = { i2c, interrupt: -1 };
      break;
    case 'worldTourDrum':
      device = { spi };
      break;
    case 'apa102':
      device = { spi, count: 0, type: proto.APA102Type.Apa102Rgb };
      break;
    case 'stp16cpc':
      device = { spi, oe: -1, le: -1, count: 0 };
      break;
    case 'ws2812':
      device = { pin: -1, count: 0, type: proto.WS2812Type.Ws2812Rgb };
      break;
    case 'usbHost':
      device = { firstPin: -1, dmFirst: true };
      break;
    case 'midiSerial':
      device = { uart };
      break;
    case 'crkdNeck':
    case 'debug':
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
function buf2hex(buffer: Uint8Array) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const magic = 0xd2f1e365;
function fixInput(mapping: proto.IMapping) {
  // Swap A<->B and Y<->X for wii inputs when swapping between label and legend mode
  let wiiButton = mapping.input.wiiButton?.button;
  switch (wiiButton) {
    case proto.WiiButtonType.WiiButtonClassicA:
      wiiButton = proto.WiiButtonType.WiiButtonClassicB;
      break;
    case proto.WiiButtonType.WiiButtonClassicB:
      wiiButton = proto.WiiButtonType.WiiButtonClassicA;
      break;
    case proto.WiiButtonType.WiiButtonClassicX:
      wiiButton = proto.WiiButtonType.WiiButtonClassicY;
      break;
    case proto.WiiButtonType.WiiButtonClassicY:
      wiiButton = proto.WiiButtonType.WiiButtonClassicX;
      break;
  }
  if (wiiButton) {
    mapping.input.wiiButton!.button = wiiButton;
  }
  return mapping;
}
export const useConfigStore = create<ConfigState & Actions>()(
  immer((set, get) => ({
    ...initialConfig,
    updateDevice: (device: proto.IDevice, id: string) => {
      set((state) => {
        state.deviceStatus[id].device = device;
      });
      get().saveConfig();
    },
    setActiveProfile: (id: string | null) => {
      set((state) => {
        state.currentProfile = parseInt(id ?? '0');
      });
      get().saveConfig();
    },
    updateProfile: (profile: proto.IProfile, id: number) => {
      set((state) => {
        if (state.config.profiles![id].faceButtonMappingMode != profile.faceButtonMappingMode) {
          profile.mappings = profile.mappings?.map(fixInput);
        }
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
        if (state.currentProfile == id) {
          state.currentProfile = Math.max(id - 1, 0);
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
    sendKeepAlive: async () => {
      const dev = get().hidDevice;
      if (!dev) return;
      await dev.sendFeatureReport(proto.ReportId.ReportIdKeepalive, new Uint8Array([0]));
    },
    updateConfig: (config: proto.IConfig) => {
      set((state) => {
        state.config = { ...state.config, ...config };
      });
      get().saveConfig();
    },
    loadDefaults: (device: DeviceStatus | undefined) => {
      set((state) => {
        const type = device?.type ?? 'gpio';
        const profile = state.config.profiles![state.currentProfile];
        switch (type) {
          case 'wii':
            switch (profile.deviceToEmulate) {
              case proto.SubType.GuitarHeroGuitar:
                profile.mappings!.push(
                  ...Object.entries(WiiMappingsTrigger[profile.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      ghAxis: base,
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii),
                          deviceid: parseInt(device?.id!),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  ),
                  ...Object.entries(WiiMappingsStick[profile.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      ghAxis: base,
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii),
                          deviceid: parseInt(device?.id!),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 32767,
                    })
                  ),
                  ...Object.entries(WiiMappings[profile.deviceToEmulate]).map(([wii, base]) => ({
                    ghButton: base,
                    input: {
                      wiiButton: {
                        button: parseInt(wii),
                        deviceid: parseInt(device?.id!),
                      },
                    },
                  }))
                );
                break;
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(WiiMappingsTrigger[profile.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      gamepadAxis: base,
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii),
                          deviceid: parseInt(device?.id!),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  ),
                  ...Object.entries(WiiMappingsStick[profile.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      gamepadAxis: base,
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii),
                          deviceid: parseInt(device?.id!),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 32767,
                    })
                  ),
                  ...Object.entries(WiiMappings[profile.deviceToEmulate]).map(([wii, base]) => ({
                    gamepadButton: base,
                    input: {
                      wiiButton: {
                        button: parseInt(wii),
                        deviceid: parseInt(device?.id!),
                      },
                    },
                  }))
                );
                break;
            }
            break;
          case 'crkdNeck':
            switch (profile.deviceToEmulate) {
              case proto.SubType.GuitarHeroGuitar:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.deviceToEmulate]).map(([wii, base]) => ({
                    ghButton: base,
                    input: {
                      crkd: {
                        button: parseInt(wii),
                        deviceid: parseInt(device?.id!),
                      },
                    },
                  }))
                );
                break;
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.deviceToEmulate]).map(([wii, base]) => ({
                    gamepadButton: base,
                    input: {
                      crkd: {
                        button: parseInt(wii),
                        deviceid: parseInt(device?.id!),
                      },
                    },
                  }))
                );
                break;
            }
            break;
        }
        profile.mappings = profile.mappings;
        state.config = {
          ...state.config,
          profiles: [
            ...state.config.profiles!.map((prevProfile, prevIndex) =>
              prevIndex == state.currentProfile ? profile : prevProfile
            ),
          ],
        };
        state.mappingStatus[state.currentProfile] = Object.fromEntries(
          profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
        );
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
      const deviceEvent = proto.Event.decode(new Uint8Array(evt.data.buffer), evt.data.byteLength);
      if (deviceEvent.debug) {
        console.log(buf2hex(new Uint8Array(Int32Array.from(deviceEvent.debug.data!).buffer)));
      }
      if (deviceEvent.wii) {
        set((state) => {
          if (deviceEvent.wii!.id in state.deviceStatus) {
            state.deviceStatus[deviceEvent.wii!.id].wiiExtType = deviceEvent.wii!.extension;
          }
        });
      }
      if (deviceEvent.device) {
        set((state) => {
          if (deviceEvent.device!.id in state.deviceStatus) {
            state.deviceStatus[deviceEvent.device!.id].connected = deviceEvent.device!.connected;
          }
        });
      }
      if (deviceEvent.button && get().polling) {
        set((state) => {
          if (state.mappingStatus.length) {
            const mappings = state.mappingStatus[state.currentProfile ?? 0];
            if (deviceEvent.button!.id in mappings) {
              const mapping = mappings[deviceEvent.button!.id];
              mapping.state = deviceEvent.button?.state ? 65535 : 0;
              mapping.stateRaw = deviceEvent.button?.stateRaw ? 65535 : 0;
            }
          }
        });
      }
      if (deviceEvent.axis && get().polling) {
        set((state) => {
          if (state.mappingStatus.length) {
            const mappings = state.mappingStatus[state.currentProfile ?? 0];
            if (deviceEvent.axis!.id in mappings) {
              const mapping = mappings[deviceEvent.axis!.id];
              mapping.state = deviceEvent.axis?.state!;
              mapping.stateRaw = deviceEvent.axis?.stateRaw!;
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
        };
        state.currentProfile = state.config.profiles!.length - 1;
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
        if (state.keepaliveTimeout) {
          clearInterval(state.keepaliveTimeout);
        }
        state.connected = false;
        state.hidDevice = undefined;
      }),
    pollInputs: (poll) =>
      set((state) => {
        state.polling = poll;
      }),
    saveConfig: async () => {
      const state = get();
      if (state.hidDevice == null || !state.connected) {
        return;
      }
      // debounce writes so we don't trash the flash on the pico
      const now = +new Date();
      if (now - state.lastUpdate < 1000 || state.writing) {
        if (state.writeTimeout) {
          clearTimeout(state.writeTimeout);
        }
        set((state) => {
          state.writeTimeout = setTimeout(() => get().saveConfig(), 500);
        });
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
      if (crc == state.crc && state.lastProfile == state.currentProfile) {
        return;
      }
      set((state) => {
        state.writing = true;
        state.crc = crc;
        state.lastProfile = state.currentProfile;
      });
      const infoBuffer = proto.ConfigInfo.encode(
        proto.ConfigInfo.create({
          dataSize: buffer.length,
          dataCrc: crc,
          magic,
          currentProfile: state.currentProfile,
        })
      ).finish();
      console.log(infoBuffer.length)
      await state.hidDevice.sendFeatureReport(
        proto.ReportId.ReportIdConfigInfo,
        infoBuffer as Buffer<ArrayBuffer>
      );
      if (buffer.length == 0) {
        set((state) => {
          state.writing = false;
        });
        return;
      }
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
          const timeout = setInterval(() => get().sendKeepAlive(), 10);
          set(
            (old) => ({
              ...old,
              ...InitState(config),
              connected: true,
              hidDevice: device,
              crc: info.dataCrc,
              keepaliveTimeout: timeout,
              currentProfile: info.currentProfile,
              lastProfile: info.currentProfile,
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
  }))
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
