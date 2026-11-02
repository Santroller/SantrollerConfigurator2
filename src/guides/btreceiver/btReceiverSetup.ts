import { proto } from '@/components/SettingsContext/config';
import {
  ConfigState,
  DeviceStatus,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { findDeviceStatus } from '../guideConfig';

export function findBluetooth(state: ConfigState) {
  return findDeviceStatus(state, 'bt');
}

// Adds the Bluetooth driver unless it's already there. On a Pico W it uses the board's own radio,
// otherwise a USB Bluetooth adapter on the USB host port.
export function ensureBluetoothDevice() {
  const store = useConfigStore.getState();
  return findBluetooth(store)?.id ?? store.addDevice('bt');
}

// The controllers connected over Bluetooth right now, with the kind each reports. Takes the driver's
// status rather than the whole state, as a new list on every store read would re-render forever.
export function connectedBluetoothControllers(bluetooth: DeviceStatus | undefined) {
  return Object.values(bluetooth?.btDevices ?? {}).map((device) => ({
    id: device.sourceId ?? device.id,
    name: device.name,
    subtype: device.subtype ?? proto.SubType.Unknown,
  }));
}

// The controller families the pairing step explains, in the order they're listed
export const PAIRING_FAMILIES = [
  'playstation',
  'ps3',
  'switch',
  'xbox',
  'wii',
  'ghl',
  'santroller',
  'other',
] as const;
