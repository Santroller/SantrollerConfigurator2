import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';

export type Xbox360RfModel = 'fat' | 'slim';

const STORAGE_KEY = 'santroller_xbox360_rf_model';

export function getXbox360RfModel(state?: ConfigState): Xbox360RfModel {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'fat' || saved === 'slim') {
    return saved;
  }
  const currentDevices = state?.config?.devices ?? useConfigStore.getState().config.devices;
  const rfDevice = currentDevices?.find((d) => d.xbox360Rf != null)?.xbox360Rf;
  if (rfDevice?.type === proto.Xbox360RfModuleType.Xbox360RfSlim) {
    return 'slim';
  }
  return 'fat';
}

export function setXbox360RfModel(model: Xbox360RfModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, model);
  } catch {
    // Ignore storage issues
  }
  const store = useConfigStore.getState();
  const currentDevices = store.config.devices;
  const existing = currentDevices?.find((d) => d.xbox360Rf != null);
  const targetType =
    model === 'slim'
      ? proto.Xbox360RfModuleType.Xbox360RfSlim
      : proto.Xbox360RfModuleType.Xbox360RfFat;

  if (existing && existing.deviceid !== undefined) {
    store.updateDevice(
      {
        deviceid: existing.deviceid,
        xbox360Rf: {
          type: targetType,
          dataPin: existing.xbox360Rf?.dataPin ?? -1,
          clockPin: existing.xbox360Rf?.clockPin ?? -1,
          syncPin: existing.xbox360Rf?.syncPin ?? -1,
        },
      },
      String(existing.deviceid)
    );
  }
}

