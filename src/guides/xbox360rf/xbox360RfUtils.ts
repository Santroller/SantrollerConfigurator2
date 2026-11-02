import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { ensureUsbHostDevice } from '../usb/usbHostUtils';

export type Xbox360RfModel = 'fat' | 'slim';

const STORAGE_KEY = 'santroller_xbox360_rf_model';

// config.devices is only rebuilt on connect, so live devices are read from deviceStatus
export function findXbox360RfDevice(state: ConfigState): proto.IDevice | undefined {
  return Object.values(state.deviceStatus).find((d) => d.device.xbox360Rf != null)?.device;
}

export function getXbox360RfModel(state?: ConfigState): Xbox360RfModel {
  // A configured module wins over the model picked in a previous session
  const rfDevice = findXbox360RfDevice(state ?? useConfigStore.getState())?.xbox360Rf;
  if (rfDevice) {
    return rfDevice.type === proto.Xbox360RfModuleType.Xbox360RfSlim ? 'slim' : 'fat';
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fat' || saved === 'slim') {
      return saved;
    }
  } catch {
    // Ignore storage issues
  }
  return 'fat';
}

export function xbox360RfModuleType(model: Xbox360RfModel): proto.Xbox360RfModuleType {
  return model === 'slim'
    ? proto.Xbox360RfModuleType.Xbox360RfSlim
    : proto.Xbox360RfModuleType.Xbox360RfFat;
}

export function setXbox360RfModel(model: Xbox360RfModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, model);
  } catch {
    // Ignore storage issues
  }
  const store = useConfigStore.getState();
  const existing = findXbox360RfDevice(store);

  if (existing && existing.deviceid != null) {
    store.updateDevice(
      {
        ...existing,
        xbox360Rf: {
          type: xbox360RfModuleType(model),
          dataPin: existing.xbox360Rf?.dataPin ?? -1,
          clockPin: existing.xbox360Rf?.clockPin ?? -1,
          syncPin: existing.xbox360Rf?.syncPin ?? -1,
        },
      },
      String(existing.deviceid)
    );
  }
}

// Adds the RF module on GP4 (data), GP5 (clock) and GP6 (sync) unless it's already there, and the USB
// host port its receiver's controller data arrives on. The module's own device only drives the
// serial bus (LEDs, sync).
export function addXbox360Rf(model: Xbox360RfModel) {
  const store = useConfigStore.getState();
  if (!findXbox360RfDevice(store)) {
    store.addDevice('xbox360Rf', undefined, (device) => {
      device.xbox360Rf = {
        ...device.xbox360Rf,
        type: xbox360RfModuleType(model),
        dataPin: 4,
        clockPin: 5,
        syncPin: 6,
      };
    });
  }
  ensureUsbHostDevice();
}
