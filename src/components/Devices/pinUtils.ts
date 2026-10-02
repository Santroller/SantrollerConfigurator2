import { TFunction } from 'i18next';
import { DeviceStatus, proto } from '../SettingsContext/SettingsContext';
import { hasDefaultMappings, isLedDeviceKind } from './deviceRegistry';

export function getLabel(
  t: TFunction<'translation', undefined>,
  guiDevices: proto.IGuiConfig[],
  devices: DeviceStatus[],
  pin: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter((x) => x[1].label?.pin === pin && (!customer || x[1].label?.showToCustomer))
    .map((x) => x[1].label?.label)
    .concat(
      Object.entries(devices)
        .filter((x) => DeviceStatus.pins(x[1]).includes(pin))
        .map((x) => `${t(`devices.${x[1].type}`)}`)
    );
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}

export function getMultiplexerLabel(
  guiDevices: proto.IGuiConfig[],
  channel: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter(
      (x) =>
        x[1].multiplexerLabel?.channel === channel &&
        (!customer || x[1].multiplexerLabel?.showToCustomer)
    )
    .map((x) => x[1].multiplexerLabel?.label);
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}

export function getMatrixLabel(
  guiDevices: proto.IGuiConfig[],
  inPin: number,
  outPin: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter(
      (x) =>
        x[1].matrixLabel?.inputPin === inPin &&
        x[1].matrixLabel?.outputPin === outPin &&
        (!customer || x[1].matrixLabel?.showToCustomer)
    )
    .map((x) => x[1].matrixLabel?.label);
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}

export function getSwitchNetworkLabel(
  guiDevices: proto.IGuiConfig[],
  pin: number,
  otherPin: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter(
      (x) =>
        x[1].switchNetworkLabel?.pin === pin &&
        x[1].switchNetworkLabel?.otherPin === otherPin &&
        (!customer || x[1].switchNetworkLabel?.showToCustomer)
    )
    .map((x) => x[1].switchNetworkLabel?.label);
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}

export function isLed(deviceStatus: DeviceStatus) {
  return isLedDeviceKind(deviceStatus.type);
}

export function hasDefaults(deviceStatus: DeviceStatus) {
  return hasDefaultMappings(deviceStatus.type);
}
