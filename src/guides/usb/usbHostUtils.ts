import { getSlotDeviceKind } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { assignDeviceToProfile, findDeviceStatus } from '../guideConfig';

// PIO-USB needs D+ and D- on consecutive pins, in either order (dmFirst); the guides wire D+ first
export const USB_HOST_DP_PIN = 2;

export function usbHostPins(device?: proto.IUsbHostDevice | null) {
  const first = device?.firstPin ?? USB_HOST_DP_PIN;
  return device?.dmFirst ? { dp: first + 1, dm: first } : { dp: first, dm: first + 1 };
}

export function profileHasUsbSlot(state: ConfigState): boolean {
  const profile = state.config.profiles?.[state.currentProfile];
  return (profile?.assignments ?? []).some((list) =>
    (list.assignments ?? []).some((item) => getSlotDeviceKind(item) === 'usbHost')
  );
}

// Adds a usbHost device on GP2 (D+) / GP3 (D-) unless one already exists
export function ensureUsbHostDevice(): string {
  const store = useConfigStore.getState();
  return (
    findDeviceStatus(store, 'usbHost')?.id ??
    store.addDevice('usbHost', undefined, (device) => {
      device.usbHost!.firstPin = USB_HOST_DP_PIN;
      device.usbHost!.dmFirst = false;
    })
  );
}

/**
 * Adds the usbHost device, then makes sure the active profile has a USB slot for it so the plugged
 * in controller actually drives the profile.
 */
export function ensureUsbHost(): string {
  const id = ensureUsbHostDevice();
  const store = useConfigStore.getState();
  const profile = store.config.profiles?.[store.currentProfile];
  // A usbType slot only matches a plugged in controller of exactly that subtype. Using the type
  // the profile emulates means e.g. a guitar plugged into a guitar profile maps 1:1 with the
  // default mappings; profiles without one fall back to Gamepad, the same default the Inputs
  // page's addHostSource('usbType') uses.
  assignDeviceToProfile(id, {
    usbType: profile?.opts?.deviceToEmulate ?? proto.SubType.Gamepad,
  });
  return id;
}
