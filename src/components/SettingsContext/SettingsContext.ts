/// <reference types="w3c-web-hid" />
import { immerable } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {} from '@redux-devtools/extension';

import { decodeBlock, encodeBlock, UF2BlockData } from 'uf2';
import { CRC32 } from '@/CRC32.js';
import { proto } from './config.js';

export * from './config.js';
export const ps4Subtypes = [
  proto.SubType.GuitarHeroDrums,
  proto.SubType.RockBandDrums,
  proto.SubType.GuitarHeroGuitar,
  proto.SubType.RockBandGuitar,
];
export class MappingStatus {
  [immerable] = true;
  constructor(id: number, mapping: proto.IMapping) {
    this.id = id;
    this.mapping = mapping;
    this.state = 0;
    this.stateRaw = 0;
    this.stateNonZero = 0;
  }
  id: number;
  mapping: proto.IMapping;
  state: number;
  stateRaw: number;
  stateNonZero: number;
}
export class LedStatus {
  [immerable] = true;
  constructor(id: number, led: proto.ILed) {
    this.id = id;
    this.led = led;
    this.state = 0;
    this.stateRaw = 0;
    this.stateNonZero = 0;
  }
  id: number;
  led: proto.ILed;
  state: number;
  stateRaw: number;
  stateNonZero: number;
}
export class ActivationStatus {
  [immerable] = true;
  constructor(id: number, activation: proto.IProfileAssignmentInfo) {
    this.id = id;
    this.activation = activation;
    this.state = false;
    this.stateRaw = 0;
  }
  id: number;
  activation: proto.IProfileAssignmentInfo;
  state: boolean;
  stateRaw: number;
}
export class DeviceStatus {
  [immerable] = true;
  constructor(id: string, type: string, device: proto.IDevice) {
    this.id = id;
    this.type = type;
    this.device = device;
    this.wiiExtType = proto.WiiExtType.WiiNoExtension;
    this.usbDevices = {};
    this.ps2CntType = proto.PS2ControllerType.PS2ControllerTypeUnknown;
    this.cycleState = 0;
    this.toggleState = false;
    this.crkdDrumCalibration = {
      [proto.CrkdDrumCalibrationType.Debounce]: {
        redPad: 0,
        yellowPad: 0,
        bluePad: 0,
        greenPad: 0,
        orangePad: 0,
        yellowCymbal: 0,
        blueCymbal: 0,
        greenCymbal: 0,
        kick1: 0,
        kick2: 0,
      },
      [proto.CrkdDrumCalibrationType.Min]: {
        redPad: 0,
        yellowPad: 0,
        bluePad: 0,
        greenPad: 0,
        orangePad: 0,
        yellowCymbal: 0,
        blueCymbal: 0,
        greenCymbal: 0,
        kick1: 0,
        kick2: 0,
      },
      [proto.CrkdDrumCalibrationType.Max]: {
        redPad: 0,
        yellowPad: 0,
        bluePad: 0,
        greenPad: 0,
        orangePad: 0,
        yellowCymbal: 0,
        blueCymbal: 0,
        greenCymbal: 0,
        kick1: 0,
        kick2: 0,
      },
    };
  }
  id: string;
  type: string;
  cycleState: number;
  toggleState: boolean;
  connected: boolean = false;
  device: proto.IDevice;
  wiiExtType: proto.WiiExtType;
  ps2CntType: proto.PS2ControllerType;
  usbDevices: { [key: number]: proto.IUsbDeviceHotplugEvent };
  crkdDrumCalibration: { [key in proto.CrkdDrumCalibrationType]: proto.ICrkdCalibrationData };
  static label(status: DeviceStatus) {
    let label = DeviceStatus.pins(status)
      ?.map((x) => `GP${x}`)
      .join(', ');
    switch (status.type) {
      case 'wii':
        label = `${status.wiiExtType !== proto.WiiExtType.WiiNoExtension ? 'Connected' : 'Disconnected'}, ${label}`;
        break;
      case 'psx':
        label = `${status.ps2CntType !== proto.PS2ControllerType.PS2ControllerTypeUnknown ? 'Connected' : 'Disconnected'}, ${label}`;
        break;
      case 'usbHost':
        label = `${Object.values(status.usbDevices).length !== 0 ? 'Connected' : 'Disconnected'}, ${label}`;
        break;
      case 'ws2812':
      case 'apa102':
      case 'stp16cpc':
      case 'multiplexer':
      case 'matrix':
        break;

      case 'cycle':
        label = `${status.id}`;
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
  static pins(status: DeviceStatus): number[] {
    switch (status.type) {
      case 'ws2812':
        return [status.device.ws2812!.pin];
      case 'apa102':
        return [status.device.apa102!.spi.mosi, status.device.apa102!.spi.sck];
      case 'stp16cpc':
        return [
          status.device.stp16cpc!.spi.mosi,
          status.device.stp16cpc!.spi.miso,
          status.device.stp16cpc!.spi.sck,
          status.device.stp16cpc!.le,
          status.device.stp16cpc!.oe,
        ];
      case 'wii':
        return [status.device.wii!.i2c.sda, status.device.wii!.i2c.scl];
      case 'ads1115':
        return [status.device.ads1115!.i2c.sda, status.device.ads1115!.i2c.scl];
      case 'accelerometer':
        return [status.device.accelerometer!.i2c.sda, status.device.accelerometer!.i2c.scl];
      case 'bhDrum':
        return [status.device.bhDrum!.i2c.sda, status.device.bhDrum!.i2c.scl];
      case 'mpu6050':
        return [status.device.accelerometer!.i2c.sda, status.device.accelerometer!.i2c.scl];
      case 'worldTourDrum':
        return [
          status.device.worldTourDrum!.spi.mosi,
          status.device.worldTourDrum!.spi.miso,
          status.device.worldTourDrum!.spi.sck,
        ];
      case 'usbHost':
        return [status.device.usbHost!.firstPin, status.device.usbHost!.firstPin + 1];
      case 'mpr121':
        return [status.device.mpr121!.i2c.sda, status.device.mpr121!.i2c.scl];
      case 'crazyGuitarNeck':
        return [status.device.crazyGuitarNeck!.i2c.sda, status.device.crazyGuitarNeck!.i2c.scl];
      case 'gh5Neck':
        return [status.device.gh5Neck!.i2c.sda, status.device.gh5Neck!.i2c.scl];
      case 'djhTurntable':
        return [status.device.djhTurntable!.i2c.sda, status.device.djhTurntable!.i2c.scl];
      case 'midiSerial':
        return [status.device.midiSerial!.uart.tx, status.device.midiSerial!.uart.rx];
      case 'crkdNeck':
        return [status.device.crkdNeck!.uart.tx, status.device.crkdNeck!.uart.rx];
      case 'crkdDrum':
        return [status.device.crkdDrum!.uart.tx, status.device.crkdDrum!.uart.rx];
      case 'multiplexer':
        return status.device.multiplexer!.sixteenChannel
          ? [
              status.device.multiplexer!.s0Pin,
              status.device.multiplexer!.s1Pin,
              status.device.multiplexer!.s2Pin,
              status.device.multiplexer!.s3Pin,
              status.device.multiplexer!.inputPin,
            ]
          : [
              status.device.multiplexer!.s0Pin,
              status.device.multiplexer!.s1Pin,
              status.device.multiplexer!.s2Pin,
              status.device.multiplexer!.inputPin,
            ];
      case 'psx':
        return [
          status.device.psx!.spi.mosi,
          status.device.psx!.spi.miso,
          status.device.psx!.spi.sck,
          status.device.psx!.ackPin,
          status.device.psx!.attPin,
        ];
      case 'protarNeck':
        return [
          status.device.protarNeck!.spi.mosi,
          status.device.protarNeck!.spi.miso,
          status.device.protarNeck!.spi.sck,
          status.device.protarNeck!.attPin,
        ];
      case 'snes':
        return [
          status.device.snes!.clockPin,
          status.device.snes!.latchPin,
          status.device.snes!.dataPin,
        ];
      case 'joybus':
        return [status.device.joybus!.dataPin];
      case 'wiiEmulation':
        return [status.device.wiiEmulation!.i2c.sda, status.device.wiiEmulation!.i2c.scl];
      case 'psxEmulation':
        return [
          status.device.psxEmulation!.commandPin,
          status.device.psxEmulation!.attentionPin,
          status.device.psxEmulation!.acknowledgePin,
          status.device.psxEmulation!.dataPin,
          status.device.psxEmulation!.clockPin,
        ];
      case 'vtechExpander':
        return [
          status.device.vtechExpander!.spi.mosi,
          status.device.vtechExpander!.spi.miso,
          status.device.vtechExpander!.spi.sck,
          status.device.vtechExpander!.attPin,
        ];
      case 'matrix':
        return Array.from(Array(32).keys()).filter(
          (x) => (status.device.matrix!.outPins! | status.device.matrix!.inPins!) & (1 << x)
        );
      case 'joybusEmulation':
        return [status.device.joybusEmulation!.dataPin];
      case 'peripheral':
        return [status.device.peripheral!.i2c.sda, status.device.peripheral!.i2c.scl];
      default:
        return [];
    }
  }
}
export interface ConfigState {
  deviceStatus: { [id: string]: DeviceStatus };
  mappingStatus: { [id: number]: MappingStatus }[];
  ledStatus: { [id: number]: LedStatus }[];
  activationStatus: { [id: number]: ActivationStatus[] }[];
  guiDevices: { [id: number]: proto.IGuiConfig };
  config: proto.IConfig;
  connected: boolean;
  latest: boolean;
  hidDevice?: HIDDevice;
  crc: number;
  waitingForReload: boolean;
  writing: boolean;
  polling: boolean;
  updating: boolean;
  detected: number;
  type: string;
  updatePercentage: number;
  detectedMapping?: number;
  detectedActivation?: number;
  detectedInnerMapping?: number;
  detectedLed?: number;
  detecting: boolean;
  lastUpdate: number;
  writeTimeout?: NodeJS.Timeout;
  keepaliveTimeout?: NodeJS.Timeout;
  currentProfile: number;
  lastProfile: number;
  activeProfiles: number[];
  midiData: number[][];
  console: string;
  sendingKeepAlive: boolean;
  toolInfo?: proto.ISellerConfig;
  simpleMode: boolean;
  syncInputs: boolean;
  seller: boolean;
  sellerCheck: boolean;
}
export interface Actions {
  checkLogin: () => void;
  setSyncMode: (mode: boolean) => void;
  updateLabel: (config: proto.IGuiConfig, id: number) => void;
  deleteLabel: (id: number) => void;
  copyLabel: (config: proto.IGuiConfig) => void;
  addLabel: () => void;
  addLedLabel: () => void;
  addMultiplexerLabel: () => void;
  addMatrixLabel: () => void;
  deleteAllLabels: () => void;
  updateDevice: (device: proto.IDevice, id: string) => void;
  updateProfile: (profile: proto.IProfile, id: number) => void;
  updateProfiles: (profiles: proto.IProfile[]) => void;
  updateCycle: (id: number, state: number) => void;
  updateToggle: (id: number, state: boolean) => void;
  addProfile: () => void;
  deleteProfile: (id: number) => void;
  updateConfig: (config: proto.IConfig) => void;
  deleteDevice: (id: string) => void;
  connect: () => void;
  firmwareUpdate: () => void;
  login: () => void;
  disconnect: () => void;
  reconnect: (device: HIDDevice) => void;
  bootloader: () => void;
  deleteAllDevices: () => void;
  addDevice: (type: string) => void;
  onReport: (evt: HIDInputReportEvent) => void;
  setActiveProfile: (id: string | null) => void;
  sendKeepAlive: () => void;
  saveConfig: () => void;
  buildConfigBuffer: () => { buffer: Uint8Array; mainLen: number; auxLen: number };
  buildConfig: () => { config: proto.IConfig; aux: proto.IAuxConfigBlock };
  exportConfig: () => void;
  loadConfig: (file: File | null) => void;
  pollInputs: (poll: boolean) => void;
  loadDefaults: (device: DeviceStatus | undefined) => void;
  clearConsole: () => void;
  clearMidi: () => void;
  buildUf2: (pico2: boolean) => void;
  setSellerToolName: (name: string) => void;
  setSellerToolLogo: (image: File) => void;
  setSimpleMode: (mode: boolean) => void;
  updateCrkdDrumCalibration: (
    id: string,
    type: proto.CrkdDrumCalibrationType,
    key: keyof proto.ICrkdCalibrationData,
    val: number
  ) => void;
  detectPins: (
    activation: number | undefined,
    mapping: number | undefined,
    led: number | undefined,
    innerMapping: number | undefined,
    type: proto.PinDetectType
  ) => void;
}

function InitState(config: proto.Config, aux: proto.AuxConfigBlock): ConfigState {
  const deviceStatus = Object.fromEntries(
    config.devices!.map((x, _) => [
      x.deviceid,
      new DeviceStatus(x.deviceid.toString(), Object.keys(x).find((x) => x !== 'deviceid')!, x),
    ])
  );
  const mappingStatus = config.profiles!.map((profile) =>
    Object.fromEntries(profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)]))
  );
  const activationStatus = config.profiles!.map((profile) =>
    Object.fromEntries(
      profile.assignments!.map((x, listIdx) => [
        listIdx,
        x.assignments!.map((x, i) => new ActivationStatus(i, x)),
      ])
    )
  );
  const ledStatus = config.profiles!.map((profile) =>
    Object.fromEntries(profile.leds.map((x, i) => [i, new LedStatus(i, x)]))
  );
  const guiDevices = Object.fromEntries(
    config.guiConfig
      .filter(
        (x) =>
          x.config === 'label' ||
          x.config === 'ledLabel' ||
          x.config === 'matrixLabel' ||
          x.config === 'multiplexerLabel'
      )
      .map((x) => [x.deviceid, x])
  );
  aux.states.forEach((x) => (deviceStatus[x.id].cycleState = x.state));
  const toolInfo = config.guiConfig.find((x) => x.config === 'seller')?.seller || undefined;
  document.title = toolInfo?.name || 'Santroller';
  return {
    deviceStatus,
    mappingStatus,
    activationStatus,
    ledStatus,
    config,
    updatePercentage: 0,
    waitingForReload: false,
    updating: false,
    connected: false,
    detecting: false,
    seller: false,
    sellerCheck: false,
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
    guiDevices,
    console: '',
    type: '',
    sendingKeepAlive: false,
    toolInfo,
    simpleMode: !!toolInfo && !localStorage.getItem('auth'),
    syncInputs: config.syncCalibrations || false,
  };
}

export const initialConfig = InitState(
  proto.Config.create({
    devices: [],
    profiles: [],
  }),
  proto.AuxConfigBlock.create({
    states: [],
  })
);

const WiiMappings = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.WiiButtonType.WiiButtonGuitarGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green,
    [proto.WiiButtonType.WiiButtonGuitarRed]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red,
    [proto.WiiButtonType.WiiButtonGuitarYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow,
    [proto.WiiButtonType.WiiButtonGuitarBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue,
    [proto.WiiButtonType.WiiButtonGuitarOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange,
    [proto.WiiButtonType.WiiButtonGuitarTapGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen,
    [proto.WiiButtonType.WiiButtonGuitarTapRed]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed,
    [proto.WiiButtonType.WiiButtonGuitarTapYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow,
    [proto.WiiButtonType.WiiButtonGuitarTapBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue,
    [proto.WiiButtonType.WiiButtonGuitarTapOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange,
  },
  [proto.SubType.RockBandGuitar]: {
    [proto.WiiButtonType.WiiButtonGuitarGreen]: proto.RockBandGuitarButtonType.RockBandGuitar_Green,
    [proto.WiiButtonType.WiiButtonGuitarRed]: proto.RockBandGuitarButtonType.RockBandGuitar_Red,
    [proto.WiiButtonType.WiiButtonGuitarYellow]:
      proto.RockBandGuitarButtonType.RockBandGuitar_Yellow,
    [proto.WiiButtonType.WiiButtonGuitarBlue]: proto.RockBandGuitarButtonType.RockBandGuitar_Blue,
    [proto.WiiButtonType.WiiButtonGuitarOrange]:
      proto.RockBandGuitarButtonType.RockBandGuitar_Orange,
    [proto.WiiButtonType.WiiButtonGuitarTapGreen]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen,
    [proto.WiiButtonType.WiiButtonGuitarTapRed]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed,
    [proto.WiiButtonType.WiiButtonGuitarTapYellow]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow,
    [proto.WiiButtonType.WiiButtonGuitarTapBlue]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue,
    [proto.WiiButtonType.WiiButtonGuitarTapOrange]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange,
  },
  [proto.SubType.Gamepad]: {
    [proto.WiiButtonType.WiiButtonClassicA]: proto.GamepadButtonType.Gamepad_A,
    [proto.WiiButtonType.WiiButtonClassicB]: proto.GamepadButtonType.Gamepad_B,
    [proto.WiiButtonType.WiiButtonClassicX]: proto.GamepadButtonType.Gamepad_X,
    [proto.WiiButtonType.WiiButtonClassicY]: proto.GamepadButtonType.Gamepad_Y,
    [proto.WiiButtonType.WiiButtonClassicDPadUp]: proto.GamepadButtonType.Gamepad_DpadUp,
    [proto.WiiButtonType.WiiButtonClassicDPadDown]: proto.GamepadButtonType.Gamepad_DpadDown,
    [proto.WiiButtonType.WiiButtonClassicDPadLeft]: proto.GamepadButtonType.Gamepad_DpadLeft,
    [proto.WiiButtonType.WiiButtonClassicDPadRight]: proto.GamepadButtonType.Gamepad_DpadRight,
    [proto.WiiButtonType.WiiButtonClassicZl]: proto.GamepadButtonType.Gamepad_LeftShoulder,
    [proto.WiiButtonType.WiiButtonClassicZr]: proto.GamepadButtonType.Gamepad_RightShoulder,
    [proto.WiiButtonType.WiiButtonClassicPlus]: proto.GamepadButtonType.Gamepad_Start,
    [proto.WiiButtonType.WiiButtonClassicMinus]: proto.GamepadButtonType.Gamepad_Back,
    [proto.WiiButtonType.WiiButtonClassicHome]: proto.GamepadButtonType.Gamepad_Guide,
  },
};

const CrkdMappings = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange,
    [proto.CrkdNeckButtonType.CrkdSoloGreen]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen,
    [proto.CrkdNeckButtonType.CrkdSoloRed]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed,
    [proto.CrkdNeckButtonType.CrkdSoloYellow]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow,
    [proto.CrkdNeckButtonType.CrkdSoloBlue]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue,
    [proto.CrkdNeckButtonType.CrkdSoloOrange]:
      proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange,
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.GamepadButtonType.Gamepad_DpadUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]: proto.GamepadButtonType.Gamepad_DpadDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]: proto.GamepadButtonType.Gamepad_DpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]: proto.GamepadButtonType.Gamepad_DpadRight,
  },
  [proto.SubType.RockBandGuitar]: {
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.RockBandGuitarButtonType.RockBandGuitar_Green,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.RockBandGuitarButtonType.RockBandGuitar_Red,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.RockBandGuitarButtonType.RockBandGuitar_Blue,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.RockBandGuitarButtonType.RockBandGuitar_Orange,
    [proto.CrkdNeckButtonType.CrkdSoloGreen]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen,
    [proto.CrkdNeckButtonType.CrkdSoloRed]: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed,
    [proto.CrkdNeckButtonType.CrkdSoloYellow]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow,
    [proto.CrkdNeckButtonType.CrkdSoloBlue]: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue,
    [proto.CrkdNeckButtonType.CrkdSoloOrange]:
      proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange,
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.GamepadButtonType.Gamepad_DpadUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]: proto.GamepadButtonType.Gamepad_DpadDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]: proto.GamepadButtonType.Gamepad_DpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]: proto.GamepadButtonType.Gamepad_DpadRight,
  },
  [proto.SubType.Gamepad]: {
    [proto.CrkdNeckButtonType.CrkdGreen]: proto.GamepadButtonType.Gamepad_A,
    [proto.CrkdNeckButtonType.CrkdRed]: proto.GamepadButtonType.Gamepad_B,
    [proto.CrkdNeckButtonType.CrkdYellow]: proto.GamepadButtonType.Gamepad_X,
    [proto.CrkdNeckButtonType.CrkdBlue]: proto.GamepadButtonType.Gamepad_Y,
    [proto.CrkdNeckButtonType.CrkdOrange]: proto.GamepadButtonType.Gamepad_LeftShoulder,
    [proto.CrkdNeckButtonType.CrkdDpadUp]: proto.GamepadButtonType.Gamepad_DpadUp,
    [proto.CrkdNeckButtonType.CrkdDpadDown]: proto.GamepadButtonType.Gamepad_DpadDown,
    [proto.CrkdNeckButtonType.CrkdDpadLeft]: proto.GamepadButtonType.Gamepad_DpadLeft,
    [proto.CrkdNeckButtonType.CrkdDpadRight]: proto.GamepadButtonType.Gamepad_DpadRight,
  },
};

const CrkdDrumAxisMappings = {
  [proto.SubType.GuitarHeroDrums]: {
    [proto.CrkdDrumAxisType.CrkdGreenPad]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad,
    [proto.CrkdDrumAxisType.CrkdRedPad]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad,
    [proto.CrkdDrumAxisType.CrkdYellowPad]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad,
    [proto.CrkdDrumAxisType.CrkdBluePad]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad,
    [proto.CrkdDrumAxisType.CrkdGreenCymbal]:
      proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad,
    [proto.CrkdDrumAxisType.CrkdBlueCymbal]:
      proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad,
    [proto.CrkdDrumAxisType.CrkdYellowCymbal]:
      proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad,
    [proto.CrkdDrumAxisType.CrkdKick1]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal,
    [proto.CrkdDrumAxisType.CrkdKick2]: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal,
  },
  [proto.SubType.RockBandDrums]: {
    [proto.CrkdDrumAxisType.CrkdRedPad]: proto.RockBandDrumsAxisType.RockBandDrums_RedPad,
    [proto.CrkdDrumAxisType.CrkdYellowPad]: proto.RockBandDrumsAxisType.RockBandDrums_YellowPad,
    [proto.CrkdDrumAxisType.CrkdBluePad]: proto.RockBandDrumsAxisType.RockBandDrums_BluePad,
    [proto.CrkdDrumAxisType.CrkdGreenPad]: proto.RockBandDrumsAxisType.RockBandDrums_GreenPad,
    [proto.CrkdDrumAxisType.CrkdYellowCymbal]:
      proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal,
    [proto.CrkdDrumAxisType.CrkdBlueCymbal]: proto.RockBandDrumsAxisType.RockBandDrums_BlueCymbal,
    [proto.CrkdDrumAxisType.CrkdGreenCymbal]: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal,
  },
};

const CrkdDrumButtonMappings = {
  [proto.SubType.GuitarHeroDrums]: {},
  [proto.SubType.RockBandDrums]: {
    [proto.CrkdDrumAxisType.CrkdKick1]: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal,
    [proto.CrkdDrumAxisType.CrkdKick2]: proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal,
  },
  [proto.SubType.Gamepad]: {
    [proto.CrkdDrumAxisType.CrkdRedPad]: proto.GamepadButtonType.Gamepad_B,
    [proto.CrkdDrumAxisType.CrkdYellowPad]: proto.GamepadButtonType.Gamepad_X,
    [proto.CrkdDrumAxisType.CrkdBluePad]: proto.GamepadButtonType.Gamepad_Y,
    [proto.CrkdDrumAxisType.CrkdGreenPad]: proto.GamepadButtonType.Gamepad_A,
    [proto.CrkdDrumAxisType.CrkdYellowCymbal]: proto.GamepadButtonType.Gamepad_X,
    [proto.CrkdDrumAxisType.CrkdBlueCymbal]: proto.GamepadButtonType.Gamepad_Y,
    [proto.CrkdDrumAxisType.CrkdGreenCymbal]: proto.GamepadButtonType.Gamepad_A,
    [proto.CrkdDrumAxisType.CrkdKick1]: proto.GamepadButtonType.Gamepad_LeftShoulder,
    [proto.CrkdDrumAxisType.CrkdKick2]: proto.GamepadButtonType.Gamepad_RightShoulder,
  },
};

const WiiMappingsStick = {
  [proto.SubType.Gamepad]: {
    [proto.WiiAxisType.WiiAxisClassicLeftStickX]: proto.GamepadAxisType.Gamepad_LeftStickX,
    [proto.WiiAxisType.WiiAxisClassicLeftStickY]: proto.GamepadAxisType.Gamepad_LeftStickY,
    [proto.WiiAxisType.WiiAxisClassicRightStickX]: proto.GamepadAxisType.Gamepad_RightStickX,
    [proto.WiiAxisType.WiiAxisClassicRightStickY]: proto.GamepadAxisType.Gamepad_RightStickY,
  },
};
const WiiMappingsTrigger = {
  [proto.SubType.GuitarHeroGuitar]: {
    [proto.WiiAxisType.WiiAxisGuitarWhammy]: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy,
  },
  [proto.SubType.RockBandGuitar]: {
    [proto.WiiAxisType.WiiAxisGuitarWhammy]: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy,
  },
  [proto.SubType.Gamepad]: {
    [proto.WiiAxisType.WiiAxisClassicLeftTrigger]: proto.GamepadAxisType.Gamepad_LeftTrigger,
    [proto.WiiAxisType.WiiAxisClassicRightTrigger]: proto.GamepadAxisType.Gamepad_RightTrigger,
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
    case 'protarNeck':
      device = { spi: { mosi: -1, miso: -1, sck: -1, block: 0, clock: 100000 }, attPin: -1 };
      break;
    case 'vtechExpander':
      device = { spi: { mosi: -1, miso: -1, sck: -1, block: 0, clock: 10000 }, attPin: -1 };
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
      device = { spi, csPin: -1 };
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
      device = { firstPin: -1, dmFirst: false };
      break;
    case 'midiSerial':
      device = { uart: { ...uart, clock: 31250 } };
      break;
    case 'crkdDrum':
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
    case 'encoder':
      device = { dataPin: -1 };
      break;
    case 'joybus':
    case 'joybusEmulation':
      device = { dataPin: -1 };
      break;
    case 'psxEmulation':
      device = { commandPin: -1, attentionPin: -1, acknowledgePin: -1, dataPin: -1, clockPin: -1 };
      break;
    case 'matrix':
      device = { inPins: 0, outPins: 0 };
      break;
    case 'cycle':
      device = { values: [0] };
      break;
    case 'toggle':
      device = {};
      break;
    case 'dmx':
      device = { pin: -1, channelCount: 1 };
      break;
  }
  return new DeviceStatus(id, type, {
    deviceid: parseInt(id, 10),
    [type]: { ...device, mappingMode },
  });
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
function encodeBase64Url(message: Uint8Array) {
  return message.toBase64().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
async function sha256(message: string) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return encodeBase64Url(new Uint8Array(hashBuffer));
}

export const useConfigStore = create<ConfigState & Actions>()(
  immer((set, get) => ({
    ...initialConfig,
    checkLogin: async () => {
      const auth = localStorage.getItem('auth');
      if (auth) {
        let authJson = JSON.parse(auth);
        if (Date.now() > authJson.expires_at) {
          const url = new URL('https://worker.tangentmc.net/github-auth-refresh-token-endpoint');
          url.searchParams.set('refresh_token', authJson.refresh_token);
          const data = await fetch(url.href);
          authJson = await data.json();
          authJson.expires_at = Date.now() + authJson.expires_in * 1000;
          localStorage.setItem('auth', JSON.stringify(authJson));
        }
        const url = new URL('https://worker.tangentmc.net/github-auth-check-access-endpoint');
        url.searchParams.set('access_token', authJson.access_token);
        const response = await fetch(url);
        set((state) => {
          state.sellerCheck = true;
          state.seller = response.ok;
        });
      }
    },
    login: async () => {
      const login = {
        state: encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))),
        code_challenge: encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))),
      };
      localStorage.setItem('login', JSON.stringify(login));
      const url = new URL('https://worker.tangentmc.net/github-auth-endpoint');
      url.searchParams.set('state', login.state);
      url.searchParams.set('code_challenge', await sha256(login.code_challenge));
      url.searchParams.set('code_challenge_method', 'S256');
      window.location.href = url.href;
    },
    setSimpleMode: (mode: boolean) => {
      set((state) => {
        state.simpleMode = mode;
      });
    },
    setSyncMode: (mode: boolean) => {
      set((state) => {
        state.syncInputs = mode;
      });
      get().saveConfig();
    },
    setSellerToolName: async (name: string) => {
      const image = new Uint8Array(await (await fetch('/icons/logo.png')).arrayBuffer());
      set((state) => {
        if (!state.toolInfo) {
          state.toolInfo = { name, logo: image };
        }
        state.toolInfo = { ...state.toolInfo, name };
      });
      get().saveConfig();
    },
    setSellerToolLogo: async (image: File) => {
      const logo = new Uint8Array(await image.arrayBuffer());
      set((state) => {
        if (!state.toolInfo) {
          state.toolInfo = { name: 'Seller Tool', logo: new Uint8Array() };
        }
        state.toolInfo = { ...state.toolInfo, logo };
      });
      get().saveConfig();
    },
    updateLabel: (label: proto.IGuiConfig, id: number) => {
      set((state) => {
        state.guiDevices[id] = label;
      });
      get().saveConfig();
    },
    deleteLabel: (id: number) => {
      set((state) => {
        state.guiDevices = Object.fromEntries(
          Object.entries(state.guiDevices).filter((x) => x[0] !== id.toString())
        );
      });
      get().saveConfig();
    },

    copyLabel: (label: proto.IGuiConfig) => {
      set((state) => {
        let id = 0;
        if (Object.keys(state.guiDevices).length) {
          id = Math.max(...Object.values(state.guiDevices).map((x) => x.deviceid)) + 1;
        }
        state.guiDevices[id] = {
          ...label,
          deviceid: id,
        };
      });
      get().saveConfig();
    },

    addLabel: () => {
      set((state) => {
        let id = 0;
        if (Object.keys(state.guiDevices).length) {
          id = Math.max(...Object.values(state.guiDevices).map((x) => x.deviceid)) + 1;
        }
        state.guiDevices[id] = {
          deviceid: id,
          label: { label: 'Label', pin: -1 },
        };
      });
      get().saveConfig();
    },
    addLedLabel: () => {
      set((state) => {
        let id = 0;
        if (Object.keys(state.guiDevices).length) {
          id = Math.max(...Object.values(state.guiDevices).map((x) => x.deviceid)) + 1;
        }
        state.guiDevices[id] = {
          deviceid: id,
          ledLabel: { label: 'Label', deviceid: -1, activeLed: [] },
        };
      });
      get().saveConfig();
    },
    addMultiplexerLabel: () => {
      set((state) => {
        let id = 0;
        if (Object.keys(state.guiDevices).length) {
          id = Math.max(...Object.values(state.guiDevices).map((x) => x.deviceid)) + 1;
        }
        state.guiDevices[id] = {
          deviceid: id,
          multiplexerLabel: { label: 'Label', deviceid: -1, channel: 0 },
        };
      });
      get().saveConfig();
    },
    addMatrixLabel: () => {
      set((state) => {
        let id = 0;
        if (Object.keys(state.guiDevices).length) {
          id = Math.max(...Object.values(state.guiDevices).map((x) => x.deviceid)) + 1;
        }
        state.guiDevices[id] = {
          deviceid: id,
          matrixLabel: { label: 'Label', deviceid: -1, inputPin: -1, outputPin: -1 },
        };
      });
      get().saveConfig();
    },
    deleteAllLabels: () => {
      set((state) => {
        state.guiDevices = {};
      });
      get().saveConfig();
    },
    updateCrkdDrumCalibration: async (id, type, key, val) => {
      set((state) => {
        state.deviceStatus[id].crkdDrumCalibration = {
          ...state.deviceStatus[id].crkdDrumCalibration,
          [type]: { ...state.deviceStatus[id].crkdDrumCalibration[type], [key]: val },
        };
      });
      const state = get();
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          crkdDrum: proto.CrkdCalibrationUpdateCommand.create({
            id: parseInt(id, 10),
            type,
            axisType:
              proto.CrkdDrumAxisType[
                `Crkd${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof proto.CrkdDrumAxisType
              ],
            val,
          }),
        })
      )
        .ldelim()
        .finish();
      const outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
    },
    clearConsole: () => {
      set((state) => {
        state.console = '';
      });
    },
    clearMidi: () => {
      set((state) => {
        state.midiData = [];
      });
    },
    updateDevice: (device: proto.IDevice, id: string) => {
      set((state) => {
        state.deviceStatus[id].device = device;
      });
      get().saveConfig();
    },
    updateCycle: (id: number, val: number) => {
      set((state) => {
        state.deviceStatus[id].cycleState = val;
      });
      get().saveConfig();
    },
    updateToggle: (id: number, val: boolean) => {
      set((state) => {
        state.deviceStatus[id].toggleState = val;
      });
      get().saveConfig();
    },
    setActiveProfile: async (id: string | null) => {
      if (id === 'add') {
        return;
      }
      set((state) => {
        state.lastProfile = state.currentProfile;
        state.currentProfile = parseInt(id ?? '0', 10);
      });
      const state = get();
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          setProfile: proto.SetProfileCommand.create({
            profileId: state.config.profiles![parseInt(id ?? '0', 10)].opts.uid,
          }),
        })
      )
        .ldelim()
        .finish();
      const outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
    },
    updateProfile: (profile: proto.IProfile, id: number) => {
      set((state) => {
        if (
          state.config.profiles![id].opts.faceButtonMappingMode !==
          profile.opts.faceButtonMappingMode
        ) {
          profile.mappings = profile.mappings?.map(fixInput);
        }
        state.config = {
          ...state.config,
          profiles: [
            ...state.config.profiles!.map((prevProfile, prevIndex) =>
              prevIndex === id ? profile : prevProfile
            ),
          ],
        };
        state.detected = -1;
        state.mappingStatus[id] = Object.fromEntries(
          profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
        );
        state.activationStatus[id] = Object.fromEntries(
          profile.assignments!.map((x, listIdx) => [
            listIdx,
            x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
          ])
        );
        state.ledStatus[id] = Object.fromEntries(
          profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
        );
      });
      get().saveConfig();
    },
    updateProfiles: (profiles: proto.IProfile[]) => {
      set((state) => {
        profiles.forEach((profile, id) => {
          if (
            state.config.profiles![id].opts.faceButtonMappingMode !==
            profile.opts.faceButtonMappingMode
          ) {
            profile.mappings = profile.mappings?.map(fixInput);
          }
          state.config = {
            ...state.config,
            profiles: [
              ...state.config.profiles!.map((prevProfile, prevIndex) =>
                prevIndex === id ? profile : prevProfile
              ),
            ],
          };
          state.detected = -1;
          state.mappingStatus[id] = Object.fromEntries(
            profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
          );
          state.activationStatus[id] = Object.fromEntries(
            profile.assignments!.map((x, listIdx) => [
              listIdx,
              x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
            ])
          );
          state.ledStatus[id] = Object.fromEntries(
            profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
          );
        });
      });
      get().saveConfig();
    },
    deleteProfile: (id: number) => {
      set((state) => {
        if (state.currentProfile === id) {
          state.currentProfile = Math.max(id - 1, 0);
        }
        state.config = {
          ...state.config,
          profiles: state.config.profiles?.filter((_, i) => i !== id),
        };
        state.mappingStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)]))
        );

        state.activationStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(
            profile.assignments!.map((x, listIdx) => [
              listIdx,
              x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
            ])
          )
        );
        state.ledStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(profile.leds!.map((x, i) => [i, new LedStatus(i, x)]))
        );
      });
      get().saveConfig();
    },
    sendKeepAlive: async () => {
      const state = get();
      const dev = state.hidDevice;
      if (!dev || state.sendingKeepAlive || state.writing) {
        return;
      }
      // only ever have a single keep alive in flight at once, and ignore additional requests while one is in flight
      set((state) => {
        state.sendingKeepAlive = true;
      });
      try {
        await dev.sendFeatureReport(proto.ReportId.ReportIdKeepalive, new Uint8Array([0]));
      } catch (e) {
        console.error('Failed to send keep alive', e);
      }
      set((state) => {
        state.sendingKeepAlive = false;
      });
    },
    detectPins: async (
      activation: number | undefined,
      mapping: number | undefined,
      led: number | undefined,
      innerMapping: number | undefined,
      type: proto.PinDetectType
    ) => {
      const dev = get().hidDevice;
      if (!dev) {
        return;
      }
      set((state) => {
        state.detected = -1;
        state.detecting = true;
        state.detectedLed = led;
        state.detectedMapping = mapping;
        state.detectedActivation = activation;
        state.detectedInnerMapping = innerMapping;
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
      const outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await dev.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
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
          case 'gpio':
            switch (profile.opts.deviceToEmulate) {
              case proto.SubType.GuitarHeroGuitar:
                profile.mappings!.push(
                  ...Object.entries(proto.GuitarHeroGuitarAxisType).map(([type, base]) => ({
                    mapping: {
                      ghAxis: base as proto.GuitarHeroGuitarAxisType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: true,
                      },
                    },
                    min: 0,
                    max: 65535,
                    center: type.toString().includes('Stick') ? 32767 : 0,
                  })),
                  ...Object.values(proto.GuitarHeroGuitarButtonType).map((base) => ({
                    mapping: {
                      ghButton: base as proto.GuitarHeroGuitarButtonType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: false,
                      },
                    },
                  }))
                );
                break;
              case proto.SubType.GuitarHeroDrums:
                profile.mappings!.push(
                  ...Object.entries(proto.GuitarHeroDrumsAxisType).map(([type, base]) => ({
                    mapping: {
                      ghDrumAxis: base as proto.GuitarHeroDrumsAxisType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: true,
                      },
                    },
                    debounce: type.toString().includes('Pad') ? 30 : 0,
                    min: 0,
                    max: 65535,
                    center: type.toString().includes('Stick') ? 32767 : 0,
                  }))
                );
                break;
              case proto.SubType.RockBandGuitar:
                profile.mappings!.push(
                  ...Object.entries(proto.RockBandGuitarAxisType).map(([type, base]) => ({
                    mapping: {
                      rbAxis: base as proto.RockBandGuitarAxisType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: true,
                      },
                    },
                    min: 0,
                    max: 65535,
                    center: type.toString().includes('Stick') ? 32767 : 0,
                  })),
                  ...Object.values(proto.RockBandGuitarButtonType).map((base) => ({
                    mapping: {
                      rbButton: base as proto.RockBandGuitarButtonType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: false,
                      },
                    },
                  }))
                );
                break;
              case proto.SubType.RockBandDrums:
                profile.mappings!.push(
                  ...Object.entries(proto.RockBandDrumsAxisType).map(([type, base]) => ({
                    mapping: {
                      rbDrumAxis: base as proto.RockBandDrumsAxisType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: true,
                      },
                    },
                    debounce:
                      type.toString().includes('Pad') || type.toString().includes('Cymbal')
                        ? 30
                        : 0,
                    min: 0,
                    max: 65535,
                    center: type.toString().includes('Stick') ? 32767 : 0,
                  })),
                  ...Object.values(proto.RockBandDrumsButtonType).map((base) => ({
                    mapping: {
                      rbDrumButton: base as proto.RockBandDrumsButtonType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: false,
                      },
                    },
                  }))
                );
                break;
              case proto.SubType.Dancepad:
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(proto.GamepadAxisType).map(([type, base]) => ({
                    mapping: {
                      gamepadAxis: base as proto.GamepadAxisType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: true,
                      },
                    },
                    min: 0,
                    max: 65535,
                    center: type.toString().includes('Stick') ? 32767 : 0,
                  })),
                  ...Object.values(proto.GamepadButtonType).map((base) => ({
                    mapping: {
                      gamepadButton: base as proto.GamepadButtonType,
                    },
                    input: {
                      gpio: {
                        pin: -1,
                        pinMode: proto.PinMode.PullUp,
                        analog: false,
                      },
                    },
                  }))
                );
                break;
            }
            break;
          case 'wii':
            switch (profile.opts.deviceToEmulate) {
              case proto.SubType.GuitarHeroGuitar:
                profile.mappings!.push(
                  ...Object.entries(WiiMappingsTrigger[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        ghAxis: base,
                      },
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  ),
                  ...Object.entries(WiiMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        ghButton: base,
                      },
                      input: {
                        wiiButton: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
              case proto.SubType.RockBandGuitar:
                profile.mappings!.push(
                  ...Object.entries(WiiMappingsTrigger[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        rbAxis: base,
                      },
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  ),
                  ...Object.entries(WiiMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        rbButton: base,
                      },
                      input: {
                        wiiButton: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(WiiMappingsTrigger[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        gamepadAxis: base,
                      },
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  ),
                  ...Object.entries(WiiMappingsStick[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        gamepadAxis: base,
                      },
                      input: {
                        wiiAxis: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 32767,
                    })
                  ),
                  ...Object.entries(WiiMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        gamepadButton: base,
                      },
                      input: {
                        wiiButton: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
            }
            break;
          case 'crkdDrum':
            switch (profile.opts.deviceToEmulate) {
              case proto.SubType.GuitarHeroDrums:
                profile.mappings!.push(
                  ...Object.entries(CrkdDrumAxisMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        ghDrumAxis: base,
                      },
                      input: {
                        crkdDrum: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  )
                );
                break;
              case proto.SubType.RockBandDrums:
                profile.mappings!.push(
                  ...Object.entries(CrkdDrumButtonMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        rbDrumButton: base,
                      },
                      input: {
                        crkdDrum: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  ),
                  ...Object.entries(CrkdDrumAxisMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        rbDrumAxis: base,
                      },
                      input: {
                        crkdDrum: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                      min: 0,
                      max: 65535,
                      center: 0,
                    })
                  )
                );
                break;
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(CrkdDrumButtonMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        gamepadButton: base,
                      },
                      input: {
                        crkdDrum: {
                          axis: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
            }
            break;
          case 'crkdNeck':
            switch (profile.opts.deviceToEmulate) {
              case proto.SubType.GuitarHeroGuitar:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: proto.GuitarHeroGuitarButtonType[base]
                        ? { ghButton: base as proto.GuitarHeroGuitarButtonType }
                        : { gamepadButton: base as proto.GamepadButtonType },
                      input: {
                        crkd: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
              case proto.SubType.RockBandGuitar:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: proto.RockBandGuitarButtonType[base]
                        ? { rbButton: base as proto.RockBandGuitarButtonType }
                        : { gamepadButton: base as proto.GamepadButtonType },
                      input: {
                        crkd: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
              case proto.SubType.Gamepad:
                profile.mappings!.push(
                  ...Object.entries(CrkdMappings[profile.opts.deviceToEmulate]).map(
                    ([wii, base]) => ({
                      mapping: {
                        gamepadButton: base,
                      },
                      input: {
                        crkd: {
                          button: parseInt(wii, 10),
                          deviceid: parseInt(device!.id!, 10),
                        },
                      },
                    })
                  )
                );
                break;
            }
            break;
        }
        state.config = {
          ...state.config,
          profiles: [
            ...state.config.profiles!.map((prevProfile, prevIndex) =>
              prevIndex === state.currentProfile ? profile : prevProfile
            ),
          ],
        };
        state.mappingStatus[state.currentProfile] = Object.fromEntries(
          profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
        );
        state.activationStatus[state.currentProfile] = Object.fromEntries(
          profile.assignments!.map((x, listIdx) => [
            listIdx,
            x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
          ])
        );
        state.ledStatus[state.currentProfile] = Object.fromEntries(
          profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
        );
      });
      get().saveConfig();
    },
    deleteDevice: (id: string) => {
      set((state) => {
        const idNum = parseInt(id, 10);
        const type = state.deviceStatus[id].type as keyof proto.IInput;
        if (type === 'gpio' || type === 'fixed' || type === 'shortcut' || type === 'held') {
          return;
        }
        delete state.deviceStatus[id];
        state.mappingStatus = state.mappingStatus.map((x) =>
          Object.fromEntries(
            Object.entries(x).filter(([_, x]) => x.mapping.input[type]?.deviceid !== idNum)
          )
        );
        state.config.profiles = state.config.profiles!.map((p) => ({
          ...p,
          mappings: p.mappings?.filter((x) => x.input[type]?.deviceid !== idNum),
          assignments: p.assignments?.map((x) => ({
            ...x,
            assignments: x.assignments?.filter(
              (y) =>
                (!y.input || y.input.input[type]?.deviceid !== idNum) &&
                (!y.inputAnyTime || y.inputAnyTime.input[type]?.deviceid !== idNum)
            ),
          })),
          leds: p.leds?.filter(
            (x) => !x.mapping.inputMapping || x.mapping.inputMapping.input[type]?.deviceid !== idNum
          ),
        }));
      });
      get().saveConfig();
    },
    addDevice: (type: string) => {
      set((state) => {
        let id = '0';
        if (Object.keys(state.deviceStatus).length) {
          id = (
            Math.max(...Object.values(state.deviceStatus).map((x) => x.device.deviceid)) + 1
          ).toString();
        }
        state.deviceStatus[id] = createDefault(type, id);
      });
      get().saveConfig();
    },
    onReport: (evt: HIDInputReportEvent) => {
      if (evt.reportId !== proto.ReportId.ReportIdConfig) {
        return;
      }
      const eventList = proto.EventList.decodeDelimited(new Uint8Array(evt.data.buffer));
      for (const deviceEvent of eventList.event) {
        if (deviceEvent.midiDebug) {
          set((state) => {
            if (deviceEvent.midiDebug) {
              state.midiData.push([...deviceEvent.midiDebug.data!]);
            }
          });
        }
        if (deviceEvent.cycle) {
          set((state) => {
            if (deviceEvent.cycle) {
              if (deviceEvent.cycle.id in state.deviceStatus) {
                state.deviceStatus[deviceEvent.cycle.id].cycleState = deviceEvent.cycle.state;
              }
            }
          });
        }
        if (deviceEvent.toggle) {
          set((state) => {
            if (deviceEvent.toggle) {
              if (deviceEvent.toggle.id in state.deviceStatus) {
                state.deviceStatus[deviceEvent.toggle.id].toggleState = deviceEvent.toggle.state;
              }
            }
          });
        }
        if (deviceEvent.console) {
          set((state) => {
            if (deviceEvent.console) {
              state.console += deviceEvent.console.data;
            }
          });
        }
        if (deviceEvent.reload) {
          set((state) => {
            state.waitingForReload = true;
          });
        }
        if (deviceEvent.ps2) {
          set((state) => {
            if (deviceEvent.ps2!.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.ps2!.id].ps2CntType = deviceEvent.ps2!.type;
            }
          });
        }
        if (deviceEvent.usb) {
          set((state) => {
            if (deviceEvent.usb!.id in state.deviceStatus) {
              const id = deviceEvent.usb!.port! * 127 + deviceEvent.usb!.interface!;
              if (deviceEvent.usb!.connected) {
                state.deviceStatus[deviceEvent.usb!.id].usbDevices[id] = deviceEvent.usb!;
              } else {
                delete state.deviceStatus[deviceEvent.usb!.id].usbDevices[id];
              }
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
        if (deviceEvent.crkdDrum) {
          set((state) => {
            if (deviceEvent.crkdDrum!.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.crkdDrum!.id].crkdDrumCalibration[
                deviceEvent.crkdDrum!.type
              ] = deviceEvent.crkdDrum!.data;
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
                mapping.stateNonZero = deviceEvent.button?.state ? 65535 : 0;
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
                mapping.state = deviceEvent.axis!.state!;
                mapping.stateRaw = deviceEvent.axis!.stateRaw!;
                if (mapping.state) {
                  mapping.stateNonZero = mapping.state;
                }
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
                const mapping = mappings[deviceEvent.trigger!.listId][deviceEvent.trigger!.id];
                mapping.state = deviceEvent.trigger!.state!;
                mapping.stateRaw = deviceEvent.trigger!.stateRaw!;
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
                mapping.state = deviceEvent.led!.state!;
                mapping.stateRaw = deviceEvent.led!.stateRaw!;
                if (mapping.state) {
                  mapping.stateNonZero = mapping.state;
                }
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
              opts: {
                faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
                deviceToEmulate: proto.SubType.Gamepad,
                name: 'Device',
                uid: Math.max(0, ...(state.config.profiles?.map((x) => x.opts.uid) || [])) + 1,
              },
              assignments: [],
              mappings: [],
              leds: [],
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

    disconnect: async () => {
      const state = get();
      const dev = state.hidDevice;
      dev?.removeEventListener('inputreport', state.onReport);
      if (dev?.opened) {
        if (state.keepaliveTimeout) {
          clearInterval(state.keepaliveTimeout);
        }
        try {
          const infoBuffer2 = proto.Command.encode(
            proto.Command.create({
              disconnect: proto.DisconnectCommand.create({}),
            })
          )
            .ldelim()
            .finish();
          const outBuffer2 = new ArrayBuffer(63);
          new Uint8Array(outBuffer2).set(infoBuffer2);
          await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
        } catch (e) {
          // if the device was already disconnected this can error and that is fine
        }
        dev?.close();
      }
      set((state) => {
        state.keepaliveTimeout = undefined;
        state.connected = state.waitingForReload;
        state.updating = false;
        state.hidDevice = undefined;
      });
    },
    reconnect: async (device: HIDDevice) => {
      if (!device.opened) {
        await device.open();
      }
      set(
        (state) => ({
          ...state,
          hidDevice: device,
          connected: true,
          polling: true,
          waitingForReload: false,
        }),
        true
      );
      device.addEventListener('inputreport', get().onReport);
      const timeout = setInterval(() => get().sendKeepAlive(), 10);
      await device.sendFeatureReport(proto.ReportId.ReportIdKeepalive, new Uint8Array([0]));
      const profileData = await device.receiveFeatureReport(
        proto.ReportId.ReportIdGetActiveProfiles
      );
      const activeProfiles = proto.GetActiveProfiles.decodeDelimited(
        new Uint8Array(profileData.buffer).slice(1)
      );
      const state = get();
      if (state.config.profiles![state.currentProfile]) {
        const infoBuffer2 = proto.Command.encode(
          proto.Command.create({
            setProfile: proto.SetProfileCommand.create({
              profileId: state.config.profiles![state.currentProfile].opts.uid,
            }),
          })
        )
          .ldelim()
          .finish();
        const outBuffer2 = new ArrayBuffer(63);
        new Uint8Array(outBuffer2).set(infoBuffer2);
        await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
      }
      set(
        (state) => ({
          ...state,
          keepaliveTimeout: timeout,
          activeProfiles: activeProfiles.profiles,
          waitingForReload: false,
        }),
        true
      );
    },
    bootloader: async () => {
      const dev = get().hidDevice;
      if (!dev) {
        return;
      }
      await dev.sendFeatureReport(proto.ReportId.ReportIdBootloader, new Uint8Array([0]));
    },
    pollInputs: (poll) =>
      set((state) => {
        state.polling = poll;
      }),
    exportConfig: () => {
      const state = get();
      if (state.hidDevice === null || !state.connected) {
        return;
      }
      const { config, aux } = get().buildConfig();
      const buffer = proto.Config.create(config).toJSON();
      const bufferAux = proto.AuxConfigBlock.create(aux).toJSON();
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify({ config: buffer, aux: bufferAux })], {
        type: 'text/json',
      });
      element.href = URL.createObjectURL(file);
      element.download = 'config.json';
      document.body.appendChild(element);
      element.click();
    },
    loadConfig: async (file: File | null) => {
      try {
        const data = JSON.parse((await file?.text()) ?? '');
        const config = proto.Config.fromObject(data.config);
        const aux = proto.AuxConfigBlock.fromObject(data.aux);
        const timeout = setInterval(() => get().sendKeepAlive(), 10);
        set(
          (old) => ({
            ...old,
            ...InitState(config, aux),
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
    buildUf2: (pico2: boolean) => {
      const { buffer, mainLen, auxLen } = get().buildConfigBuffer();
      buildUf2FromConfig(pico2, { buffer, mainLen, auxLen });
    },
    saveConfig: async () => {
      const state = get();
      if (state.hidDevice === null || !state.connected) {
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
      const { buffer, mainLen, auxLen } = get().buildConfigBuffer();
      const crc = new CRC32().calculate(buffer);
      // Don't write if nothing has changed
      if (crc === state.crc) {
        return;
      }
      set((state) => {
        state.writing = true;
        state.crc = crc;
        state.detecting = false;
        state.polling = false;
      });
      const infoBuffer = proto.ConfigInfo.encode(
        proto.ConfigInfo.create({
          dataSize: buffer.length,
          dataCrc: crc,
          auxSize: auxLen,
          mainSize: mainLen,
          magic,
        })
      )
        .ldelim()
        .finish();
      const outBuffer = new ArrayBuffer(63);
      new Uint8Array(outBuffer).set(infoBuffer);
      await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdConfigInfo, outBuffer);
      if (buffer.length === 0) {
        set((state) => {
          state.writing = false;
        });
        return;
      }
      let start = 0;
      const len = 63;
      while (start < buffer.length) {
        const slice = new ArrayBuffer(63);
        new Uint8Array(slice).set(buffer.slice(start, start + len));
        start += len;
        await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdConfig, slice);
      }
      set((state) => {
        state.writing = false;
        state.polling = true;
        state.waitingForReload = true;
      });
    },
    buildConfigBuffer: () => {
      const { config, aux } = get().buildConfig();
      const bufferMain = proto.Config.encode(config).finish();
      const bufferAux = proto.AuxConfigBlock.encode(aux).finish();
      const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
      buffer.set(bufferMain, 0);
      buffer.set(bufferAux, bufferMain.length);
      return { buffer, mainLen: bufferMain.length, auxLen: bufferAux.length };
    },
    buildConfig: () => {
      const state = get();
      const config = { ...state.config };
      config.syncCalibrations = state.syncInputs;
      config.devices = Object.values(state.deviceStatus).map((x) => x.device);
      // If we are using any of the tap frets then we need slider mappings, otherwise we don't
      // If a subtype supports PS3 mappings, then allow setting the option, otherwise force ps4 mode
      config.profiles = state.mappingStatus.map((x, i) => ({
        ...config.profiles![i],
        supportsSlider:
          Object.values(x).find((x) => x.mapping.mapping.ghAxis?.toString().includes('Tap')) !==
          undefined,
        ps4OrPs5Mode:
          !ps4Subtypes.includes(config.profiles![i].opts.deviceToEmulate) ||
          config.profiles![i].opts.ps4OrPs5Mode,
        mappings: Object.values(x).map((x) => x.mapping),
      }));
      config.guiConfig = Object.values(state.guiDevices);
      if (state.toolInfo) {
        config.guiConfig.push({
          deviceid: 0,
          seller: state.toolInfo,
        });
      }
      const states = Object.values(state.deviceStatus)
        .filter((x) => x.type === 'cycle')
        .map((x) =>
          proto.CyclingInputState.create({ id: parseInt(x.id, 10), state: x.cycleState })
        );
      const toggleStates = Object.values(state.deviceStatus)
        .filter((x) => x.type === 'toggle')
        .map((x) =>
          proto.ToggleInputState.create({ id: parseInt(x.id, 10), state: x.toggleState })
        );
      const aux = { states, toggleStates };
      const bufferMain = proto.Config.encode(config).finish();
      const bufferAux = proto.AuxConfigBlock.encode(aux).finish();
      const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
      buffer.set(bufferMain, 0);
      buffer.set(bufferAux, bufferMain.length);
      return { config, aux };
    },
    firmwareUpdate: async () => {
      const state = get();
      set((old) => ({ ...old, updatePercentage: 1, updating: true }));
      const updateFile = await (await fetch(`santroller_ota_${state.type}.bin`)).bytes();
      const firmwareInfo = proto.FirmwareUpdate.create({
        chunkOffset: 0,
        chunkSize: 32,
        firmwareSize: updateFile.length,
        offset: 0,
      });
      const buffer = new ArrayBuffer(63);
      for (let i = 0; i < updateFile.length; i += 256) {
        firmwareInfo.chunkOffset = 0;
        firmwareInfo.offset = i;
        const firmwareInfoBuffer = proto.FirmwareUpdate.encodeDelimited(firmwareInfo)
          .ldelim()
          .finish();
        new Uint8Array(buffer).set(firmwareInfoBuffer);
        await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdUpdateFirmware, buffer);
        for (let j = 0; j < 256 && i + j < updateFile.length; j += 32) {
          const buffer2 = new ArrayBuffer(33);
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
          latest = deviceVersion === latestVersion;
        } catch (e) {
          console.log(e);
        }
        const info = proto.ConfigInfo.decode(
          new Uint8Array(infoData.buffer).slice(1),
          infoData.byteLength - 1
        );
        if (info.magic >>> 0 !== magic) {
          console.log('magic didnt match!');
        }
        const data = new Uint8Array(info.dataSize);
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
        if (new CRC32().calculate(data) !== info.dataCrc) {
          console.log('CRC didnt match!');
        }
        let deviceType = 'pico_w';
        try {
          const deviceTypeData = await device.receiveFeatureReport(proto.ReportId.ReportIdGetType);
          deviceType = String.fromCharCode
            .apply(null, Array.from(new Uint8Array(deviceTypeData.buffer.slice(1))))
            .trim()
            .replaceAll('\0', '');
        } catch (e) {
          console.log(e);
        }
        try {
          const config = proto.Config.decode(data, info.mainSize);
          const aux = proto.AuxConfigBlock.decode(data.slice(info.mainSize), info.auxSize);
          const timeout = setInterval(() => get().sendKeepAlive(), 10);
          set(
            (old) => ({
              ...old,
              ...InitState(config, aux),
              seller: old.seller,
              connected: true,
              updating: false,
              hidDevice: device,
              crc: info.dataCrc,
              type: deviceType,
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
const disconnect = (e: any) => {
  if (useConfigStore.getState().hidDevice === e.device) {
    useConfigStore.getState().disconnect();
  }
};
const connect = (e: any) => {
  if (!useConfigStore.getState().waitingForReload) {
    return;
  }
  if (e.device.collections[0].usagePage !== 0xff00) {
    return;
  }
  if (!useConfigStore.getState().hidDevice) {
    useConfigStore.getState().reconnect(e.device);
  }
};
if (navigator.hid) {
  navigator.hid.addEventListener('disconnect', disconnect);
  navigator.hid.addEventListener('connect', connect);
}

// make sure we disconnect from the device when using HMR in development
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    useConfigStore.setState((old) => ({ ...old, waitingForReload: false }));
    useConfigStore.getState().disconnect();
    navigator.hid.removeEventListener('disconnect', disconnect);
    navigator.hid.removeEventListener('connect', connect);
  });
}
useConfigStore.getState().checkLogin();
function* range(start: number, stop: number, step: number = 1) {
  let calcStop = stop;
  let calcStart = start;
  if (calcStop === null) {
    // one param defined
    calcStop = start;
    calcStart = 0;
  }

  for (let i = calcStart; step > 0 ? i < calcStop : i > calcStop; i += step) {
    yield i;
  }
}

export async function buildUf2FromConfig(
  pico2: boolean,
  { buffer, mainLen, auxLen }: { buffer: Uint8Array; mainLen: number; auxLen: number }
) {
  const uf2File = new Uint8Array(
    await (await fetch(pico2 ? '/santroller_pico2.uf2' : '/santroller_pico1.uf2')).arrayBuffer()
  );
  const crc = new CRC32().calculate(buffer);

  const infoBuffer = new Uint8Array(24);
  const dataView = new DataView(infoBuffer.buffer);
  dataView.setUint32(0, buffer.length, true);
  dataView.setUint32(4, crc, true);
  dataView.setUint32(8, mainLen, true);
  dataView.setUint32(12, auxLen, true);
  dataView.setUint32(16, magic, true);
  dataView.setUint32(20, 0, true);
  const sectorSize = 4 * 1024;
  const blockSize = 256;
  const uf2BlockSize = 512;
  const flashSize = 2 * 1024 * 1024;
  const rawSize = buffer.length + infoBuffer.length;
  const outBuffer = new Uint8Array(Math.ceil(rawSize / blockSize) * blockSize);
  const padding = outBuffer.length - rawSize;
  outBuffer.set(buffer, padding);
  outBuffer.set(infoBuffer, padding + buffer.length);
  const baseAddr = 0x10000000;
  const eepromAddr = baseAddr + flashSize - outBuffer.length;
  const blockCount = Math.ceil(outBuffer.length / blockSize);
  const firstBlock = decodeBlock(uf2File.slice(0, uf2BlockSize));
  let blocks: UF2BlockData[] = [];
  for (let i = 0; i < firstBlock.totalBlocks; i++) {
    blocks.push(decodeBlock(uf2File.slice(i * 512, (i + 1) * 512)));
  }
  for (let i = 0; i < blockCount; i++) {
    blocks.push({
      flags: firstBlock.flags,
      flashAddress: eepromAddr + i * blockSize,
      payload: outBuffer.slice(i * blockSize, (i + 1) * blockSize),
      blockNumber: 0,
      totalBlocks: 0,
      boardFamily: firstBlock.boardFamily,
    });
  }
  const blockMap = new Set<number>(blocks.map((x) => x.flashAddress));
  const sectorMap = new Set([...blockMap].map((b) => Math.floor(b / sectorSize) * sectorSize));
  const blocksToFill = new Set<number>(
    Array.from([...sectorMap].flatMap((x) => Array.from(range(x, x + sectorSize, blockSize))))
  ).difference(blockMap);
  blocks.push(
    ...Array.from(blocksToFill).map((x) => ({
      flags: firstBlock.flags,
      flashAddress: x,
      payload: new Uint8Array(256),
      blockNumber: 0,
      totalBlocks: 0,
      boardFamily: firstBlock.boardFamily,
    }))
  );
  blocks.sort((x, y) => x.flashAddress - y.flashAddress);
  blocks = blocks.map((x, i) => ({ ...x, blockNumber: i, totalBlocks: blocks.length }));
  const outUf2 = new Uint8Array(blocks.length * uf2BlockSize);
  let i = 0;
  for (const block of blocks) {
    encodeBlock(block, outUf2, i * 512);
    i++;
  }
  const blob = new Blob([outUf2.buffer], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'santroller.uf2';
  link.href = blobUrl;
  link.click();
}
export async function buildUf2FromJson(file: File | null, pico2: boolean) {
  try {
    const data = JSON.parse((await file?.text()) ?? '');
    const config = proto.Config.fromObject(data.config);
    const aux = proto.AuxConfigBlock.fromObject(data.aux);
    const bufferMain = proto.Config.encode(config).finish();
    const bufferAux = proto.AuxConfigBlock.encode(aux).finish();
    const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
    buffer.set(bufferMain, 0);
    buffer.set(bufferAux, bufferMain.length);
    buildUf2FromConfig(pico2, { buffer, mainLen: bufferMain.length, auxLen: bufferAux.length });
  } catch (e) {
    console.log(e);
  }
}
