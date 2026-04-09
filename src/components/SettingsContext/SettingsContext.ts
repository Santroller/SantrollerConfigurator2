/// <reference types="w3c-web-hid" />
import { immerable } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {} from '@redux-devtools/extension';

import { disconnect } from 'process';
import { BufferReader } from 'protobufjs';
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
export class LedStatus {
  [immerable] = true;
  constructor(id: number, led: proto.ILed) {
    this.id = id;
    this.led = led;
    this.state = 0;
    this.stateRaw = 0;
  }
  id: number;
  led: proto.ILed;
  state: number;
  stateRaw: number;
}
export class ActivationStatus {
  [immerable] = true;
  constructor(id: number, activation: proto.IProfileAssignmentInfo) {
    this.id = id;
    this.activation = activation;
    this.state = 0;
    this.stateRaw = 0;
  }
  id: number;
  activation: proto.IProfileAssignmentInfo;
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
      case 'ws2812':
      case 'apa102':
      case 'stp16cpc':
      case 'multiplexer':
        break;
      default:
        label = `${status.connected ? 'Connected' : 'Disconnected'}, ${label}`;
        break;
    }
    switch (status.type) {
      case 'peripheral':
        return `${label}, 0x${status.device.peripheral?.address.toString(16)}`;
    }
    return label;
  }
  static pins(status: DeviceStatus) {
    switch (status.type) {
      case 'ws2812':
        return [status.device.ws2812?.pin];
      case 'apa102':
        return [status.device.apa102?.spi.mosi, status.device.apa102?.spi.sck];
      case 'stp16cpc':
        return [
          status.device.stp16cpc?.spi.mosi,
          status.device.stp16cpc?.spi.miso,
          status.device.stp16cpc?.spi.sck,
          status.device.stp16cpc?.le,
          status.device.stp16cpc?.oe,
        ];
      case 'wii':
        return [status.device.wii?.i2c.sda, status.device.wii?.i2c.scl];
      case 'ads1115':
        return [status.device.ads1115?.i2c.sda, status.device.ads1115?.i2c.scl];
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
        return status.device.multiplexer?.sixteenChannel
          ? [
              status.device.multiplexer?.s0Pin,
              status.device.multiplexer?.s1Pin,
              status.device.multiplexer?.s2Pin,
              status.device.multiplexer?.s3Pin,
              status.device.multiplexer?.inputPin,
            ]
          : [
              status.device.multiplexer?.s0Pin,
              status.device.multiplexer?.s1Pin,
              status.device.multiplexer?.s2Pin,
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
  ledStatus: { [id: number]: LedStatus }[];
  activationStatus: { [id: number]: ActivationStatus }[];
  config: proto.IConfig;
  connected: boolean;
  latest: boolean;
  hidDevice?: HIDDevice;
  crc: number;
  writing: boolean;
  polling: boolean;
  updating: boolean;
  detected: number;
  updatePercentage: number;
  detectedMapping?: number;
  detectedActivation?: number;
  detectedLed?: number;
  detecting: boolean;
  lastUpdate: number;
  writeTimeout?: NodeJS.Timeout;
  keepaliveTimeout?: NodeJS.Timeout;
  currentProfile: number;
  lastProfile: number;
  activeProfiles: number[];
  midiData: number[][];
}
export interface Actions {
  updateDevice: (device: proto.IDevice, id: string) => void;
  updateProfile: (profile: proto.IProfile, id: number) => void;
  addProfile: () => void;
  deleteProfile: (id: number) => void;
  updateConfig: (config: proto.IConfig) => void;
  deleteDevice: (id: string) => void;
  connect: () => void;
  firmwareUpdate: () => void;
  disconnect: () => void;
  bootloader: () => void;
  deleteAllDevices: () => void;
  addDevice: (type: string) => void;
  onReport: (evt: HIDInputReportEvent) => void;
  setActiveProfile: (id: string | null) => void;
  sendKeepAlive: () => void;
  saveConfig: () => void;
  exportConfig: () => void;
  loadConfig: (file: File | null) => void;
  pollInputs: (poll: boolean) => void;
  loadDefaults: (device: DeviceStatus | undefined) => void;
  detectPins: (
    activation: number | undefined,
    mapping: number | undefined,
    led: number | undefined,
    type: proto.PinDetectType
  ) => void;
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
  const activationStatus = config.profiles!.map((profile) =>
    Object.fromEntries(
      profile
        .assignments!.flatMap((x) => x.assignments)
        .map((x, i) => [i, new ActivationStatus(i, x)])
    )
  );
  const ledStatus = config.profiles!.map((profile) =>
    Object.fromEntries(profile.leds.map((x, i) => [i, new LedStatus(i, x)]))
  );
  return {
    deviceStatus,
    mappingStatus,
    activationStatus,
    ledStatus,
    config,
    updatePercentage: 0,
    updating: false,
    connected: false,
    detecting: false,
    latest: true,
    detected: -1,
    crc: 0,
    lastUpdate: 0,
    writing: false,
    polling: false,
    currentProfile: 0,
    lastProfile: 0,
    activeProfiles: [],
    midiData: [],
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
  [proto.SubType.RockBandGuitar]: {
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.RockBandGuitarButtonType.RockBandGuitarStrumUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]: proto.RockBandGuitarButtonType.RockBandGuitarStrumDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]: proto.RockBandGuitarButtonType.RockBandGuitarDpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]:
      proto.RockBandGuitarButtonType.RockBandGuitarDpadRight,
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.RockBandGuitarButtonType.RockBandGuitarGreen,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.RockBandGuitarButtonType.RockBandGuitarRed,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.RockBandGuitarButtonType.RockBandGuitarYellow,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.RockBandGuitarButtonType.RockBandGuitarBlue,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.RockBandGuitarButtonType.RockBandGuitarOrange,
    [proto.CrkdNeckButtonType.CrkdSoloGreen]:
      proto.RockBandGuitarButtonType.RockBandGuitarSoloGreen,
    [proto.CrkdNeckButtonType.CrkdSoloRed]: proto.RockBandGuitarButtonType.RockBandGuitarSoloRed,
    [proto.CrkdNeckButtonType.CrkdSoloYellow]:
      proto.RockBandGuitarButtonType.RockBandGuitarSoloYellow,
    [proto.CrkdNeckButtonType.CrkdSoloBlue]: proto.RockBandGuitarButtonType.RockBandGuitarSoloBlue,
    [proto.CrkdNeckButtonType.CrkdSoloOrange]:
      proto.RockBandGuitarButtonType.RockBandGuitarSoloOrange,
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
  const i2c = { sda: -1, scl: -1, block: 0, clock: 100000 };
  const i2c15 = { sda: -1, scl: -1, block: 0, clock: 150000 };
  const i2c4 = { sda: -1, scl: -1, block: 0, clock: 400000 };
  const spi = { mosi: -1, miso: -1, sck: -1, block: 0, clock: 500000 };
  const uart = { tx: -1, rx: -1, block: 0 };
  const mappingMode = proto.MappingMode.PerInput;
  switch (type) {
    case 'gh5Neck':
    case 'djhTurntable':
      device = { i2c: i2c15 };
      break;
    case 'accelerometer':
    case 'wii':
    case 'wiiEmulation':
    case 'mpr121':
      device = { i2c: i2c4 };
      break;
    case 'bhDrum':
    case 'crazyGuitarNeck':
      device = { i2c };
      break;
    case 'peripheral':
      device = { i2c: i2c4, address: 0x45 };
      break;
    case 'ads1115':
      device = { i2c: i2c4, interrupt: -1 };
      break;
    case 'worldTourDrum':
      device = { spi };
      break;
    case 'apa102':
      device = { spi: { ...spi, clock: 12000000 }, count: 0, type: proto.APA102Type.Apa102Rgb };
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
      device = { s0Pin: -1, s1Pin: -1, s2Pin: -1, s3Pin: -1, inputPin: -1, sixteenChannel: false };
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
    setActiveProfile: async (id: string | null) => {
      console.log('set active', id);
      if (id == 'add') {
        return;
      }
      set((state) => {
        state.lastProfile = state.currentProfile;
        state.currentProfile = parseInt(id ?? '0');
      });
      const state = get();
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          setProfile: proto.SetProfileCommand.create({
            profileId: state.config.profiles![parseInt(id ?? '0')].uid,
          }),
        })
      )
        .ldelim()
        .finish();
      let outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
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
        state.detected = -1;
        state.mappingStatus[id] = Object.fromEntries(
          profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
        );
        state.activationStatus[id] = Object.fromEntries(
          profile
            .assignments!.flatMap((x) => x.assignments)
            .map((x, i) => [i, new ActivationStatus(i, x!)])
        );
        state.ledStatus[id] = Object.fromEntries(
          profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
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

        state.activationStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(
            profile
              .assignments!.flatMap((x) => x.assignments)
              .map((x, i) => [i, new ActivationStatus(i, x!)])
          )
        );
        state.ledStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(profile.leds!.map((x, i) => [i, new LedStatus(i, x)]))
        );
        if (
          state.config.profiles?.length &&
          state.config.profiles?.every((x) =>
            x.assignments?.every((y) => y.assignments?.every((z) => !z.catchall))
          )
        ) {
          state.config.profiles[0].assignments = [
            ...state.config.profiles[0].assignments!,
            {
              assignments: [{ catchall: true }],
            },
          ];
        }
      });
      get().saveConfig();
    },
    sendKeepAlive: async () => {
      const dev = get().hidDevice;
      if (!dev) return;
      await dev.sendFeatureReport(proto.ReportId.ReportIdKeepalive, new Uint8Array([0]));
    },
    detectPins: async (
      activation: number | undefined,
      mapping: number | undefined,
      led: number | undefined,
      type: proto.PinDetectType
    ) => {
      const dev = get().hidDevice;
      if (!dev) return;
      set((state) => {
        state.detected = -1;
        state.detecting = true;
        state.detectedLed = led;
        state.detectedMapping = mapping;
        state.detectedActivation = activation;
      });
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          detectPin: proto.DetectPinCommand.create({
            detectType: type,
          }),
        })
      )
        .ldelim()
        .finish();
      let outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await dev.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
      console.log('done');
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
              case proto.SubType.RockBandGuitar:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.deviceToEmulate]).map(([wii, base]) => ({
                    rbButton: base,
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
        state.activationStatus[state.currentProfile] = Object.fromEntries(
          profile
            .assignments!.flatMap((x) => x.assignments)
            .map((x, i) => [i, new ActivationStatus(i, x!)])
        );
        state.ledStatus[state.currentProfile] = Object.fromEntries(
          profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
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
      const eventList = proto.EventList.decodeDelimited(new Uint8Array(evt.data.buffer));
      for (const deviceEvent of eventList.event) {
        if (deviceEvent.debug) {
          console.log(buf2hex(deviceEvent.debug.data!));
        }
        if (deviceEvent.midiDebug) {
          set((state) => {
            if (deviceEvent.midiDebug) {
              state.midiData.push([...deviceEvent.midiDebug.data!]);
            }
          });
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
        if (deviceEvent.pin && get().polling) {
          set((state) => {
            state.detected = deviceEvent.pin!.pin;
            state.detecting = false;
          });
        }
        if (deviceEvent.trigger && get().polling) {
          set((state) => {
            if (state.activationStatus.length) {
              const mappings = state.activationStatus[state.currentProfile ?? 0];
              if (deviceEvent.trigger!.id in mappings) {
                const mapping = mappings[deviceEvent.trigger!.id];
                mapping.state = deviceEvent.trigger?.state!;
                mapping.stateRaw = deviceEvent.trigger?.stateRaw!;
              }
            }
          });
        }
        if (deviceEvent.led && get().polling) {
          set((state) => {
            if (state.ledStatus.length) {
              const mappings = state.ledStatus[state.currentProfile ?? 0];
              if (deviceEvent.led!.id in mappings) {
                const mapping = mappings[deviceEvent.led!.id];
                mapping.state = deviceEvent.led?.state!;
                mapping.stateRaw = deviceEvent.led?.stateRaw!;
              }
            }
          });
        }
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
              assignments: [],
              mappings: [],
              leds: [],
              uid: Math.max(...(state.config.profiles?.map((x) => x.uid) || [0])) + 1,
            },
          ],
        };
        state.currentProfile = state.config.profiles!.length - 1;
        state.mappingStatus[state.config.profiles!.length - 1] = [];
        state.activationStatus[state.config.profiles!.length - 1] = [];
        state.ledStatus[state.config.profiles!.length - 1] = [];
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
        state.updating = false;
        state.hidDevice = undefined;
      }),
    bootloader: async () => {
      const dev = get().hidDevice;
      if (!dev) return;
      await dev.sendFeatureReport(proto.ReportId.ReportIdBootloader, new Uint8Array([0]));
    },
    pollInputs: (poll) =>
      set((state) => {
        state.polling = poll;
      }),
    exportConfig: () => {
      const state = get();
      if (state.hidDevice == null || !state.connected) {
        return;
      }
      const config = { ...state.config };
      config.devices = Object.values(state.deviceStatus).map((x) => x.device);
      config.profiles = state.mappingStatus.map((x, i) => ({
        ...config.profiles![i],
        mappings: Object.values(x).map((x) => x.mapping),
      }));
      const buffer = proto.Config.create(config).toJSON();
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify(buffer)], {
        type: 'text/json',
      });
      element.href = URL.createObjectURL(file);
      element.download = 'config.json';
      document.body.appendChild(element);
      element.click();
    },
    loadConfig: async (file: File | null) => {
      try {
        const config = proto.Config.fromObject(JSON.parse((await file?.text()) ?? ''));
        const timeout = setInterval(() => get().sendKeepAlive(), 10);
        set(
          (old) => ({
            ...old,
            ...InitState(config),
            connected: true,
            keepaliveTimeout: timeout,
          }),
          true
        );
        get().saveConfig();
      } catch (e) {
        console.log(e);
      }
    },
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
      if (crc == state.crc) {
        return;
      }
      set((state) => {
        state.writing = true;
        state.crc = crc;
        state.detecting = false;
      });
      let infoBuffer = proto.ConfigInfo.encode(
        proto.ConfigInfo.create({
          dataSize: buffer.length,
          dataCrc: crc,
          magic,
        })
      )
        .ldelim()
        .finish();
      console.log('save');
      let outBuffer = new ArrayBuffer(63);
      new Uint8Array(outBuffer).set(infoBuffer);
      await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdConfigInfo, outBuffer);
      if (buffer.length == 0) {
        set((state) => {
          state.writing = false;
        });
        return;
      }
      let start = 0;
      const len = 63;
      while (start < buffer.length) {
        let slice = new ArrayBuffer(63);
        new Uint8Array(slice).set(buffer.slice(start, start + len));
        start += len;
        console.log('saving!', start);
        await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdConfig, slice);
      }
      set((state) => {
        state.writing = false;
      });
      await state.hidDevice.sendFeatureReport(
        proto.ReportId.ReportIdKeepalive,
        new Uint8Array([0])
      );

      if (state.config.profiles![state.currentProfile] != null) {
        const infoBuffer2 = proto.Command.encode(
          proto.Command.create({
            setProfile: proto.SetProfileCommand.create({
              profileId: state.config.profiles![state.currentProfile].uid,
            }),
          })
        )
          .ldelim()
          .finish();
        let outBuffer2 = new ArrayBuffer(63);
        new Uint8Array(outBuffer2).set(infoBuffer2);
        await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
      }
    },
    firmwareUpdate: async () => {
      const state = get();
      set((old) => ({ ...old, updatePercentage: 1, updating: true }));
      console.log('loading file');
      const updateFile = await (await fetch('santroller_fota_image.bin')).bytes();
      let firmwareInfo = proto.FirmwareUpdate.create({
        chunkOffset: 0,
        chunkSize: 32,
        firmwareSize: updateFile.length,
        offset: 0,
      });
      console.log('loaded');
      let buffer = new ArrayBuffer(63);
      for (let i = 0; i < updateFile.length; i += 256) {
        firmwareInfo.chunkOffset = 0;
        firmwareInfo.offset = i;
        let firmwareInfoBuffer = proto.FirmwareUpdate.encodeDelimited(firmwareInfo)
          .ldelim()
          .finish();
        new Uint8Array(buffer).set(firmwareInfoBuffer);
        await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdUpdateFirmware, buffer);
        for (let j = 0; j < 256 && i + j < updateFile.length; j += 32) {
          let buffer2 = new ArrayBuffer(33);
          new Uint8Array(buffer2).set([proto.ReportId.ReportIdUploadFirmware]);
          new Uint8Array(buffer2).set(updateFile.slice(i + j, i + j + 32), 1);
          await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdUploadFirmware, buffer2);
          set((old) => ({ ...old, updatePercentage: 1 + ((i + j) / updateFile.length) * 99 }));
        }
      }
      state.disconnect();
    },
    connect: async () => {
      if (!navigator.hid) {
        return;
      }
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x1209, productId: 0x2882, usagePage: 0xff00 }],
      });
      if (devices.length) {
        const device = devices[0];
        if (!device.opened) {
          await device.open();
        }
        device.addEventListener('inputreport', get().onReport);
        let latest = false;
        const infoData = await device.receiveFeatureReport(proto.ReportId.ReportIdConfigInfo);
        try {
          const commitHash = await device.receiveFeatureReport(proto.ReportId.ReportIdGetVersion);
          const deviceVersion = String.fromCharCode
            .apply(null, Array.from(new Uint8Array(commitHash.buffer.slice(1))))
            .trim()
            .substring(0, 8);
          const latestVersion = (await (await fetch('commit.hash')).text()).trim().substring(0, 8);
          latest = deviceVersion == latestVersion;
        } catch (e) {
          console.log(e);
        }
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
        const profileData = await device.receiveFeatureReport(
          proto.ReportId.ReportIdGetActiveProfiles
        );
        const activeProfiles = proto.GetActiveProfiles.decodeDelimited(
          new Uint8Array(profileData.buffer).slice(1)
        );
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
              updating: false,
              hidDevice: device,
              crc: info.dataCrc,
              latest,
              keepaliveTimeout: timeout,
              activeProfiles: activeProfiles.profiles,
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
if (navigator.hid) {
  navigator.hid.addEventListener('disconnect', (e) => {
    if (useConfigStore.getState().hidDevice == e.device) {
      useConfigStore.getState().disconnect();
      useConfigStore.setState((state) => {
        state.connected = false;
        state.hidDevice = undefined;
      });
    }
  });
}

// make sure we disconnect from the device when using HMR in development
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    useConfigStore.getState().disconnect();
  });
}
