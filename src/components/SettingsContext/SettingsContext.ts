/// <reference types="w3c-web-hid" />
import i18next from 'i18next';
import { immerable } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {} from '@redux-devtools/extension';

import { Reader } from 'protobufjs/minimal';
import { decodeBlock, encodeBlock, UF2BlockData } from 'uf2';
import { getAssignmentHostType, getDefaultMappings } from '@/components/Defaults/defaultMappings';
import {
  getPresetKeyLabels,
  getPresetMappings,
  MAPPING_PRESETS,
} from '@/components/Defaults/mappingPresets';
import {
  createDeviceConfig,
  getDevicePins,
  getDeviceStatusLabel,
  isDeviceKind,
  isSingletonDeviceKind,
} from '@/components/Devices/deviceRegistry';
import {
  detectedInput,
  detectInputCommand,
  DetectInputRequest,
} from '@/components/Inputs/inputDetection';
import {
  getProfileSlotKey,
  getProfileSlots,
  inputUsesDevice,
  moveWiiDrumNotesToMidiSlot,
  ProfileSlot,
  withSlotMidiChannel,
} from '@/components/Inputs/inputRegistry';
import { remapEditedSlotIds } from '@/components/Inputs/slotRemap';
import {
  createLabelConfig,
  getLabelKind,
  getNextLabelId,
  labelInProfile,
} from '@/components/Labels/labelRegistry';
import { importLegacyConfigs } from '@/components/Legacy/importLegacyConfig';
import { legacyErrorReason, legacyWarning, LegacyWarning } from '@/components/Legacy/warnings';
import { CRC32 } from '@/CRC32.js';
import { splitExtraTargets } from './assignmentTargets';
import { BluetoothConfigDevice } from './BluetoothConfigDevice';
import { proto } from './config.js';
import { hasSlowBootStageBuild, parseVersionReport } from './firmwareVersion';
import { KeepaliveTimer, startKeepaliveTimer, stopKeepaliveTimer } from './keepaliveTimer';
import { truncateProfileName } from './profileName';
import { savedDeviceName, savedManufacturerName, savedSellerConfig } from './savedConfigFields';
import { resizeSellerFavicon, resizeSellerLogo } from './sellerLogo';
import { remapMappingsForSubType } from './subTypeMappings';
import { centerTilt } from './tiltCenter';

// sourceId is unique per interface (including virtual wireless controller slots), older
// firmware doesn't send it so fall back to port / interface

export function usbDeviceKey(event: proto.IUsbDeviceHotplugEvent): number {
  return event.sourceId ?? event.port! * 256 + event.interface!;
}

// Older firmware encodes SubType signed from a byte, so Unknown (255) arrives as -1
export function normalizeSubType(subtype: number): proto.SubType;
export function normalizeSubType(
  subtype: number | null | undefined
): proto.SubType | null | undefined;
export function normalizeSubType(subtype: number | null | undefined) {
  return subtype == null ? subtype : ((subtype & 0xff) as proto.SubType);
}

export * from './config.js';
const HID_RESPONSE_TIMEOUT_MS = 3_000;
const KEEPALIVE_INTERVAL_MS = 10;
// The debug page only shows recent output, and the tool can be left open for hours
const MAX_CONSOLE_CHARS = 100_000;
const MAX_MIDI_DEBUG_EVENTS = 1_000;
const FIRMWARE_BLOCK_SIZE = 4096;
const FIRMWARE_UPLOAD_CHUNK_SIZE = 63;
const LEGACY_FIRMWARE_BLOCK_SIZE = 256;
const LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE = 32;
// The upload fills the progress bar up to here, the rest covers the bootloader applying the update
const FIRMWARE_UPLOAD_PROGRESS_END = 50;
// How many times a streamed block is sent before giving up
const FIRMWARE_STREAMED_BLOCK_ATTEMPTS = 3;
// Roughly what the bootloader spends swapping one 4KB sector (2 erases + 2 programs)
const FIRMWARE_APPLY_MS_PER_SECTOR = 110;
const FIRMWARE_REBOOT_MS = 2_000;
const FIRMWARE_APPLY_TIMEOUT_MS = 120_000;
const FIRMWARE_APPLY_PROGRESS_INTERVAL_MS = 250;
// A file this tool ships next to the firmware, or undefined if it is missing
async function fetchShipped(file: string) {
  const response = await fetch(file, { cache: 'no-store' });
  return response.ok ? (await response.text()).trim() : undefined;
}

// Whether the firmware is the one this tool ships, or newer than it
async function checkFirmwareVersion(device: HIDDevice) {
  let version: string | undefined;
  let build: number | undefined;
  try {
    ({ version, build } = parseVersionReport(
      await receiveFeatureReport(device, proto.ReportId.ReportIdGetVersion)
    ));
    const [latestVersion, latestBuild] = await Promise.all([
      fetchShipped('commit.hash'),
      fetchShipped('commit.build'),
    ]);
    const shippedBuild = Number(latestBuild) || undefined;
    const latest = version === latestVersion?.substring(0, 8);
    // newer firmware than this tool has, so updating would go backwards
    const newer = !latest && !!build && !!shippedBuild && build > shippedBuild;
    return { version, build, latest, newer };
  } catch (e) {
    console.log(e);
    return { version, build, latest: false, newer: false };
  }
}
let firmwareApplyTimer: ReturnType<typeof setInterval> | undefined;
// How long to wait for the controller to come back after it reloads
const RELOAD_RECONNECT_TIMEOUT_MS = 10000;
// The firmware gives up on a detect after 10 seconds without saying so, so stop waiting then too
const DETECT_TIMEOUT_MS = 10000;
let detectTimer: ReturnType<typeof setTimeout> | undefined;
let reloadReconnectTimer: ReturnType<typeof setTimeout> | undefined;
function stopReloadReconnectTimer() {
  if (reloadReconnectTimer) {
    clearTimeout(reloadReconnectTimer);
    reloadReconnectTimer = undefined;
  }
}
function stopFirmwareApplyProgress() {
  if (firmwareApplyTimer) {
    clearInterval(firmwareApplyTimer);
    firmwareApplyTimer = undefined;
  }
}
type DeviceType = keyof Omit<proto.IDevice, 'deviceid'>;
class HidResponseTimeoutError extends Error {}
// The config came back incomplete or corrupted, so reading it again may work
class ConfigReadError extends Error {}
// Another configurator has the controller open over the other transport (USB or bluetooth)
class ConfigInUseError extends Error {}
const CONFIG_READ_ATTEMPTS = 3;
// How often to check whether the other configurator has closed
const IN_USE_RETRY_MS = 2000;
let inUseRetryTimer: ReturnType<typeof setTimeout> | undefined;
function stopInUseRetryTimer() {
  if (inUseRetryTimer) {
    clearTimeout(inUseRetryTimer);
    inUseRetryTimer = undefined;
  }
}

const equals = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((val, index) => val === b[index]);
function withHidTimeout<T>(operation: Promise<T>, description: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new HidResponseTimeoutError(`Timed out waiting for controller ${description}`)),
      HID_RESPONSE_TIMEOUT_MS
    );
  });

  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

// For logging what a report actually contained
// Whether a stored bluetooth TLV entry is a bond for this address, the same way the firmware's
// BtTlvStorage::delete_tags_for_mac matches them (BTL: classic link keys, BTD: LE device db entries)
function isBondForMac(entry: proto.IBluetoothTlvEntry, mac: Uint8Array): boolean {
  const prefix = ((entry.tag ?? 0) & 0xffffff00) >>> 0;
  const value = entry.value ?? new Uint8Array();
  const tagPrefix = (c: string) => ((0x42 << 24) | (0x54 << 16) | (c.charCodeAt(0) << 8)) >>> 0;
  const matchesAt = (offset: number) =>
    value.length >= offset + 6 && mac.every((byte, i) => value[offset + i] === byte);
  return (prefix === tagPrefix('L') && matchesAt(4)) || (prefix === tagPrefix('D') && matchesAt(8));
}

function hexBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
}

// Bond keys only work with the radio they were made on, so they're left out of anything that can be
// shared or flashed onto another device
function withoutPairings(aux: proto.IAuxConfigBlock): proto.IAuxConfigBlock {
  return { ...aux, bluetoothStates: [], tlvEntries: [] };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function receiveFeatureReport(device: HIDDevice, reportId: number) {
  return withHidTimeout(device.receiveFeatureReport(reportId), 'response');
}

// The profiles the device is running, and a mode an active profile forces that it held off switching
// to, as that would drop the tool's connection
async function readActiveProfiles(
  device: HIDDevice
): Promise<{ activeProfiles: number[]; deferredMode: proto.ConsoleMode | null }> {
  let payload: Uint8Array | undefined;
  try {
    const profileData = await receiveFeatureReport(
      device,
      proto.ReportId.ReportIdGetActiveProfiles
    );
    payload = new Uint8Array(
      profileData.buffer,
      profileData.byteOffset,
      profileData.byteLength
    ).slice(1);
    if (payload.length > 0) {
      const resp = proto.GetActiveProfiles.decodeDelimited(payload);
      return { activeProfiles: resp.profiles || [], deferredMode: resp.deferredMode ?? null };
    }
  } catch (e) {
    console.error(
      `Failed to get active profiles (${payload?.length ?? 0} bytes: ${hexBytes(payload ?? new Uint8Array())})`,
      e
    );
  }
  return { activeProfiles: [], deferredMode: null };
}

// Feature reports can come back zero padded out to their declared size (depending on the platform and
// transport), which plain protobuf decoding misreads. Zero is never a valid protobuf tag, so the message
// ends at the first one.
function withoutPadding(bytes: Uint8Array): Uint8Array {
  const reader = Reader.create(bytes);
  try {
    while (reader.pos < reader.len) {
      const fieldStart = reader.pos;
      const tag = reader.uint32();
      if (tag === 0) {
        return bytes.subarray(0, fieldStart);
      }
      reader.skipType(tag & 7);
    }
  } catch {
    // malformed, leave it for the decoder to report
  }
  return bytes;
}

function collectionHasFeatureReport(collection: HIDCollectionInfo, reportId: number): boolean {
  return (
    !!collection.featureReports?.some((report) => report.reportId === reportId) ||
    !!collection.children?.some((child) => collectionHasFeatureReport(child, reportId))
  );
}

function reportByteLength(report: HIDReportInfo): number | undefined {
  const bitLength = report.items?.reduce(
    (total, item) => total + (item.reportSize ?? 0) * (item.reportCount ?? 0),
    0
  );
  return bitLength ? Math.ceil(bitLength / 8) : undefined;
}

function findOutputReport(
  collection: HIDCollectionInfo,
  reportId: number
): HIDReportInfo | undefined {
  return (
    collection.outputReports?.find((report) => report.reportId === reportId) ??
    collection.children
      ?.map((child) => findOutputReport(child, reportId))
      .find((report): report is HIDReportInfo => !!report)
  );
}

function findFeatureReport(
  collection: HIDCollectionInfo,
  reportId: number
): HIDReportInfo | undefined {
  return (
    collection.featureReports?.find((report) => report.reportId === reportId) ??
    collection.children
      ?.map((child) => findFeatureReport(child, reportId))
      .find((report): report is HIDReportInfo => !!report)
  );
}

function findFastFirmwareUploadReports(device: HIDDevice): {
  outputReport?: HIDReportInfo;
  featureReport?: HIDReportInfo;
} {
  for (const collection of device.collections) {
    if (collectionHasFeatureReport(collection, proto.ReportId.ReportIdUpdateFirmware)) {
      const outputReport = findOutputReport(collection, proto.ReportId.ReportIdUploadFirmware);
      const featureReport = findFeatureReport(collection, proto.ReportId.ReportIdUploadFirmware);
      return { outputReport, featureReport };
    }
  }
  return {};
}

export const ps4Subtypes = [
  proto.SubType.GuitarHeroDrums,
  proto.SubType.RockBandDrums,
  proto.SubType.GuitarHeroGuitar,
  proto.SubType.RockBandGuitar,
];
// Only exist as HID devices, so they always stay in HID mode on Windows
export const hidOnlySubtypes = [proto.SubType.KeyboardMania];
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
    this.state = false;
    this.stateRaw = 0;
  }
  id: number;
  activation: proto.IProfileAssignmentInfo;
  state: boolean;
  stateRaw: number;
}
export class ActivationListStatus {
  [immerable] = true;
  constructor(id: number) {
    this.id = id;
    this.state = false;
  }
  id: number;
  state: boolean;
}
export class DeviceStatus {
  [immerable] = true;
  constructor(id: string, type: DeviceType, device: proto.IDevice, parentId?: string) {
    this.id = id;
    this.type = type;
    this.device = device;
    this.parentId = parentId;
    this.wiiExtType = proto.WiiExtType.WiiNoExtension;
    this.usbDevices = {};
    this.btDevices = {};
    this.ps2CntType = proto.PS2ControllerType.PS2ControllerTypeUnknown;
    this.snesCntType = proto.SNESControllerType.SNESControllerNone;
    this.joybusCntType = proto.JoybusControllerType.JoybusControllerNone;
    this.cycleState = 0;
    this.toggleState = false;
    this.crkdDrumCalibration = {
      [proto.CrkdDrumCalibrationType.RawValue]: {
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
      [proto.CrkdDrumCalibrationType.HoldTick]: {
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
  type: DeviceType;
  cycleState: number;
  toggleState: boolean;
  connected: boolean = false;
  updating?: boolean = false;
  updateProgress?: number = 0;
  rebooting?: boolean = false;
  // Battery devices: the battery percentage, once they have read it
  battery?: number;
  // Bluetooth: whether a host (PC, phone, console, or the configurator over BLE) is connected to this controller
  hostConnected?: boolean;
  device: proto.IDevice;
  parentId?: string;
  wiiExtType: proto.WiiExtType;
  ps2CntType: proto.PS2ControllerType;
  snesCntType: proto.SNESControllerType;
  joybusCntType: proto.JoybusControllerType;
  usbDevices: { [key: number]: proto.IUsbDeviceHotplugEvent };
  btDevices: { [key: number]: proto.IBtDeviceHotplugEvent };
  crkdDrumCalibration: { [key in proto.CrkdDrumCalibrationType]: proto.ICrkdCalibrationData };
  static label(status: DeviceStatus) {
    return getDeviceStatusLabel(status);
  }
  static pins(status: DeviceStatus): number[] {
    return getDevicePins(status.device);
  }
}

// A MIDI out jack only sends, so it's never a MIDI source for a profile slot or an input
export function isMidiOutDevice(device?: proto.IDevice | null): boolean {
  return device?.midiSerial?.direction === proto.MidiSerialDirection.MidiSerialOut;
}

export function requiresAssignment(deviceType: string, device?: proto.IDevice | null): boolean {
  if (isMidiOutDevice(device)) {
    return false;
  }
  return (
    deviceType === 'bt' ||
    deviceType === 'usbHost' ||
    deviceType === 'psx' ||
    deviceType === 'wii' ||
    deviceType === 'snes' ||
    deviceType === 'joybus' ||
    deviceType === 'midiSerial' ||
    deviceType === 'bhDrum' ||
    deviceType === 'worldTourDrum'
  );
}

export function isDeviceAssigned(
  deviceType: string,
  profile?: proto.IProfile | null,
  device?: proto.IDevice | null
): boolean {
  if (!requiresAssignment(deviceType, device)) {
    return true;
  }
  if (!profile || !profile.assignments) {
    return false;
  }
  const allAssignments = profile.assignments.flatMap((x) => x.assignments ?? []);

  if (deviceType === 'bt') {
    return allAssignments.some((x) => x.bluetoothType != null || x.bluetoothDevice != null);
  }
  if (deviceType === 'usbHost') {
    return allAssignments.some(
      (x) =>
        x.usbType != null || x.usbDevice != null || x.midiChannel != null || x.midiProGuitar != null
    );
  }
  if (deviceType === 'psx') {
    return allAssignments.some((x) => x.ps2Cnt != null);
  }
  if (deviceType === 'wii') {
    return allAssignments.some((x) => x.wiiExt != null);
  }
  if (deviceType === 'snes') {
    return allAssignments.some((x) => x.snesCnt != null);
  }
  if (deviceType === 'joybus') {
    return allAssignments.some((x) => x.joybusCnt != null);
  }
  if (deviceType === 'midiSerial' || deviceType === 'bhDrum' || deviceType === 'worldTourDrum') {
    return allAssignments.some((x) => x.midiChannel != null || x.midiProGuitar != null);
  }
  return true;
}

export interface ConfigState {
  deviceStatus: { [id: string]: DeviceStatus };
  mappingStatus: { [id: number]: MappingStatus }[];
  ledStatus: { [id: number]: LedStatus }[];
  activationStatus: { [id: number]: ActivationStatus[] }[];
  activationListStatus: { [id: number]: ActivationListStatus }[];
  guiDevices: { [id: number]: proto.IGuiConfig };
  config: proto.IConfig;
  savedConfig: Uint8Array;
  connected: boolean;
  hung: boolean;
  // Connected, but the config couldn't be read. Nothing is sent to the controller then, as the config
  // here isn't the controller's and saving it would replace the controller's
  configLoadError: 'inUse' | 'failed' | null;
  configLoadErrorMessage?: string;
  latest: boolean;
  // The firmware is newer than the one this tool ships
  firmwareNewer: boolean;
  firmwareVersion?: string;
  firmwareBuild?: number;
  hidDevice?: HIDDevice;
  crc: number;
  // A save was skipped or cut off by the device dropping off USB, so reconnect has to send it
  pendingSave: boolean;
  waitingForReload: boolean;
  // The controller reloaded but never came back with its config interface, e.g. a profile
  // switched it into a mode like PS3 that doesn't have one
  reloadLost: boolean;
  writing: boolean;
  polling: boolean;
  refreshingBluetooth: boolean;
  updating: boolean;
  applyingUpdate: boolean;
  // Why the last firmware update didn't take, if it didn't
  updateError?: 'notApplied' | 'noReconnect';
  detected: number;
  type: string;
  updatePercentage: number;
  detectedMapping?: number;
  detectedActivation?: number;
  detectedInnerMapping?: number;
  detectedLed?: number;
  // The input found by detectInput, for the input editor to take, and what it asked for
  detectedInput?: proto.IInput;
  detectInputRequest?: DetectInputRequest;
  detecting: boolean;
  lastUpdate: number;
  writeTimeout?: NodeJS.Timeout;
  keepaliveTimeout?: KeepaliveTimer;
  currentProfile: number;
  currentProfileInstance: number;
  lastProfile: number;
  activeProfiles: number[];
  // A mode an active profile forces, held off until the tool disconnects
  deferredMode: proto.ConsoleMode | null;
  midiData: number[][];
  console: string;
  sendingKeepAlive: boolean;
  toolInfo?: proto.ISellerConfig;
  simpleMode: boolean;
  syncInputs: boolean;
  seller: boolean;
  sellerCheck: boolean;
  configModified: boolean;
  bluetoothStates: proto.IBluetoothPairingState[];
  tlvEntries: proto.IBluetoothTlvEntry[];
  // Guitar Hero Arcade cabinet side the device saved for itself, written back untouched
  ghArcadeSide: number | null;
  missingStaticFirmware: boolean;
  // The bootloader's flash layout is older than the firmware's, so updates have to go through a UF2
  bootloaderOutdated: boolean;
  // The bootloader reads flash slowly. OTA updates still work, but only a UF2 replaces the bootloader
  slowBootStage: boolean;
  needsUf2Update: boolean;
  // The controller takes firmware uploads streamed as output reports (see firmwareUpdate)
  streamedFirmwareUpload: boolean;
  // What couldn't be carried over when a Santroller 1 config was imported
  // (translation keys and params, translated when shown)
  legacyImportWarnings: LegacyWarning[];
  scanningBluetooth: boolean;
}
export interface Actions {
  scanBluetooth: () => Promise<void>;
  refreshBluetoothPairings: () => Promise<void>;
  removeBluetoothPairing: (id: number) => Promise<void>;
  forgetBluetoothHosts: () => Promise<void>;
  checkLogin: () => void;
  setSyncMode: (mode: boolean) => void;
  updateLabel: (config: proto.IGuiConfig, id: number) => void;
  deleteLabel: (id: number) => void;
  deleteLabels: (ids: number[]) => void;
  setLabelProfiles: (ids: number[], profiles: number[]) => void;
  setLabelShowToCustomer: (ids: number[], show: boolean) => void;
  copyLabel: (config: proto.IGuiConfig) => void;
  addLabel: () => void;
  addLedLabel: () => void;
  addMultiplexerLabel: () => void;
  addMatrixLabel: () => void;
  addSwitchNetworkLabel: () => void;
  addKeyboardKeyLabel: () => void;
  addPresetKeyLabels: (labels: { key: number; names: string[] }[], profileUid: number) => void;
  updateDevice: (device: proto.IDevice, id: string) => void;
  updateProfile: (profile: proto.IProfile, id: number) => void;
  updateProfiles: (profiles: proto.IProfile[]) => void;
  updateCycle: (id: number, state: number) => void;
  updateToggle: (id: number, state: boolean) => void;
  addProfile: () => void;
  // The profile whose LEDs run while no other profile is active. There's only ever one
  addStandbyProfile: () => void;
  cloneProfile: (id: number) => void;
  deleteProfile: (id: number) => void;
  moveProfile: (from: number, to: number) => void;
  updateConfig: (config: proto.IConfig) => void;
  deleteDevice: (id: string) => void;
  connect: () => void;
  connectBluetooth: () => void;
  connectDevice: (device: HIDDevice) => Promise<void>;
  firmwareUpdate: () => void;
  peripheralFirmwareUpdate: (deviceId: number, file: File) => Promise<void>;
  login: () => void;
  disconnect: () => void;
  reconnect: (device: HIDDevice) => void;
  bootloader: () => void;
  addDevice: (type: string, parentId?: string, fill?: (device: proto.IDevice) => void) => string;
  onReport: (evt: HIDInputReportEvent) => void;
  setActiveProfile: (id: string | null, instance?: number) => void;
  sendKeepAlive: () => void;
  refreshActiveProfiles: () => Promise<void>;
  commitConfig: () => Promise<void>;
  discardChanges: () => Promise<void>;
  // Resolves to the uploaded main config once the device has it, false if it didn't get sent. Settings that
  // only apply on save (eg the device name) are only sent when committing.
  saveConfig: (immediate?: boolean, committing?: boolean) => Promise<Uint8Array | false>;
  buildConfigBuffer: (
    shareable?: boolean,
    committing?: boolean
  ) => {
    buffer: Uint8Array;
    mainLen: number;
    auxLen: number;
  };
  buildConfig: () => { config: proto.IConfig; aux: proto.IAuxConfigBlock };
  exportConfig: () => void;
  loadConfig: (file: File | null) => void;
  // Each file becomes a profile of its own
  importLegacyConfig: (files: File[]) => void;
  // Swaps in a whole new config, sent live but not saved to flash until committed
  replaceConfig: (
    config: proto.Config,
    aux: proto.AuxConfigBlock,
    extra?: Partial<ConfigState>
  ) => Promise<void>;
  // Back to how the firmware comes out of the box: no devices or profiles
  factoryReset: () => void;
  clearLegacyImportWarnings: () => void;
  pollInputs: (poll: boolean) => void;
  loadDefaults: (device: DeviceStatus | ProfileSlot | undefined, presetId?: string) => void;
  clearConsole: () => void;
  clearMidi: () => void;
  buildUf2: (pico2: boolean) => void;
  setSellerToolName: (name: string) => void;
  setSellerToolLogo: (image: File) => Promise<void>;
  setSellerToolFavicon: (image: File) => Promise<void>;
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
  // Detect which input of a device (a wii extension, usb host controller etc) gets pressed or moved
  detectInput: (
    activation: number | undefined,
    mapping: number | undefined,
    led: number | undefined,
    innerMapping: number | undefined,
    request: DetectInputRequest
  ) => void;
  testLed: (profileId: number, ledId?: number, durationMs?: number) => Promise<void>;
}

// Standby lighting is only used once no other profile matched, so it's kept below them all, and other
// profiles go in above it
export function profileInsertIndex(profiles: proto.IProfile[] | null | undefined): number {
  const standbyIdx = profiles?.findIndex((x) => x.opts?.standbyLighting) ?? -1;
  return standbyIdx === -1 ? (profiles?.length ?? 0) : standbyIdx;
}

function InitState(config: proto.Config, aux: proto.AuxConfigBlock): ConfigState {
  const splitTargets = splitExtraTargets(config);
  // The firmware doesn't care where it is, so this isn't a change that needs saving
  config.profiles = [
    ...(config.profiles ?? []).filter((x) => !x.opts?.standbyLighting),
    ...(config.profiles ?? []).filter((x) => x.opts?.standbyLighting),
  ];
  const centeredTilt = centerTilt(config);
  config.profiles?.forEach((profile) => {
    profile.assignments?.forEach((list) => {
      list.assignments?.forEach((assignment) => {
        if (assignment.consoleType) {
          if (
            assignment.consoleType.xinputOnWindows === undefined ||
            assignment.consoleType.xinputOnWindows === null
          ) {
            assignment.consoleType.xinputOnWindows = profile.opts?.xinputOnWindows ?? true;
          }
          if (
            assignment.consoleType.ps4OrPs5Mode === undefined ||
            assignment.consoleType.ps4OrPs5Mode === null
          ) {
            assignment.consoleType.ps4OrPs5Mode = profile.opts?.ps4OrPs5Mode ?? false;
          }
        }
      });
    });
  });
  const deviceStatus: Record<string, DeviceStatus> = {};
  for (const x of config.devices || []) {
    const parentIdStr = x.deviceid.toString();
    const typeName = Object.keys(x).find((k) => k !== 'deviceid') as DeviceType | undefined;
    // A device whose type this tool doesn't know (e.g. saved by an older build) can't be shown or
    // edited, and the firmware can't build it either, so drop it rather than saving it back
    if (!typeName || !isDeviceKind(typeName)) {
      console.warn('Dropping device with unknown type', x);
      continue;
    }
    deviceStatus[parentIdStr] = new DeviceStatus(parentIdStr, typeName, x);

    if (x.peripheral?.devices?.length) {
      for (const sub of x.peripheral.devices) {
        const subIdStr = sub.deviceid.toString();
        const subTypeName = Object.keys(sub).find((k) => k !== 'deviceid') as
          DeviceType | undefined;
        if (!subTypeName || !isDeviceKind(subTypeName)) {
          console.warn('Dropping peripheral device with unknown type', sub);
          continue;
        }
        deviceStatus[subIdStr] = new DeviceStatus(subIdStr, subTypeName, sub, parentIdStr);
      }
    }
  }
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
  const activationListStatus = config.profiles!.map((profile) =>
    Object.fromEntries(
      profile.assignments!.map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
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
          x.config === 'multiplexerLabel' ||
          x.config === 'switchNetworkLabel' ||
          x.config === 'keyboardKeyLabel'
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
    activationListStatus,
    ledStatus,
    config,
    savedConfig: proto.Config.encode(config).finish(),
    updatePercentage: 0,
    // so the repaired config can be saved
    configModified: splitTargets || centeredTilt,
    waitingForReload: false,
    reloadLost: false,
    updating: false,
    applyingUpdate: false,
    connected: false,
    hung: false,
    configLoadError: null,
    detecting: false,
    seller: false,
    sellerCheck: false,
    latest: true,
    firmwareNewer: false,
    detected: -1,
    crc: 0,
    pendingSave: false,
    lastUpdate: 0,
    writing: false,
    polling: false,
    currentProfile: 0,
    currentProfileInstance: 0,
    lastProfile: 0,
    activeProfiles: [],
    deferredMode: null,
    midiData: [],
    guiDevices,
    console: '',
    type: '',
    sendingKeepAlive: false,
    refreshingBluetooth: false,
    toolInfo,
    simpleMode: !!toolInfo && !localStorage.getItem('auth'),
    syncInputs: config.syncCalibrations || false,
    bluetoothStates: aux.bluetoothStates ?? [],
    tlvEntries: aux.tlvEntries ?? [],
    ghArcadeSide: aux.ghArcadeSide ?? null,
    missingStaticFirmware: false,
    bootloaderOutdated: false,
    slowBootStage: false,
    needsUf2Update: false,
    streamedFirmwareUpload: false,
    legacyImportWarnings: [],
    scanningBluetooth: false,
  };
}

export const initialConfig = InitState(
  proto.Config.create({
    devices: [],
    profiles: [],
    xboxOneLegacyAdapter: true,
  }),
  proto.AuxConfigBlock.create({
    states: [],
    bluetoothStates: [],
    tlvEntries: [],
  })
);

// Name the keys a preset sends after what they play, in the profile the preset was loaded into,
// leaving keys that already have a label there alone
function addPresetKeyLabels(
  guiDevices: { [id: number]: proto.IGuiConfig },
  labels: { key: number; names: string[] }[],
  profileUid: number
) {
  for (const { key, names } of labels) {
    if (
      Object.values(guiDevices).some(
        (x) => x.keyboardKeyLabel?.key === key && labelInProfile(x, profileUid)
      )
    ) {
      continue;
    }
    const id = getNextLabelId(guiDevices);
    guiDevices[id] = {
      deviceid: id,
      profiles: [profileUid],
      keyboardKeyLabel: {
        label: names.map((name) => i18next.t(name)).join(' / '),
        key,
        showToCustomer: true,
      },
    };
  }
}

function createDefault(type: string, id: string, parentId?: string) {
  if (!isDeviceKind(type)) {
    throw new Error(`Unknown device type: ${type}`);
  }
  return new DeviceStatus(
    id,
    type as DeviceType,
    createDeviceConfig(type, parseInt(id, 10)),
    parentId
  );
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
  // SNES pads share the Nintendo layout
  let snesButton = mapping.input.snesButton?.button;
  switch (snesButton) {
    case proto.SNESButtonType.SNESButtonA:
      snesButton = proto.SNESButtonType.SNESButtonB;
      break;
    case proto.SNESButtonType.SNESButtonB:
      snesButton = proto.SNESButtonType.SNESButtonA;
      break;
    case proto.SNESButtonType.SNESButtonX:
      snesButton = proto.SNESButtonType.SNESButtonY;
      break;
    case proto.SNESButtonType.SNESButtonY:
      snesButton = proto.SNESButtonType.SNESButtonX;
      break;
  }
  if (snesButton) {
    mapping.input.snesButton!.button = snesButton;
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

// Starts a pin or input detect, for the input at those indices to take the result of
async function startDetect(
  get: () => ConfigState & Actions,
  set: (fn: (state: ConfigState & Actions) => void) => void,
  activation: number | undefined,
  mapping: number | undefined,
  led: number | undefined,
  innerMapping: number | undefined,
  request: DetectInputRequest | undefined,
  command: proto.ICommand
) {
  const dev = get().hidDevice;
  if (!dev) {
    return;
  }
  set((state) => {
    state.detected = -1;
    state.detectedInput = undefined;
    state.detectInputRequest = request;
    state.detecting = true;
    state.detectedLed = led;
    state.detectedMapping = mapping;
    state.detectedActivation = activation;
    state.detectedInnerMapping = innerMapping;
  });
  clearTimeout(detectTimer);
  detectTimer = setTimeout(() => {
    set((state) => {
      state.detecting = false;
    });
  }, DETECT_TIMEOUT_MS);
  const infoBuffer = proto.Command.encode(proto.Command.create(command)).ldelim().finish();
  const outBuffer = new ArrayBuffer(63);
  new Uint8Array(outBuffer).set(infoBuffer);
  await dev.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer);
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
    commitConfig: async () => {
      const state = get();
      if (state.writeTimeout) {
        clearTimeout(state.writeTimeout);
        state.writeTimeout = undefined;
      }
      // A save still sending its chunks has to finish first, or this one would be skipped and the
      // device told to keep whatever it had
      const waitUntil = Date.now() + 5000;
      while (get().writing && Date.now() < waitUntil) {
        await delay(50);
      }
      const device = get().hidDevice;
      if (!device) {
        throw new Error('Cannot save configuration without a connected device');
      }
      const savedConfig = await get().saveConfig(true, true);
      if (savedConfig === false) {
        throw new Error('Config did not reach the device, not saving it');
      }
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          save: proto.SaveCommand.create({}),
        })
      )
        .ldelim()
        .finish();
      const outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await device.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
      set((state) => {
        state.savedConfig = savedConfig;
      });
      get().buildConfig();
    },
    discardChanges: async () => {
      const state = get();
      if (!state.hidDevice || !state.connected) {
        return;
      }
      if (state.writeTimeout) {
        clearTimeout(state.writeTimeout);
        state.writeTimeout = undefined;
      }
      // A save still sending its chunks would land after the revert and bring the edits back
      const waitUntil = Date.now() + 5000;
      while (get().writing && Date.now() < waitUntil) {
        await delay(50);
      }
      const { data, info } = await fetchConfigDataWithRetry(state.hidDevice, true);
      const config = proto.Config.decode(data, info.mainSize);
      const aux = proto.AuxConfigBlock.decode(data.slice(info.mainSize), info.auxSize);
      const fresh = InitState(config, aux);
      set(
        (old) => ({
          ...old,
          // Only what comes from the config, the connection and firmware state stay as they are
          deviceStatus: fresh.deviceStatus,
          mappingStatus: fresh.mappingStatus,
          activationStatus: fresh.activationStatus,
          activationListStatus: fresh.activationListStatus,
          ledStatus: fresh.ledStatus,
          guiDevices: fresh.guiDevices,
          toolInfo: fresh.toolInfo,
          syncInputs: fresh.syncInputs,
          ghArcadeSide: fresh.ghArcadeSide,
          config,
          savedConfig: data.slice(0, info.mainSize),
          // A profile added since the last save is gone now
          currentProfile:
            old.currentProfile < (config.profiles?.length ?? 0) ? old.currentProfile : 0,
          currentProfileInstance:
            old.currentProfile < (config.profiles?.length ?? 0) ? old.currentProfileInstance : 0,
        }),
        true
      );
      // The live config on the device still has the edits, so send it the saved one
      await get().saveConfig(true);
      await get().setActiveProfile(get().currentProfile.toString(), get().currentProfileInstance);
      set((state) => {
        state.configModified = false;
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
      const logo = await resizeSellerLogo(image);
      set((state) => {
        if (!state.toolInfo) {
          state.toolInfo = {
            name: i18next.t('commercial.defaultToolName'),
            logo: new Uint8Array(),
          };
        }
        state.toolInfo = { ...state.toolInfo, logo };
      });
      get().saveConfig();
    },
    setSellerToolFavicon: async (image: File) => {
      const favicon = await resizeSellerFavicon(image);
      set((state) => {
        state.toolInfo = {
          name: i18next.t('commercial.defaultToolName'),
          logo: new Uint8Array(),
          ...state.toolInfo,
          favicon,
        };
      });
      get().saveConfig();
    },
    updateLabel: (label: proto.IGuiConfig, id: number) => {
      set((state) => {
        // Merged, so editors that only send their own label's fields keep the profiles it's in
        state.guiDevices[id] = { ...state.guiDevices[id], ...label };
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

    deleteLabels: (ids: number[]) => {
      set((state) => {
        for (const id of ids) {
          delete state.guiDevices[id];
        }
      });
      get().saveConfig();
    },
    setLabelProfiles: (ids: number[], profiles: number[]) => {
      set((state) => {
        for (const id of ids) {
          if (state.guiDevices[id]) {
            state.guiDevices[id] = { ...state.guiDevices[id], profiles };
          }
        }
      });
      get().saveConfig();
    },

    setLabelShowToCustomer: (ids: number[], show: boolean) => {
      set((state) => {
        for (const id of ids) {
          const label = state.guiDevices[id];
          const kind = label && getLabelKind(label);
          if (kind) {
            state.guiDevices[id] = { ...label, [kind]: { ...label[kind], showToCustomer: show } };
          }
        }
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
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('label', id);
      });
      get().saveConfig();
    },
    addLedLabel: () => {
      set((state) => {
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('ledLabel', id);
      });
      get().saveConfig();
    },
    addMultiplexerLabel: () => {
      set((state) => {
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('multiplexerLabel', id);
      });
      get().saveConfig();
    },
    addMatrixLabel: () => {
      set((state) => {
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('matrixLabel', id);
      });
      get().saveConfig();
    },
    addSwitchNetworkLabel: () => {
      set((state) => {
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('switchNetworkLabel', id);
      });
      get().saveConfig();
    },
    addKeyboardKeyLabel: () => {
      set((state) => {
        const id = getNextLabelId(state.guiDevices);
        state.guiDevices[id] = createLabelConfig('keyboardKeyLabel', id);
      });
      get().saveConfig();
    },
    addPresetKeyLabels: (labels, profileUid) => {
      set((state) => {
        addPresetKeyLabels(state.guiDevices, labels, profileUid);
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
    setActiveProfile: async (id: string | null, instance: number = 0) => {
      if (id === 'add') {
        return;
      }
      const newProfile = parseInt(id ?? '0', 10);
      set((state) => {
        state.lastProfile = state.currentProfile;
        state.currentProfile = newProfile;
        state.currentProfileInstance = instance;
        if (state.mappingStatus[newProfile]) {
          for (const m of Object.values(state.mappingStatus[newProfile])) {
            m.state = 0;
            m.stateRaw = 0;
          }
        }
        if (state.ledStatus[newProfile]) {
          for (const l of Object.values(state.ledStatus[newProfile])) {
            l.state = 0;
            l.stateRaw = 0;
          }
        }
        if (state.activationStatus[newProfile]) {
          for (const group of Object.values(state.activationStatus[newProfile])) {
            for (const a of group) {
              a.state = false;
              a.stateRaw = 0;
            }
          }
        }
        if (state.activationListStatus[newProfile]) {
          for (const al of Object.values(state.activationListStatus[newProfile])) {
            al.state = false;
          }
        }
      });
      const state = get();
      // With no profiles left (eg after a factory reset) there's nothing for the device to poll
      const profile = state.config.profiles?.[newProfile];
      if (!profile) {
        return;
      }
      const infoBuffer2 = proto.Command.encode(
        proto.Command.create({
          setProfile: proto.SetProfileCommand.create({
            profileId: profile.opts.uid,
            instanceId: instance,
          }),
        })
      )
        .ldelim()
        .finish();
      const outBuffer2 = new ArrayBuffer(63);
      new Uint8Array(outBuffer2).set(infoBuffer2);
      await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer2);
    },
    updateProfile: (edited: proto.IProfile, id: number) => {
      set((state) => {
        // Slot ids can change with the assignments, so keep the inputs on the same slots
        const profile = remapEditedSlotIds(state.config.profiles![id], edited);
        if (
          state.config.profiles![id].opts.faceButtonMappingMode !==
          profile.opts.faceButtonMappingMode
        ) {
          profile.mappings = profile.mappings?.map(fixInput);
        }
        profile.mappings = remapMappingsForSubType(
          state.config.profiles![id].opts.deviceToEmulate,
          profile
        );
        state.config = {
          ...state.config,
          profiles: [
            ...state.config.profiles!.map((prevProfile, prevIndex) =>
              prevIndex === id ? profile : prevProfile
            ),
          ],
        };
        state.detected = -1;
        state.detectedInput = undefined;
        state.mappingStatus[id] = Object.fromEntries(
          profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
        );
        state.activationStatus[id] = Object.fromEntries(
          profile.assignments!.map((x, listIdx) => [
            listIdx,
            x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
          ])
        );
        state.activationListStatus[id] = Object.fromEntries(
          profile.assignments!.map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
        );
        state.ledStatus[id] = Object.fromEntries(
          profile.leds!.map((x, i) => [i, new LedStatus(i, x)])
        );
      });
      get().saveConfig();
    },
    updateProfiles: (profiles: proto.IProfile[]) => {
      set((state) => {
        profiles.forEach((edited, id) => {
          const profile = state.config.profiles![id]
            ? remapEditedSlotIds(state.config.profiles![id], edited)
            : edited;
          if (
            state.config.profiles![id].opts.faceButtonMappingMode !==
            profile.opts.faceButtonMappingMode
          ) {
            profile.mappings = profile.mappings?.map(fixInput);
          }
          profile.mappings = remapMappingsForSubType(
            state.config.profiles![id]?.opts.deviceToEmulate,
            profile
          );
          state.config = {
            ...state.config,
            profiles: [
              ...state.config.profiles!.map((prevProfile, prevIndex) =>
                prevIndex === id ? profile : prevProfile
              ),
            ],
          };
          state.detected = -1;
          state.detectedInput = undefined;
          state.mappingStatus[id] = Object.fromEntries(
            profile.mappings!.map((x, i) => [i, new MappingStatus(i, x)])
          );
          state.activationStatus[id] = Object.fromEntries(
            profile.assignments!.map((x, listIdx) => [
              listIdx,
              x.assignments!.map((x, i) => new ActivationStatus(i, x!)),
            ])
          );
          state.activationListStatus[id] = Object.fromEntries(
            profile.assignments!.map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
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
        if (!state.config.profiles?.[id]) {
          return;
        }
        if (state.currentProfile === id) {
          state.currentProfile = Math.max(id - 1, 0);
        }
        // uids get reused, so the profile's labels can't be left for whatever gets its uid next.
        // Labels only in this profile go with it.
        const uid = state.config.profiles[id].opts.uid;
        for (const [labelId, label] of Object.entries(state.guiDevices)) {
          if (!label.profiles?.includes(uid)) {
            continue;
          }
          const profiles = label.profiles.filter((x) => x !== uid);
          if (profiles.length) {
            state.guiDevices[Number(labelId)] = { ...label, profiles };
          } else {
            delete state.guiDevices[Number(labelId)];
          }
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
        state.activationListStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(
            profile.assignments!.map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
          )
        );
        state.ledStatus = state.config.profiles!.map((profile) =>
          Object.fromEntries(profile.leds!.map((x, i) => [i, new LedStatus(i, x)]))
        );
      });
      get().saveConfig();
    },
    moveProfile: (from: number, to: number) => {
      set((state) => {
        const profiles = state.config.profiles;
        if (!profiles || from === to || !profiles[from] || !profiles[to]) {
          return;
        }
        // Standby lighting stays at the bottom
        if (profiles[from].opts.standbyLighting || profiles[to].opts.standbyLighting) {
          return;
        }
        // Profiles are tried in order, so this changes which one wins when several match
        const move = <T>(list: T[]) => {
          const next = [...list];
          next.splice(to, 0, ...next.splice(from, 1));
          return next;
        };
        // Index after the move of whatever was at idx before it
        const remap = (idx: number) => {
          if (idx === from) {
            return to;
          }
          if (from < idx && idx <= to) {
            return idx - 1;
          }
          if (to <= idx && idx < from) {
            return idx + 1;
          }
          return idx;
        };
        state.config = { ...state.config, profiles: move(profiles) };
        state.mappingStatus = move(state.mappingStatus);
        state.activationStatus = move(state.activationStatus);
        state.activationListStatus = move(state.activationListStatus);
        state.ledStatus = move(state.ledStatus);
        state.currentProfile = remap(state.currentProfile);
        state.lastProfile = remap(state.lastProfile);
      });
      get().saveConfig();
    },
    sendKeepAlive: async () => {
      const state = get();
      const dev = state.hidDevice;
      if (!dev || state.sendingKeepAlive || state.writing || state.updating) {
        return;
      }
      // only ever have a single keep alive in flight at once, and ignore additional requests while one is in flight
      set((state) => {
        state.sendingKeepAlive = true;
      });
      const keepalive = dev.sendFeatureReport(
        proto.ReportId.ReportIdKeepalive,
        new Uint8Array([0])
      );
      try {
        await withHidTimeout(keepalive, 'keepalive acknowledgement');
        // The controller can stop answering for a while (e.g. the PC slept) and then come back
        if (get().hung) {
          set((state) => {
            state.hung = false;
          });
        }
      } catch (e) {
        const updating = get().updating;
        if (!updating) {
          console.error('Failed to send keep alive', e);
        }
        if (e instanceof HidResponseTimeoutError && !updating) {
          set((state) => {
            state.hung = true;
          });
        }
      }
      // A keepalive that timed out is still in flight, so let it finish (within reason) before sending another
      await Promise.race([keepalive.catch(() => {}), delay(HID_RESPONSE_TIMEOUT_MS)]);
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
      await startDetect(get, set, activation, mapping, led, innerMapping, undefined, {
        detectPin: proto.DetectPinCommand.create({ detectType: type }),
      });
    },
    detectInput: async (
      activation: number | undefined,
      mapping: number | undefined,
      led: number | undefined,
      innerMapping: number | undefined,
      request: DetectInputRequest
    ) => {
      await startDetect(get, set, activation, mapping, led, innerMapping, request, {
        detectInput: proto.DetectInputCommand.create(detectInputCommand(request)),
      });
    },

    testLed: async (profileId: number, ledId?: number, durationMs: number = 2000) => {
      const dev = get().hidDevice;
      if (!dev) {
        return;
      }
      const infoBuffer = proto.Command.encode(
        proto.Command.create({
          testLed: proto.TestLedCommand.create({
            profileId,
            id: ledId ?? 0xffffffff,
            durationMs,
          }),
        })
      )
        .ldelim()
        .finish();
      const outBuffer = new ArrayBuffer(63);
      new Uint8Array(outBuffer).set(infoBuffer);
      await dev.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer);
    },

    updateConfig: (config: proto.IConfig) => {
      set((state) => {
        state.config = { ...state.config, ...config };
      });
      get().saveConfig();
    },
    loadDefaults: (device: DeviceStatus | ProfileSlot | undefined, presetId?: string) => {
      set((state) => {
        const profile = state.config.profiles![state.currentProfile];
        let type = 'gpio';
        let targetDeviceId: number | undefined = undefined;
        let deviceStatusObj: DeviceStatus | undefined = undefined;
        let assignment: proto.IProfileAssignmentInfo | undefined = undefined;

        if (device && 'slotId' in device && 'deviceKind' in device) {
          const slot = device as ProfileSlot;
          targetDeviceId = slot.slotId;
          assignment = slot.item;
          type = slot.deviceKind === 'midi' ? 'midiSerial' : slot.deviceKind;
          deviceStatusObj = Object.values(state.deviceStatus).find(
            (d) =>
              !isMidiOutDevice(d.device) &&
              (d.type === type ||
                (type === 'midiSerial' &&
                  (d.type === 'midiSerial' || d.type === 'bhDrum' || d.type === 'worldTourDrum')))
          );
        } else if (device && 'type' in device) {
          const devStatus = device as DeviceStatus;
          type = devStatus.type;
          if (
            requiresAssignment(type, devStatus.device) &&
            !isDeviceAssigned(type, profile, devStatus.device)
          ) {
            return;
          }
          targetDeviceId = parseInt(devStatus.id, 10);
          if (requiresAssignment(type, devStatus.device) && profile?.assignments) {
            const allSlots = getProfileSlots(profile);
            const matchingSlot = allSlots.find(
              (s) =>
                s.deviceKind === type ||
                (s.deviceKind === 'midi' &&
                  (type === 'midiSerial' || type === 'bhDrum' || type === 'worldTourDrum'))
            );
            if (matchingSlot) {
              targetDeviceId = matchingSlot.slotId;
              assignment = matchingSlot.item;
            }
          }
          deviceStatusObj = devStatus;
        }

        const preset = MAPPING_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          addPresetKeyLabels(
            state.guiDevices,
            getPresetKeyLabels(preset, type, targetDeviceId, deviceStatusObj),
            profile.opts.uid
          );
        }
        let defaults = preset
          ? getPresetMappings(preset, type, targetDeviceId, deviceStatusObj)
          : getDefaultMappings(
              type,
              profile.opts.deviceToEmulate,
              targetDeviceId,
              deviceStatusObj,
              getAssignmentHostType(assignment, profile.opts.deviceToEmulate)
            );
        if (type === 'wii' && targetDeviceId != null) {
          defaults = moveWiiDrumNotesToMidiSlot(
            (profile.assignments ?? []).map((list) => (list.assignments ??= [])),
            profile.opts.deviceSlotIdVersion ?? 0,
            targetDeviceId,
            defaults
          );
        }
        profile.mappings!.push(...defaults);
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
        state.activationListStatus[state.currentProfile] = Object.fromEntries(
          profile.assignments!.map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
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
        if (!state.deviceStatus[id]) {
          return;
        }
        delete state.deviceStatus[id];
        for (const k of Object.keys(state.deviceStatus)) {
          if (state.deviceStatus[k].parentId === id) {
            delete state.deviceStatus[k];
          }
        }
        state.config.profiles = state.config.profiles!.map((p) => ({
          ...p,
          mappings: p.mappings?.filter((x) => !inputUsesDevice(x.input, idNum)),
          assignments: p.assignments?.map((x) => ({
            ...x,
            assignments: x.assignments?.filter(
              (y) =>
                (!y.input || !inputUsesDevice(y.input.input, idNum)) &&
                (!y.inputAnyTime || !inputUsesDevice(y.inputAnyTime.input, idNum))
            ),
          })),
          leds: p.leds?.filter(
            (x) => !x.mapping.inputMapping || !inputUsesDevice(x.mapping.inputMapping.input, idNum)
          ),
        }));
        // Status is keyed by mapping index, so rebuild it to line up with the shortened mappings
        state.mappingStatus = state.config.profiles.map((p) =>
          Object.fromEntries((p.mappings ?? []).map((x, i) => [i, new MappingStatus(i, x)]))
        );
      });
      get().saveConfig();
    },
    addDevice: (type: string, parentId?: string, fill?: (device: proto.IDevice) => void) => {
      let id = '0';
      set((state) => {
        if (isSingletonDeviceKind(type)) {
          const existing = Object.values(state.deviceStatus).find((x) => x.type === type);
          if (existing) {
            id = existing.id;
            fill?.(existing.device);
            return;
          }
        }
        if (Object.keys(state.deviceStatus).length) {
          id = (
            Math.max(...Object.values(state.deviceStatus).map((x) => x.device.deviceid)) + 1
          ).toString();
        }
        const status = createDefault(type, id, parentId);
        fill?.(status.device);
        state.deviceStatus[id] = status;
      });
      get().saveConfig();
      return id;
    },
    onReport: (evt: HIDInputReportEvent) => {
      if (evt.reportId !== proto.ReportId.ReportIdConfig) {
        return;
      }
      const eventList = proto.EventList.decodeDelimited(new Uint8Array(evt.data.buffer));
      if (!eventList.event.length) {
        return;
      }
      let btConnected = false;
      let reloaded = false;
      // One store update per report: the device can send these every millisecond while live
      // values change, and every update re-runs every selector on the page.
      set((state) => {
        for (const deviceEvent of eventList.event) {
          if (deviceEvent.midiDebug) {
            state.midiData.push([...deviceEvent.midiDebug.data!]);
            if (state.midiData.length > MAX_MIDI_DEBUG_EVENTS) {
              state.midiData.splice(0, state.midiData.length - MAX_MIDI_DEBUG_EVENTS);
            }
          }
          if (deviceEvent.cycle) {
            if (deviceEvent.cycle.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.cycle.id].cycleState = deviceEvent.cycle.state;
            }
          }
          if (deviceEvent.toggle) {
            if (deviceEvent.toggle.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.toggle.id].toggleState = deviceEvent.toggle.state;
            }
          }
          if (deviceEvent.console) {
            state.console = (state.console + deviceEvent.console.data).slice(-MAX_CONSOLE_CHARS);
          }
          if (deviceEvent.reload) {
            state.waitingForReload = true;
          }
          if (deviceEvent.loaded) {
            // The reload kept the connection, so there's no reconnect to wait for
            state.waitingForReload = false;
            reloaded = true;
          }
          if (deviceEvent.ps2) {
            if (deviceEvent.ps2.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.ps2.id].ps2CntType = deviceEvent.ps2.type;
            }
          }
          if (deviceEvent.snes) {
            if (deviceEvent.snes.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.snes.id].snesCntType = deviceEvent.snes.type;
            }
          }
          if (deviceEvent.joybus) {
            if (deviceEvent.joybus.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.joybus.id].joybusCntType = deviceEvent.joybus.type;
            }
          }
          if (deviceEvent.usb) {
            const event = deviceEvent.usb;
            event.subtype = normalizeSubType(event.subtype);
            if (event.id in state.deviceStatus) {
              const usbDevices = state.deviceStatus[event.id].usbDevices;
              const targetKey = usbDeviceKey(event);
              for (const [key, existing] of Object.entries(usbDevices)) {
                if (
                  Number(key) === targetKey ||
                  (existing.port === event.port && existing.interface === event.interface)
                ) {
                  delete usbDevices[Number(key)];
                }
              }
              if (event.connected) {
                usbDevices[targetKey] = event;
              }
            }
          }
          if (deviceEvent.bt) {
            deviceEvent.bt.subtype = normalizeSubType(deviceEvent.bt.subtype);
            if (deviceEvent.bt.id in state.deviceStatus) {
              const id = deviceEvent.bt.sourceId ?? 0;
              if (deviceEvent.bt.connected) {
                state.deviceStatus[deviceEvent.bt.id].btDevices[id] = deviceEvent.bt;
              } else {
                delete state.deviceStatus[deviceEvent.bt.id].btDevices[id];
              }
            }
            if (deviceEvent.bt.connected) {
              btConnected = true;
            }
          }
          if (deviceEvent.wii) {
            if (deviceEvent.wii.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.wii.id].wiiExtType = deviceEvent.wii.extension;
            }
          }
          if (deviceEvent.device) {
            const device = deviceEvent.device;
            if (device.id in state.deviceStatus) {
              const status = state.deviceStatus[device.id];
              status.connected = device.connected;
              if (device.updating !== undefined) {
                status.updating = !!device.updating;
              }
              if (device.progress !== undefined && device.progress !== null) {
                status.updateProgress = device.progress;
              }
              if (device.battery !== undefined && device.battery !== null) {
                status.battery = device.battery;
              }
              status.hostConnected = device.hostConnected ?? undefined;
              if (device.rebooting !== undefined && device.rebooting !== null) {
                status.rebooting = !!device.rebooting;
              }
            }
          }
          if (deviceEvent.crkdDrum) {
            console.log(deviceEvent.crkdDrum);
            if (deviceEvent.crkdDrum.id in state.deviceStatus) {
              state.deviceStatus[deviceEvent.crkdDrum.id].crkdDrumCalibration[
                deviceEvent.crkdDrum.type
              ] = deviceEvent.crkdDrum.data;
            }
          }
          if (!state.polling) {
            continue;
          }
          if (deviceEvent.button) {
            if (state.mappingStatus.length) {
              const mappings = state.mappingStatus[state.currentProfile ?? 0];
              if (deviceEvent.button.id in mappings) {
                const mapping = mappings[deviceEvent.button.id];
                mapping.state = deviceEvent.button.state ? 65535 : 0;
                mapping.stateRaw = deviceEvent.button.stateRaw ? 65535 : 0;
              }
            }
          }
          if (deviceEvent.axis) {
            if (state.mappingStatus.length) {
              const mappings = state.mappingStatus[state.currentProfile ?? 0];
              if (deviceEvent.axis.id in mappings) {
                const mapping = mappings[deviceEvent.axis.id];
                mapping.state = deviceEvent.axis.state!;
                mapping.stateRaw = deviceEvent.axis.stateRaw!;
              }
            }
          }
          if (deviceEvent.pin) {
            state.detected = deviceEvent.pin.pin;
            state.detecting = false;
          }
          if (deviceEvent.inputDetection && state.detectInputRequest) {
            state.detectedInput = detectedInput(
              state.detectInputRequest,
              deviceEvent.inputDetection
            );
            state.detecting = false;
          }
          if (deviceEvent.trigger) {
            if (state.activationStatus.length) {
              const mappings = state.activationStatus[state.currentProfile ?? 0];
              if (
                deviceEvent.trigger.listId in mappings &&
                deviceEvent.trigger.id in mappings[deviceEvent.trigger.listId]
              ) {
                const mapping = mappings[deviceEvent.trigger.listId][deviceEvent.trigger.id];
                mapping.state = deviceEvent.trigger.state!;
                mapping.stateRaw = deviceEvent.trigger.stateRaw!;
              }
            }
          }
          if (deviceEvent.activationList) {
            if (state.activationListStatus.length) {
              const statuses = state.activationListStatus[state.currentProfile ?? 0];
              if (deviceEvent.activationList.listId in statuses) {
                statuses[deviceEvent.activationList.listId].state =
                  deviceEvent.activationList.state!;
              }
            }
          }
          if (deviceEvent.led) {
            if (state.ledStatus.length) {
              const mappings = state.ledStatus[state.currentProfile ?? 0];
              if (deviceEvent.led.id in mappings) {
                const mapping = mappings[deviceEvent.led.id];
                mapping.state = deviceEvent.led.state!;
                mapping.stateRaw = deviceEvent.led.stateRaw!;
              }
            }
          }
        }
      });
      if (btConnected) {
        get().refreshBluetoothPairings();
      }
      if (reloaded) {
        get().refreshActiveProfiles();
      }
    },
    refreshActiveProfiles: async () => {
      const device = get().hidDevice;
      if (!device) {
        return;
      }
      const { activeProfiles, deferredMode } = await readActiveProfiles(device);
      if (get().hidDevice !== device) {
        return;
      }
      set((state) => {
        state.activeProfiles = activeProfiles;
        state.deferredMode = deferredMode;
      });
    },
    addProfile: () => {
      set((state) => {
        const defaultAssignment: proto.IProfileAssignment = {
          assignments: [
            {
              consoleType: {
                consoleType: null,
                forcedType: null,
                xinputOnWindows: true,
                ps4OrPs5Mode: false,
              },
            },
          ],
        };
        const newIdx = profileInsertIndex(state.config.profiles);
        const profiles = [...(state.config.profiles || [])];
        profiles.splice(newIdx, 0, {
          opts: {
            faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
            deviceToEmulate: proto.SubType.Gamepad,
            deviceSlotIdVersion: 2,
            name: i18next.t('profileDefaults.name'),
            uid: Math.max(0, ...(state.config.profiles?.map((x) => x.opts.uid) || [])) + 1,
          },
          assignments: [defaultAssignment],
          mappings: [],
          leds: [],
        });
        state.config = { ...state.config, profiles };
        // Standby lighting moved down one to make room
        if (state.lastProfile >= newIdx) {
          state.lastProfile += 1;
        }
        state.currentProfile = newIdx;
        state.mappingStatus.splice(newIdx, 0, []);
        state.activationStatus.splice(newIdx, 0, {
          0: [new ActivationStatus(0, defaultAssignment.assignments![0])],
        });
        state.activationListStatus.splice(newIdx, 0, {
          0: new ActivationListStatus(0),
        });
        state.ledStatus.splice(newIdx, 0, []);
      });
      get().saveConfig();
    },
    addStandbyProfile: () => {
      set((state) => {
        if (state.config.profiles?.some((x) => x.opts.standbyLighting)) {
          return;
        }
        state.config = {
          ...state.config,
          profiles: [
            ...(state.config.profiles || []),
            {
              opts: {
                faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
                deviceToEmulate: proto.SubType.Gamepad,
                deviceSlotIdVersion: 2,
                name: i18next.t('profileDefaults.standbyName'),
                uid: Math.max(0, ...(state.config.profiles?.map((x) => x.opts.uid) || [])) + 1,
                standbyLighting: true,
              },
              assignments: [],
              mappings: [],
              leds: [],
            },
          ],
        };
        const newIdx = state.config.profiles!.length - 1;
        state.currentProfile = newIdx;
        state.mappingStatus[newIdx] = [];
        state.activationStatus[newIdx] = {};
        state.activationListStatus[newIdx] = {};
        state.ledStatus[newIdx] = [];
      });
      get().saveConfig();
    },
    cloneProfile: (id: number) => {
      set((state) => {
        const sourceProfile = state.config.profiles?.[id];
        if (!sourceProfile) {
          return;
        }
        const cloned: proto.IProfile = proto.Profile.decode(
          proto.Profile.encode(sourceProfile).finish()
        );
        const newUid =
          Math.max(0, ...(state.config.profiles?.map((x) => x.opts?.uid ?? 0) || [])) + 1;
        cloned.opts = {
          ...cloned.opts,
          name: i18next.t('profileDefaults.copyName', {
            name: sourceProfile.opts?.name ?? i18next.t('profileDefaults.name'),
          }),
          uid: newUid,
        };
        // The copy gets the labels that were only shown in the profile it's a copy of
        for (const [labelId, label] of Object.entries(state.guiDevices)) {
          if (label.profiles?.includes(sourceProfile.opts.uid)) {
            state.guiDevices[Number(labelId)] = {
              ...label,
              profiles: [...label.profiles, newUid],
            };
          }
        }
        const newIdx = profileInsertIndex(state.config.profiles);
        const profiles = [...(state.config.profiles || [])];
        profiles.splice(newIdx, 0, cloned);
        state.config = { ...state.config, profiles };
        // Standby lighting moved down one to make room
        if (state.lastProfile >= newIdx) {
          state.lastProfile += 1;
        }
        state.currentProfile = newIdx;
        state.mappingStatus = state.config.profiles!.map((p) =>
          Object.fromEntries((p.mappings ?? []).map((x, i) => [i, new MappingStatus(i, x)]))
        );
        state.activationStatus = state.config.profiles!.map((p) =>
          Object.fromEntries(
            (p.assignments ?? []).map((x, listIdx) => [
              listIdx,
              (x.assignments ?? []).map((a, i) => new ActivationStatus(i, a!)),
            ])
          )
        );
        state.activationListStatus = state.config.profiles!.map((p) =>
          Object.fromEntries(
            (p.assignments ?? []).map((_, listIdx) => [listIdx, new ActivationListStatus(listIdx)])
          )
        );
        state.ledStatus = state.config.profiles!.map((p) =>
          Object.fromEntries((p.leds ?? []).map((x, i) => [i, new LedStatus(i, x)]))
        );
      });
      get().saveConfig();
    },

    disconnect: async () => {
      stopInUseRetryTimer();
      const state = get();
      const dev = state.hidDevice;
      dev?.removeEventListener('inputreport', state.onReport);
      if (dev?.opened) {
        if (state.keepaliveTimeout) {
          stopKeepaliveTimer(state.keepaliveTimeout);
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
      // Firmware updates have their own timeout, as they take a lot longer to come back
      const awaitingReload = state.waitingForReload && !state.updating;
      set((state) => {
        state.keepaliveTimeout = undefined;
        state.connected = state.waitingForReload;
        state.hung = false;
        state.configLoadError = null;
        state.updating = false;
        state.hidDevice = undefined;
      });
      // The controller may come back in a mode without the config interface (like a profile that
      // forces PS3 mode), which we never see, so stop waiting for it eventually
      if (awaitingReload) {
        stopReloadReconnectTimer();
        const isBluetooth = dev instanceof BluetoothConfigDevice;
        reloadReconnectTimer = setTimeout(
          () => {
            reloadReconnectTimer = undefined;
            if (get().hidDevice || !get().waitingForReload) {
              return;
            }
            set((state) => {
              state.waitingForReload = false;
              state.connected = false;
              state.reloadLost = true;
            });
          },
          isBluetooth
            ? BLUETOOTH_RECONNECT_ATTEMPTS * BLUETOOTH_RECONNECT_DELAY_MS
            : RELOAD_RECONNECT_TIMEOUT_MS
        );
      }
    },
    reconnect: async (device: HIDDevice) => {
      stopReloadReconnectTimer();
      if (!device.opened) {
        await device.open();
      }
      const finishingUpdate = get().applyingUpdate;
      stopFirmwareApplyProgress();
      // The bootloader rolls back if the new firmware doesn't start, and a bad flash would leave
      // the old version running, so make sure the version actually changed
      const {
        version: firmwareVersion,
        build: firmwareBuild,
        latest: updateApplied,
      } = finishingUpdate
        ? await checkFirmwareVersion(device)
        : { version: get().firmwareVersion, build: get().firmwareBuild, latest: false };
      set(
        (state) => ({
          ...state,
          hidDevice: device,
          firmwareVersion,
          firmwareBuild,
          connected: true,
          hung: false,
          polling: true,
          waitingForReload: false,
          reloadLost: false,
          ...(finishingUpdate
            ? {
                updating: false,
                applyingUpdate: false,
                updatePercentage: 0,
                latest: updateApplied,
                updateError: updateApplied ? undefined : ('notApplied' as const),
              }
            : {}),
        }),
        true
      );
      device.addEventListener('inputreport', get().onReport);
      stopKeepaliveTimer(get().keepaliveTimeout);
      const timeout = startKeepaliveTimer(() => get().sendKeepAlive(), KEEPALIVE_INTERVAL_MS);
      await device.sendFeatureReport(proto.ReportId.ReportIdKeepalive, new Uint8Array([0]));
      const { activeProfiles, deferredMode } = await readActiveProfiles(device);
      const state = get();
      if (state.config.profiles![state.currentProfile]) {
        const infoBuffer2 = proto.Command.encode(
          proto.Command.create({
            setProfile: proto.SetProfileCommand.create({
              profileId: state.config.profiles![state.currentProfile].opts.uid,
              instanceId: state.currentProfileInstance ?? 0,
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
          activeProfiles,
          deferredMode,
          waitingForReload: false,
        }),
        true
      );
      // Anything changed while the device was re-enumerating, or a save it cut off, hasn't reached
      // it yet. Only then, as resending otherwise would overwrite aux the device changed itself
      if (get().pendingSave) {
        await get().saveConfig();
      }
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
      if (!state.hidDevice || !state.connected) {
        return;
      }
      const { config, aux } = get().buildConfig();
      const buffer = proto.Config.create(config).toJSON();
      const bufferAux = proto.AuxConfigBlock.create(withoutPairings(aux)).toJSON();
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
        await get().replaceConfig(config, aux);
      } catch (e) {
        console.log(e);
      }
    },
    importLegacyConfig: async (files: File[]) => {
      if (!files.length) {
        return;
      }
      let result: ReturnType<typeof importLegacyConfigs>;
      const name = (file: File) => file.name.replace(/\.[^.]*$/, '');
      try {
        result = importLegacyConfigs(
          await Promise.all(
            files.map(async (file) => ({
              data: new Uint8Array(await file.arrayBuffer()),
              name: name(file),
            }))
          )
        );
      } catch (e) {
        console.log(e);
        set((state) => {
          state.legacyImportWarnings = [
            legacyWarning('legacyImport.readFailed', {
              count: files.length,
              error: legacyErrorReason(e),
            }),
          ];
        });
        return;
      }
      await get().replaceConfig(result.config, result.aux, {
        legacyImportWarnings: result.warnings,
      });
    },
    replaceConfig: async (config, aux, extra) => {
      stopKeepaliveTimer(get().keepaliveTimeout);
      const timeout = startKeepaliveTimer(() => get().sendKeepAlive(), KEEPALIVE_INTERVAL_MS);
      set(
        (old) => ({
          ...old,
          ...InitState(config, aux),
          // A save still sending its chunks would interleave with ours, so let it finish first
          writing: old.writing,
          writeTimeout: old.writeTimeout,
          // Sending it only changes the live config, flash still has the old one until it's saved
          savedConfig: old.savedConfig,
          // The device keeps its own pairings, whatever the new config has
          bluetoothStates: old.bluetoothStates,
          tlvEntries: old.tlvEntries,
          configModified: true,
          connected: true,
          keepaliveTimeout: timeout,
          ...extra,
        }),
        true
      );
      await get().saveConfig();
      // The device reloads the new config in place and keeps polling the profile the tool last
      // picked, which may not exist any more, so pick the current one again
      await get().setActiveProfile(get().currentProfile.toString());
    },
    factoryReset: async () => {
      const { config } = get().buildConfig();
      await get().replaceConfig(
        proto.Config.create({
          devices: [],
          profiles: [],
          xboxOneLegacyAdapter: true,
          // Whether this board boots as a peripheral is part of how it was flashed, not its setup
          peripheralBoot: config.peripheralBoot,
        }),
        proto.AuxConfigBlock.create({ states: [], bluetoothStates: [], tlvEntries: [] })
      );
    },
    clearLegacyImportWarnings: () =>
      set((state) => {
        state.legacyImportWarnings = [];
      }),
    buildUf2: (pico2: boolean) => {
      const { buffer, mainLen, auxLen } = get().buildConfigBuffer(true);
      buildUf2FromConfig(pico2, { buffer, mainLen, auxLen });
    },
    saveConfig: async (immediate = false, committing = false) => {
      const state = get();
      if (state.configLoadError) {
        return false;
      }
      // hidDevice is gone while the device re-enumerates after a reload, reconnect sends this
      // config once it is back
      if (!state.hidDevice || !state.connected) {
        if (state.connected) {
          set((state) => {
            state.pendingSave = true;
          });
        }
        return false;
      }
      // debounce writes so we don't trash the flash on the pico
      const now = +new Date();
      if ((!immediate && now - state.lastUpdate < 1000) || state.writing) {
        if (state.writeTimeout) {
          clearTimeout(state.writeTimeout);
        }
        set((state) => {
          state.writeTimeout = setTimeout(() => get().saveConfig(), 500);
        });
        return false;
      }
      set((state) => {
        state.lastUpdate = now;
      });
      const { buffer, mainLen, auxLen } = get().buildConfigBuffer(false, committing);
      const crc = new CRC32().calculate(buffer);
      // Don't write if nothing has changed
      if (crc === state.crc) {
        return buffer.slice(0, mainLen);
      }
      set((state) => {
        state.writing = true;
        state.crc = crc;
        state.detecting = false;
        state.polling = false;
      });
      try {
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
          return buffer.slice(0, mainLen);
        }
        let start = 0;
        const len = 63;
        while (start < buffer.length) {
          const slice = new ArrayBuffer(63);
          new Uint8Array(slice).set(buffer.slice(start, start + len));
          start += len;
          await state.hidDevice?.sendFeatureReport(proto.ReportId.ReportIdConfig, slice);
        }
      } catch (e) {
        // Left set, writing would stop the keepalives and every later save for good
        console.error('Failed to write config', e);
        set((state) => {
          state.writing = false;
          state.polling = true;
          // so the next save sends it again instead of thinking the device already has it
          state.crc = 0;
          state.pendingSave = true;
        });
        return false;
      }
      set((state) => {
        state.writing = false;
        state.polling = true;
        state.waitingForReload = true;
        state.pendingSave = false;
      });
      return buffer.slice(0, mainLen);
    },
    buildConfigBuffer: (shareable = false, committing = true) => {
      const { config, aux } = get().buildConfig();
      if (!committing) {
        // Every write reloads the device, so typing a name would reload it on each keystroke. The
        // device keeps the saved name until the next save
        config.deviceName = savedDeviceName(get().savedConfig);
        config.manufacturerName = savedManufacturerName(get().savedConfig);
        // Same for the seller branding
        const seller = savedSellerConfig(get().savedConfig);
        config.guiConfig = (config.guiConfig ?? []).filter((x) => !x.seller);
        if (seller) {
          config.guiConfig.push({ deviceid: 0, seller });
        }
      }
      const bufferMain = proto.Config.encode(config).finish();
      const bufferAux = proto.AuxConfigBlock.encode(
        shareable ? withoutPairings(aux) : aux
      ).finish();
      const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
      buffer.set(bufferMain, 0);
      buffer.set(bufferAux, bufferMain.length);
      return { buffer, mainLen: bufferMain.length, auxLen: bufferAux.length };
    },
    buildConfig: () => {
      const state = get();
      const config = { ...state.config };
      config.syncCalibrations = state.syncInputs;
      config.devices = Object.values(state.deviceStatus)
        .filter((x) => !x.parentId)
        .map((x) => {
          const dev = proto.Device.create(x.device);
          if (dev.peripheral) {
            const subDevices = Object.values(state.deviceStatus)
              .filter((sub) => sub.parentId === x.id)
              .map((sub) => sub.device);
            dev.peripheral.devices = subDevices as proto.Device[];
          }
          return dev;
        });
      // If we are using any of the tap frets then we need slider mappings, otherwise we don't
      // If a subtype supports PS3 mappings, then allow setting the option, otherwise force ps4 mode
      config.profiles = state.mappingStatus.map((x, i) => {
        const profile = config.profiles![i];
        const isPs4Subtype = ps4Subtypes.includes(profile.opts.deviceToEmulate);
        const isHidOnly = hidOnlySubtypes.includes(profile.opts.deviceToEmulate);
        const profileSlots = getProfileSlots(profile);
        const midiChannels = new Map(
          profileSlots.flatMap((slot) =>
            slot.deviceKind === 'midi' && slot.midiChannel != null
              ? [[getProfileSlotKey(slot.deviceKind, slot.slotId), slot.midiChannel] as const]
              : []
          )
        );
        const assignments = profile.assignments?.map((list) => ({
          ...list,
          assignments: list.assignments?.map((assignment) => {
            return {
              ...assignment,
              consoleType: assignment.consoleType
                ? {
                    ...assignment.consoleType,
                    xinputOnWindows: !isHidOnly && (assignment.consoleType.xinputOnWindows ?? true),
                    ps4OrPs5Mode: !isPs4Subtype || !!assignment.consoleType.ps4OrPs5Mode,
                  }
                : undefined,
              input: assignment.input?.input
                ? {
                    ...assignment.input,
                    input: withSlotMidiChannel(assignment.input.input, midiChannels, profileSlots),
                  }
                : assignment.input,
              inputAnyTime: assignment.inputAnyTime?.input
                ? {
                    ...assignment.inputAnyTime,
                    input: withSlotMidiChannel(
                      assignment.inputAnyTime.input,
                      midiChannels,
                      profileSlots
                    ),
                  }
                : assignment.inputAnyTime,
            };
          }),
        }));
        const firstConsoleType = assignments
          ?.flatMap((l) => l.assignments ?? [])
          .find((a) => a.consoleType)?.consoleType;
        const xinputOnWindows = firstConsoleType?.xinputOnWindows ?? true;
        const ps4OrPs5Mode = !isPs4Subtype || !!firstConsoleType?.ps4OrPs5Mode;
        // the firmware only turns the tap frets into a slider value when this is on
        const supportsSlider = Object.values(x).some((x) => {
          const button = x.mapping.mapping.ghButton;
          return (
            button != null &&
            button >= proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen &&
            button <= proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange
          );
        });

        return {
          ...profile,
          supportsSlider,
          opts: {
            ...profile.opts,
            // Names from before the limit, or from imported configs, could be longer than the firmware holds
            name: truncateProfileName(profile.opts.name ?? ''),
            supportsSlider,
            xinputOnWindows,
            ps4OrPs5Mode,
          },
          assignments,
          mappings: Object.values(x).map(({ mapping }) => ({
            ...mapping,
            input: mapping.input
              ? withSlotMidiChannel(mapping.input, midiChannels, profileSlots)
              : mapping.input,
          })),
          leds: profile.leds?.map((led) => ({
            ...led,
            mapping: {
              ...led.mapping,
              inputMapping: led.mapping.inputMapping
                ? {
                    ...led.mapping.inputMapping,
                    input: withSlotMidiChannel(
                      led.mapping.inputMapping.input,
                      midiChannels,
                      profileSlots
                    ),
                  }
                : led.mapping.inputMapping,
            },
          })),
        };
      });
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
      const aux = {
        states,
        toggleStates,
        bluetoothStates: state.bluetoothStates,
        tlvEntries: state.tlvEntries,
        ghArcadeSide: state.ghArcadeSide,
      };
      const bufferMain = proto.Config.encode(config).finish();
      const bufferAux = proto.AuxConfigBlock.encode(aux).finish();
      const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
      buffer.set(bufferMain, 0);
      buffer.set(bufferAux, bufferMain.length);
      set((old) => ({
        ...old,
        configModified: !equals(bufferMain, old.savedConfig),
      }));
      return { config, aux };
    },
    removeBluetoothPairing: async (id: number) => {
      const mac = get().bluetoothStates.find((x) => x.id === id)?.macAddress;
      // Drop it here straight away, keys and all, so a save sent in the meantime can't bring it back
      set((state) => {
        state.bluetoothStates = state.bluetoothStates.filter((x) => x.id !== id);
        if (mac) {
          state.tlvEntries = state.tlvEntries.filter((entry) => !isBondForMac(entry, mac));
        }
      });
      const state = get();
      if (!state.hidDevice || !state.connected) {
        // Nothing to tell, so it goes out with the rest of the config
        set((state) => {
          state.configModified = true;
        });
        return;
      }
      // The device forgets it (connection, bond and pairing) and saves that itself, so this doesn't
      // wait for the next save or take the rest of the unsaved config with it
      try {
        const cmdBuffer = proto.Command.encode(
          proto.Command.create({
            unpairBluetooth: proto.UnpairBluetoothCommand.create({ id }),
          })
        )
          .ldelim()
          .finish();
        const outBuffer = new ArrayBuffer(63);
        new Uint8Array(outBuffer).set(cmdBuffer);
        await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer);
      } catch (e) {
        console.error('Failed to send unpair command', e);
        return;
      }
      await delay(250);
      await get().refreshBluetoothPairings();
    },
    forgetBluetoothHosts: async () => {
      const state = get();
      if (!state.hidDevice || !state.connected) {
        return;
      }
      // The device forgets them and saves that itself, keeping the controllers it paired with
      try {
        const cmdBuffer = proto.Command.encode(
          proto.Command.create({
            forgetBluetoothHosts: proto.ForgetBluetoothHostsCommand.create(),
          })
        )
          .ldelim()
          .finish();
        const outBuffer = new ArrayBuffer(63);
        new Uint8Array(outBuffer).set(cmdBuffer);
        await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer);
      } catch (e) {
        console.error('Failed to send forget hosts command', e);
        return;
      }
      await delay(250);
      await get().refreshBluetoothPairings();
    },
    scanBluetooth: async () => {
      const state = get();
      if (!state.hidDevice || state.scanningBluetooth) {
        return;
      }
      set((state) => {
        state.scanningBluetooth = true;
      });
      try {
        const cmdBuffer = proto.Command.encode(
          proto.Command.create({
            scan: proto.ScanCommand.create({}),
          })
        )
          .ldelim()
          .finish();
        const outBuffer = new ArrayBuffer(63);
        new Uint8Array(outBuffer).set(cmdBuffer);
        await state.hidDevice.sendFeatureReport(proto.ReportId.ReportIdCommand, outBuffer);
      } catch (e) {
        console.error('Failed to send scan command', e);
      }
      setTimeout(async () => {
        set((state) => {
          state.scanningBluetooth = false;
        });
        await get().refreshBluetoothPairings();
      }, 10000);
    },
    refreshBluetoothPairings: async () => {
      const state = get();
      if (!state.hidDevice || !state.connected || state.refreshingBluetooth) {
        return;
      }
      try {
        set((state) => {
          state.refreshingBluetooth = true;
        });
        const { data, info } = await fetchConfigDataWithRetry(state.hidDevice, false);
        const aux = proto.AuxConfigBlock.decode(data.slice(info.mainSize), info.auxSize);
        set((state) => {
          state.bluetoothStates = aux.bluetoothStates ?? [];
          state.tlvEntries = aux.tlvEntries ?? [];
          state.ghArcadeSide = aux.ghArcadeSide ?? null;
        });
      } catch (e) {
        console.error('Failed to refresh bluetooth pairings', e);
      } finally {
        set((state) => {
          state.refreshingBluetooth = false;
        });
      }
    },
    firmwareUpdate: async () => {
      const state = get();
      if (!state.hidDevice) {
        console.error('Cannot update firmware without a connected HID device');
        return;
      }
      // The device refuses it anyway, the update has to come from a UF2 with the matching bootloader
      if (state.bootloaderOutdated) {
        console.error('Cannot update firmware over OTA with an outdated bootloader');
        return;
      }
      const hidDevice = state.hidDevice;
      set((state) => {
        state.updatePercentage = 1;
        state.updating = true;
        state.waitingForReload = true;
        state.updateError = undefined;
        if (state.keepaliveTimeout) {
          stopKeepaliveTimer(state.keepaliveTimeout);
          state.keepaliveTimeout = undefined;
        }
      });
      while (get().sendingKeepAlive) {
        await delay(KEEPALIVE_INTERVAL_MS);
      }
      let firmwareSize = 0;
      try {
        const updateFile = await (
          await fetch(`santroller_ota_${state.type}.bin`, { cache: 'no-cache' })
        ).bytes();
        firmwareSize = updateFile.length;
        const fastFirmwareUploadReports = findFastFirmwareUploadReports(hidDevice);
        const firmwareInfo = proto.FirmwareUpdate.create({
          chunkOffset: 0,
          chunkSize: FIRMWARE_UPLOAD_CHUNK_SIZE,
          firmwareSize: updateFile.length,
          offset: 0,
        });
        const firmwareInfoReport = new Uint8Array(63);
        const uploadLegacy = async () => {
          firmwareInfo.chunkSize = LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE;
          const uploadReport = new Uint8Array(LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE + 1);
          uploadReport[0] = proto.ReportId.ReportIdUploadFirmware;
          for (let i = 0; i < updateFile.length; i += LEGACY_FIRMWARE_BLOCK_SIZE) {
            firmwareInfo.chunkOffset = 0;
            firmwareInfo.offset = i;
            firmwareInfoReport.fill(0);
            firmwareInfoReport.set(
              proto.FirmwareUpdate.encodeDelimited(firmwareInfo).ldelim().finish()
            );
            await hidDevice.sendFeatureReport(
              proto.ReportId.ReportIdUpdateFirmware,
              firmwareInfoReport
            );
            for (
              let j = 0;
              j < LEGACY_FIRMWARE_BLOCK_SIZE && i + j < updateFile.length;
              j += LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE
            ) {
              uploadReport.fill(0, 1);
              uploadReport.set(
                updateFile.subarray(i + j, i + j + LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE),
                1
              );
              await hidDevice.sendFeatureReport(
                proto.ReportId.ReportIdUploadFirmware,
                uploadReport
              );
            }
            set((old) => ({
              ...old,
              updatePercentage:
                1 +
                (Math.min(i + LEGACY_FIRMWARE_BLOCK_SIZE, updateFile.length) / updateFile.length) *
                  (FIRMWARE_UPLOAD_PROGRESS_END - 1),
            }));
          }
        };
        const uploadFast = async (sendChunk: (chunk: BufferSource) => Promise<void>) => {
          firmwareInfo.chunkSize = FIRMWARE_UPLOAD_CHUNK_SIZE;
          firmwareInfo.chunkOffset = 0;
          firmwareInfo.offset = 0;
          firmwareInfoReport.fill(0);
          firmwareInfoReport.set(
            proto.FirmwareUpdate.encodeDelimited(firmwareInfo).ldelim().finish()
          );
          await hidDevice.sendFeatureReport(
            proto.ReportId.ReportIdUpdateFirmware,
            firmwareInfoReport
          );

          const uploadReport = new Uint8Array(FIRMWARE_UPLOAD_CHUNK_SIZE);
          let offset = 0;
          while (offset < updateFile.length) {
            const blockOffset = offset % FIRMWARE_BLOCK_SIZE;
            const chunkSize = Math.min(
              FIRMWARE_UPLOAD_CHUNK_SIZE,
              FIRMWARE_BLOCK_SIZE - blockOffset,
              updateFile.length - offset
            );
            uploadReport.fill(0);
            uploadReport.set(updateFile.subarray(offset, offset + chunkSize));
            await sendChunk(uploadReport);
            offset += chunkSize;
            if (offset % FIRMWARE_BLOCK_SIZE === 0 || offset === updateFile.length) {
              set((old) => ({
                ...old,
                updatePercentage:
                  1 + (offset / updateFile.length) * (FIRMWARE_UPLOAD_PROGRESS_END - 1),
              }));
            }
          }
        };
        // Over bluetooth each acknowledged write is a round trip, so stream each block as output
        // reports (written without response) and then send the firmware update info for the next
        // block. That is acknowledged once the block is written, and refused if any of it went
        // missing, in which case the block is sent again.
        const uploadStreamed = async () => {
          firmwareInfo.chunkSize = FIRMWARE_UPLOAD_CHUNK_SIZE;
          const sendInfo = async (offset: number) => {
            firmwareInfo.chunkOffset = 0;
            firmwareInfo.offset = offset;
            firmwareInfoReport.fill(0);
            firmwareInfoReport.set(
              proto.FirmwareUpdate.encodeDelimited(firmwareInfo).ldelim().finish()
            );
            await hidDevice.sendFeatureReport(
              proto.ReportId.ReportIdUpdateFirmware,
              firmwareInfoReport
            );
          };
          await sendInfo(0);
          const uploadReport = new Uint8Array(FIRMWARE_UPLOAD_CHUNK_SIZE);
          for (let block = 0; block < updateFile.length; block += FIRMWARE_BLOCK_SIZE) {
            const blockEnd = Math.min(block + FIRMWARE_BLOCK_SIZE, updateFile.length);
            for (let attempt = 1; ; attempt++) {
              for (let offset = block; offset < blockEnd; offset += FIRMWARE_UPLOAD_CHUNK_SIZE) {
                uploadReport.fill(0);
                uploadReport.set(
                  updateFile.subarray(
                    offset,
                    Math.min(offset + FIRMWARE_UPLOAD_CHUNK_SIZE, blockEnd)
                  )
                );
                await hidDevice.sendReport(proto.ReportId.ReportIdUploadFirmware, uploadReport);
              }
              // the last block finishes the upload, and the controller reboots to apply it
              if (blockEnd === updateFile.length) {
                break;
              }
              try {
                await sendInfo(blockEnd);
                break;
              } catch (e) {
                if (attempt >= FIRMWARE_STREAMED_BLOCK_ATTEMPTS) {
                  throw e;
                }
                console.warn(`Firmware block at ${block} didn't arrive, sending it again`, e);
                // back to the start of the block
                await sendInfo(block);
              }
            }
            set((old) => ({
              ...old,
              updatePercentage:
                1 + (blockEnd / updateFile.length) * (FIRMWARE_UPLOAD_PROGRESS_END - 1),
            }));
          }
        };
        if (state.streamedFirmwareUpload) {
          await uploadStreamed();
        } else if (
          fastFirmwareUploadReports.featureReport &&
          reportByteLength(fastFirmwareUploadReports.featureReport) === FIRMWARE_UPLOAD_CHUNK_SIZE
        ) {
          await uploadFast((chunk) =>
            hidDevice.sendFeatureReport(proto.ReportId.ReportIdUploadFirmware, chunk)
          );
        } else if (fastFirmwareUploadReports.outputReport) {
          try {
            await uploadFast((chunk) =>
              hidDevice.sendReport(proto.ReportId.ReportIdUploadFirmware, chunk)
            );
          } catch (e) {
            if (!(e instanceof DOMException && e.name === 'NotAllowedError')) {
              throw e;
            }
            console.warn(
              'Firmware upload output report rejected; retrying with legacy feature reports',
              {
                reportId: fastFirmwareUploadReports.outputReport.reportId,
                advertisedLength: reportByteLength(fastFirmwareUploadReports.outputReport),
                sentLength: FIRMWARE_UPLOAD_CHUNK_SIZE,
                error: e,
              }
            );
            await uploadLegacy();
          }
        } else {
          await uploadLegacy();
        }
      } catch (e) {
        console.error('Failed to update firmware', e);
        const current = get();
        const timeout =
          current.hidDevice?.opened && !current.keepaliveTimeout
            ? startKeepaliveTimer(() => get().sendKeepAlive(), KEEPALIVE_INTERVAL_MS)
            : current.keepaliveTimeout;
        set((state) => {
          state.updatePercentage = 0;
          state.updating = false;
          state.waitingForReload = false;
          state.keepaliveTimeout = timeout;
        });
        return;
      }
      await state.disconnect();
      // The controller drops off USB while the bootloader swaps the new firmware in, so keep the
      // progress bar moving until it comes back. The estimate assumes the bootloader only swaps
      // what the images use, older bootloaders swap the whole slot and take longer, so ease
      // towards 99% rather than stopping at the estimate.
      const applyEstimateMs =
        Math.ceil(firmwareSize / FIRMWARE_BLOCK_SIZE) * FIRMWARE_APPLY_MS_PER_SECTOR +
        FIRMWARE_REBOOT_MS;
      const applyStart = Date.now();
      set((state) => {
        state.updating = true;
        state.applyingUpdate = true;
        state.updatePercentage = FIRMWARE_UPLOAD_PROGRESS_END;
      });
      stopFirmwareApplyProgress();
      firmwareApplyTimer = setInterval(() => {
        const elapsed = Date.now() - applyStart;
        if (elapsed > FIRMWARE_APPLY_TIMEOUT_MS) {
          console.error('Controller did not come back after a firmware update');
          stopFirmwareApplyProgress();
          set((state) => {
            state.updating = false;
            state.applyingUpdate = false;
            state.updatePercentage = 0;
            state.updateError = 'noReconnect';
          });
          return;
        }
        set((state) => {
          state.updatePercentage =
            FIRMWARE_UPLOAD_PROGRESS_END +
            (99 - FIRMWARE_UPLOAD_PROGRESS_END) * (1 - Math.exp(-elapsed / applyEstimateMs));
        });
      }, FIRMWARE_APPLY_PROGRESS_INTERVAL_MS);
    },
    peripheralFirmwareUpdate: async (deviceId: number, file: File) => {
      const state = get();
      if (!state.hidDevice) {
        console.error('Cannot update peripheral firmware without a connected HID device');
        return;
      }
      const hidDevice = state.hidDevice;
      set((state) => {
        state.updatePercentage = 1;
        state.updating = true;
        state.waitingForReload = false;
        if (state.keepaliveTimeout) {
          stopKeepaliveTimer(state.keepaliveTimeout);
          state.keepaliveTimeout = undefined;
        }
      });
      while (get().sendingKeepAlive) {
        await delay(KEEPALIVE_INTERVAL_MS);
      }
      try {
        const updateFile = new Uint8Array(await file.arrayBuffer());
        const fastFirmwareUploadReports = findFastFirmwareUploadReports(hidDevice);
        const firmwareInfo = proto.FirmwareUpdate.create({
          chunkOffset: 0,
          chunkSize: FIRMWARE_UPLOAD_CHUNK_SIZE,
          firmwareSize: updateFile.length,
          offset: 0,
          deviceId,
        });
        const firmwareInfoReport = new Uint8Array(63);

        const uploadLegacy = async () => {
          firmwareInfo.chunkSize = LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE;
          const uploadReport = new Uint8Array(LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE + 1);
          uploadReport[0] = proto.ReportId.ReportIdUploadFirmware;
          for (let i = 0; i < updateFile.length; i += LEGACY_FIRMWARE_BLOCK_SIZE) {
            firmwareInfo.chunkOffset = 0;
            firmwareInfo.offset = i;
            firmwareInfoReport.fill(0);
            firmwareInfoReport.set(
              proto.FirmwareUpdate.encodeDelimited(firmwareInfo).ldelim().finish()
            );
            await hidDevice.sendFeatureReport(
              proto.ReportId.ReportIdUpdateFirmware,
              firmwareInfoReport
            );
            for (
              let j = 0;
              j < LEGACY_FIRMWARE_BLOCK_SIZE && i + j < updateFile.length;
              j += LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE
            ) {
              uploadReport.fill(0, 1);
              uploadReport.set(
                updateFile.subarray(i + j, i + j + LEGACY_FIRMWARE_UPLOAD_CHUNK_SIZE),
                1
              );
              await hidDevice.sendFeatureReport(
                proto.ReportId.ReportIdUploadFirmware,
                uploadReport
              );
            }
            set((old) => ({
              ...old,
              updatePercentage:
                1 +
                (Math.min(i + LEGACY_FIRMWARE_BLOCK_SIZE, updateFile.length) / updateFile.length) *
                  99,
            }));
          }
        };

        const uploadFast = async (sendChunk: (chunk: BufferSource) => Promise<void>) => {
          firmwareInfo.chunkSize = FIRMWARE_UPLOAD_CHUNK_SIZE;
          firmwareInfo.chunkOffset = 0;
          firmwareInfo.offset = 0;
          firmwareInfoReport.fill(0);
          firmwareInfoReport.set(
            proto.FirmwareUpdate.encodeDelimited(firmwareInfo).ldelim().finish()
          );
          await hidDevice.sendFeatureReport(
            proto.ReportId.ReportIdUpdateFirmware,
            firmwareInfoReport
          );

          const uploadReport = new Uint8Array(FIRMWARE_UPLOAD_CHUNK_SIZE);
          let offset = 0;
          while (offset < updateFile.length) {
            const blockOffset = offset % FIRMWARE_BLOCK_SIZE;
            const chunkSize = Math.min(
              FIRMWARE_UPLOAD_CHUNK_SIZE,
              FIRMWARE_BLOCK_SIZE - blockOffset,
              updateFile.length - offset
            );
            uploadReport.fill(0);
            uploadReport.set(updateFile.subarray(offset, offset + chunkSize));
            await sendChunk(uploadReport);
            offset += chunkSize;
            if (offset % FIRMWARE_BLOCK_SIZE === 0 || offset === updateFile.length) {
              set((old) => ({
                ...old,
                updatePercentage: 1 + (offset / updateFile.length) * 99,
              }));
            }
          }
        };

        if (
          fastFirmwareUploadReports.featureReport &&
          reportByteLength(fastFirmwareUploadReports.featureReport) === FIRMWARE_UPLOAD_CHUNK_SIZE
        ) {
          await uploadFast((chunk) =>
            hidDevice.sendFeatureReport(proto.ReportId.ReportIdUploadFirmware, chunk)
          );
        } else if (fastFirmwareUploadReports.outputReport) {
          try {
            await uploadFast((chunk) =>
              hidDevice.sendReport(proto.ReportId.ReportIdUploadFirmware, chunk)
            );
          } catch (e) {
            await uploadLegacy();
          }
        } else {
          await uploadLegacy();
        }
      } catch (e) {
        console.error('Failed to update peripheral firmware', e);
      } finally {
        const current = get();
        const timeout =
          current.hidDevice?.opened && !current.keepaliveTimeout
            ? startKeepaliveTimer(() => get().sendKeepAlive(), KEEPALIVE_INTERVAL_MS)
            : current.keepaliveTimeout;
        set((state) => {
          state.updatePercentage = 0;
          state.updating = false;
          state.keepaliveTimeout = timeout;
        });
      }
    },
    connect: async () => {
      if (!navigator.hid) {
        return;
      }
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x1209, productId: 0x2882, usagePage: 0xff00 },
          { vendorId: 0x1209, productId: 0x2883, usagePage: 0xff00 },
        ],
      });
      if (devices.length) {
        await get().connectDevice(devices[0]);
      }
    },
    connectBluetooth: async () => {
      if (!BluetoothConfigDevice.isSupported()) {
        return;
      }
      let bluetoothDevice: BluetoothConfigDevice;
      try {
        bluetoothDevice = await BluetoothConfigDevice.request();
      } catch (e) {
        // the user closed the device picker
        console.log(e);
        return;
      }
      bluetoothDevice.addEventListener('disconnect', () => onBluetoothDisconnect(bluetoothDevice));
      await get().connectDevice(bluetoothDevice as unknown as HIDDevice);
    },
    connectDevice: async (device: HIDDevice) => {
      stopReloadReconnectTimer();
      stopInUseRetryTimer();
      if (!device.opened) {
        await device.open();
      }
      device.addEventListener('inputreport', get().onReport);
      try {
        const {
          version: firmwareVersion,
          build: firmwareBuild,
          latest,
          newer: firmwareNewer,
        } = await checkFirmwareVersion(device);
        const { activeProfiles, deferredMode } = await readActiveProfiles(device);
        let deviceType = 'pico_w';
        try {
          const deviceTypeData = await receiveFeatureReport(device, proto.ReportId.ReportIdGetType);
          deviceType = String.fromCharCode
            .apply(null, Array.from(new Uint8Array(deviceTypeData.buffer.slice(1))))
            .trim()
            .replaceAll('\0', '');
        } catch (e) {
          console.log(e);
        }
        try {
          const { data, info } = await fetchConfigDataWithRetry(device, false);
          // Only the main config counts: the device keeps its aux block (pairings, toggle states)
          // itself and writes it to flash a moment after it changes, so the two can differ for a
          // while (eg just after rebooting from a firmware update) with nothing for the user to save
          const dataMain = data.slice(0, info.mainSize);
          let dataSaved: Uint8Array;
          try {
            const { data: fetchedDataSaved, info: infoSaved } = await fetchConfigDataWithRetry(
              device,
              true
            );
            dataSaved = fetchedDataSaved.slice(0, infoSaved.mainSize);
          } catch (e) {
            console.error('Failed to get saved config data', e);
            // If fetching the saved config data fails, fall back to using the current config data.
            dataSaved = dataMain;
          }
          const config = proto.Config.decode(data, info.mainSize);
          const aux = proto.AuxConfigBlock.decode(data.slice(info.mainSize), info.auxSize);
          const timeout = startKeepaliveTimer(() => get().sendKeepAlive(), KEEPALIVE_INTERVAL_MS);
          const fresh = InitState(config, aux);
          // Firmware too old to report it is caught by its build instead, so it goes straight to a
          // UF2 rather than an OTA update first
          const slowBootStage =
            !!info.slowBootStage || hasSlowBootStageBuild(deviceType, firmwareBuild);
          set(
            (old) => ({
              ...old,
              ...fresh,
              seller: old.seller,
              connected: true,
              hung: false,
              configLoadError: null,
              updating: false,
              hidDevice: device,
              crc: info.dataCrc,
              type: deviceType,
              latest,
              firmwareNewer,
              firmwareVersion,
              firmwareBuild,
              updateError: undefined,
              missingStaticFirmware: !!info.missingStaticFirmware,
              bootloaderOutdated: !!info.bootloaderOutdated,
              slowBootStage,
              needsUf2Update: !!info.needsUf2Update || slowBootStage,
              streamedFirmwareUpload: !!info.streamedFirmwareUpload,
              keepaliveTimeout: timeout,
              activeProfiles,
              deferredMode,
              savedConfig: dataSaved,
              configModified: fresh.configModified || !equals(dataSaved, dataMain),
            }),
            true
          );
          await device.sendFeatureReport(proto.ReportId.ReportIdLoaded, new Uint8Array([0]));
          // A config repaired on load only reaches the device once it's sent, so send it to the
          // live config, flash keeps the old one until it's saved
          if (fresh.configModified) {
            await get().saveConfig(true);
          }
        } catch (e) {
          const inUse = e instanceof ConfigInUseError;
          console.error('Failed to load config on connect', e);
          set(
            (old) => ({
              ...old,
              connected: true,
              hidDevice: device,
              firmwareVersion,
              firmwareBuild,
              crc: 0,
              configLoadError: inUse ? 'inUse' : 'failed',
              configLoadErrorMessage: e instanceof Error ? e.message : String(e),
            }),
            true
          );
          if (inUse) {
            // Open it as soon as the other configurator lets go
            inUseRetryTimer = setTimeout(() => {
              inUseRetryTimer = undefined;
              const current = get();
              if (current.hidDevice === device && current.configLoadError === 'inUse') {
                current.connectDevice(device);
              }
            }, IN_USE_RETRY_MS);
          }
        }
      } catch (e) {
        if (e instanceof HidResponseTimeoutError) {
          set(
            (old) => ({
              ...old,
              connected: true,
              hung: true,
              hidDevice: device,
              crc: 0,
            }),
            true
          );
        } else {
          device.removeEventListener('inputreport', get().onReport);
          if (device.opened) {
            await device.close();
          }
        }
      }
    },
  }))
);
async function fetchConfigData(device: HIDDevice, saved: boolean) {
  const infoData = await receiveFeatureReport(
    device,
    saved ? proto.ReportId.ReportIdConfigInfoSaved : proto.ReportId.ReportIdConfigInfo
  );
  const infoBytes = withoutPadding(
    new Uint8Array(infoData.buffer, infoData.byteOffset + 1, infoData.byteLength - 1)
  );
  let info: proto.ConfigInfo;
  try {
    info = proto.ConfigInfo.decode(infoBytes);
  } catch (e) {
    throw new ConfigReadError(
      `${saved ? 'saved' : 'current'} config info was unreadable (${infoBytes.length} bytes: ${hexBytes(infoBytes)}): ${e}`
    );
  }
  if (info.inUseByOtherTool) {
    throw new ConfigInUseError('the controller is open in another configurator');
  }
  if (info.magic >>> 0 !== magic) {
    console.log('magic didnt match!');
  }
  const which = saved ? 'saved' : 'current';
  const data = new Uint8Array(info.dataSize);
  // Anything past the chunk size is padding, which some bluetooth hosts pass on. Older firmware
  // doesn't say how big its chunks are
  const chunkSize = info.configChunkSize || Infinity;
  let start = 0;
  while (start < info.dataSize) {
    const slice = await receiveFeatureReport(device, proto.ReportId.ReportIdConfig);
    const toCopy = Math.min(slice.byteLength - 1, chunkSize, info.dataSize - start);
    if (toCopy <= 0) {
      throw new ConfigReadError(`${which} config stopped after ${start} of ${info.dataSize} bytes`);
    }
    const chunk = new Uint8Array(slice.buffer, slice.byteOffset + 1, toCopy);
    data.set(chunk, start);
    start += toCopy;
  }

  // The config is read as a stream of chunks, so a chunk lost or read twice on the way (which
  // happens now and then over bluetooth) shifts everything after it
  const crc = new CRC32().calculate(data);
  if (crc !== info.dataCrc) {
    throw new ConfigReadError(
      `${which} config CRC didn't match (got ${crc >>> 0}, expected ${info.dataCrc >>> 0})`
    );
  }
  return { data, info };
}

// Reading the config info again restarts the stream from the beginning
async function fetchConfigDataWithRetry(device: HIDDevice, saved: boolean) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchConfigData(device, saved);
    } catch (e) {
      if (!(e instanceof ConfigReadError) || attempt >= CONFIG_READ_ATTEMPTS) {
        throw e;
      }
      console.warn(`${e.message}, reading it again`);
    }
  }
}
const BLUETOOTH_RECONNECT_ATTEMPTS = 15;
const BLUETOOTH_RECONNECT_DELAY_MS = 2000;

// Bluetooth has no connect events like WebHID, so when the controller reboots (e.g. after saving)
// keep trying to reconnect to it ourselves
async function onBluetoothDisconnect(device: BluetoothConfigDevice) {
  const store = useConfigStore.getState();
  if (store.hidDevice !== (device as unknown as HIDDevice)) {
    return;
  }
  await store.disconnect();
  for (
    let i = 0;
    i < BLUETOOTH_RECONNECT_ATTEMPTS && useConfigStore.getState().waitingForReload;
    i++
  ) {
    await new Promise((resolve) => setTimeout(resolve, BLUETOOTH_RECONNECT_DELAY_MS));
    try {
      await device.open();
      if (!useConfigStore.getState().hidDevice) {
        await useConfigStore.getState().reconnect(device as unknown as HIDDevice);
      }
      return;
    } catch (e) {
      console.log('Bluetooth reconnect failed, retrying', e);
    }
  }
}

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

// make sure we disconnect from the device when using HMR in development. Only when this module is
// replaced, as any other update would remove the listeners without this module adding them back
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopReloadReconnectTimer();
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
    await (
      await fetch(pico2 ? '/santroller_pico2.uf2' : '/santroller_pico1.uf2', { cache: 'no-cache' })
    ).arrayBuffer()
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
  // in the page, so the desktop app sees the click too
  document.body.appendChild(link);
  link.click();
  link.remove();
}
export async function buildUf2FromJson(file: File | null, pico2: boolean) {
  try {
    const data = JSON.parse((await file?.text()) ?? '');
    const config = proto.Config.fromObject(data.config);
    const aux = proto.AuxConfigBlock.fromObject(data.aux);
    const bufferMain = proto.Config.encode(config).finish();
    // Older exports still have them
    const bufferAux = proto.AuxConfigBlock.encode(withoutPairings(aux)).finish();
    const buffer: Uint8Array = new Uint8Array(bufferMain.length + bufferAux.length);
    buffer.set(bufferMain, 0);
    buffer.set(bufferAux, bufferMain.length);
    buildUf2FromConfig(pico2, { buffer, mainLen: bufferMain.length, auxLen: bufferAux.length });
  } catch (e) {
    console.log(e);
  }
}
