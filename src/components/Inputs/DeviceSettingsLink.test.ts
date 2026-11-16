import { describe, expect, it, vi } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import type { DeviceStatus } from '@/components/SettingsContext/SettingsContext';
import { resolveInputDevice } from './DeviceSettingsLink';
import type { ProfileSlot } from './inputRegistry';

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: vi.fn(),
}));

const status = (id: string, type: string) =>
  ({ id, type, device: { deviceid: Number(id) } }) as DeviceStatus;

const slot = (deviceKind: string, slotId: number, items: proto.IProfileAssignmentInfo[] = []) =>
  ({ deviceKind, slotId, items, item: items[0] ?? {}, key: '', label: '' }) as ProfileSlot;

describe('resolveInputDevice', () => {
  it('reads a local input straight from its device id', () => {
    const accel = status('3', 'accelerometer');
    expect(
      resolveInputDevice(
        { accelerometer: { deviceid: 3, type: proto.AccelerometerInputType.AccelerometerX } },
        undefined,
        { 3: accel }
      )
    ).toBe(accel);
  });

  it('goes through the slot for a plugged in controller, not the colliding device id', () => {
    const matrix = status('1', 'matrix');
    const usb = status('2', 'usbHost');
    expect(
      resolveInputDevice({ usbButton: { deviceid: 1, button: {} } }, slot('usbHost', 1), {
        1: matrix,
        2: usb,
      })
    ).toBe(usb);
  });

  it('falls back to the input kind when the profile has no slot for it', () => {
    const wii = status('4', 'wii');
    expect(
      resolveInputDevice(
        { wiiButton: { deviceid: 0, button: proto.WiiButtonType.WiiButtonGuitarGreen } },
        undefined,
        { 4: wii }
      )
    ).toBe(wii);
  });

  it('links nothing when several devices could fill the slot', () => {
    expect(
      resolveInputDevice(
        { wiiButton: { deviceid: 0, button: proto.WiiButtonType.WiiButtonGuitarGreen } },
        slot('wii', 0),
        {
          4: status('4', 'wii'),
          5: status('5', 'wii'),
        }
      )
    ).toBeUndefined();
  });

  it('uses the device a MIDI slot names', () => {
    const serial = status('6', 'midiSerial');
    expect(
      resolveInputDevice(
        { midi: { deviceid: 0 } },
        slot('midi', 0, [{ midiChannel: 1, midiDevice: { deviceid: 6 } }]),
        { 6: serial, 7: status('7', 'usbHost') }
      )
    ).toBe(serial);
  });

  it('links nothing for a MIDI slot that takes any device', () => {
    expect(
      resolveInputDevice({ midi: { deviceid: 0 } }, slot('midi', 0, [{ midiChannel: 1 }]), {
        6: status('6', 'midiSerial'),
      })
    ).toBeUndefined();
  });
});
