import type { ReactNode } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Anchor, Group, Paper, Text } from '@mantine/core';
import {
  DEFAULT_TURNTABLE_POLL_INTERVAL_MS,
  DEFAULT_WII_POLL_INTERVAL_MS,
} from '@/components/Devices/deviceDefaults';
import { deviceHref } from '@/components/Devices/deviceLink';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore, type DeviceStatus } from '@/components/SettingsContext/SettingsContext';
import type { ProfileSlot } from './inputRegistry';
import { getInputLocalDeviceId, getInputSlotKind } from './slotRemap';

type DeviceSummary = {
  // What each setting is currently set to
  items: string[];
  // Shown instead when items is empty, eg to point out settings that are all turned off
  empty?: string;
};

// The firmware filters acceleration only; the LIS3DH ADCs and the gyro are passed through
const filteredAccelerometerTypes = new Set<proto.AccelerometerInputType>([
  proto.AccelerometerInputType.AccelerometerX,
  proto.AccelerometerInputType.AccelerometerY,
  proto.AccelerometerInputType.AccelerometerZ,
  proto.AccelerometerInputType.AccelerometerMotionX,
  proto.AccelerometerInputType.AccelerometerMotionY,
  proto.AccelerometerInputType.AccelerometerMotionZ,
]);

// Settings on a device that change what its mappings read. They're shared by every profile so
// they live on the device, which makes them easy to miss from a mapping. Devices without an entry
// here (or that return null for this input) just get a link
const deviceSummaries: Partial<
  Record<string, (device: proto.IDevice, input: proto.IInput, t: TFunction) => DeviceSummary | null>
> = {
  accelerometer: ({ accelerometer }, input, t) => {
    if (
      !accelerometer ||
      input.accelerometer?.type == null ||
      !filteredAccelerometerTypes.has(input.accelerometer.type)
    ) {
      return null;
    }
    return {
      items: [
        accelerometer.gateTolerance != null &&
          t('deviceSettings.accelerometer.gate', { tolerance: accelerometer.gateTolerance }),
        accelerometer.medianSamples != null &&
          t('deviceSettings.accelerometer.median', { samples: accelerometer.medianSamples }),
        accelerometer.lowPassCutoff != null &&
          t('deviceSettings.accelerometer.lowPass', { cutoff: accelerometer.lowPassCutoff }),
      ].filter((item): item is string => !!item),
      empty: t('deviceSettings.accelerometer.none'),
    };
  },
  encoder: ({ encoder }, _input, t) =>
    encoder
      ? {
          items: [
            t('deviceSettings.encoder.divisor', { divisor: encoder.divisor || 1 }),
            t('deviceSettings.encoder.deltaRate', { rate: encoder.deltaRate || 0 }),
          ],
        }
      : null,
  djhTurntable: ({ djhTurntable }, _input, t) =>
    djhTurntable
      ? {
          items: [
            t('deviceSettings.pollInterval', {
              ms: djhTurntable.pollIntervalMs ?? DEFAULT_TURNTABLE_POLL_INTERVAL_MS,
            }),
          ],
        }
      : null,
  // The interval between reads of the plugged in controller
  wii: ({ wii }, _input, t) =>
    wii
      ? {
          items: [
            t('deviceSettings.pollInterval', {
              ms: wii.turntablePollIntervalMs ?? DEFAULT_WII_POLL_INTERVAL_MS,
            }),
          ],
        }
      : null,
  multiplexer: ({ multiplexer }, _input, t) =>
    multiplexer
      ? {
          items: [
            multiplexer.slow
              ? t('deviceSettings.multiplexer.slow')
              : t('deviceSettings.multiplexer.fast'),
          ],
        }
      : null,
  // The thresholds are per pad and read from the drum itself, so only say where they are
  crkdDrum: (_device, _input, t) => ({ items: [], empty: t('deviceSettings.crkdDrum') }),
};

// The device an input reads from. Inputs from a controller plugged into a device (Wii, PS2, USB
// host, Bluetooth, MIDI...) hold a profile slot id instead of a device id, so those go through the
// slot to the device that fills it
export function resolveInputDevice(
  input: proto.IInput,
  slot: ProfileSlot | undefined,
  deviceStatus: Record<string, DeviceStatus>
): DeviceStatus | undefined {
  const localId = getInputLocalDeviceId(input);
  if (localId != null) {
    return deviceStatus[localId.toString()];
  }
  let kind = slot?.deviceKind ?? getInputSlotKind(input);
  if (kind === 'midi') {
    // A MIDI channel takes any MIDI device unless the slot names one
    const source = slot?.items.find((item) => item.midiDevice)?.midiDevice;
    if (source?.deviceid != null) {
      return deviceStatus[source.deviceid.toString()];
    }
    kind =
      source?.usbDevice || source?.usbHost
        ? 'usbHost'
        : source?.bluetoothDevice || source?.bluetooth
          ? 'bt'
          : undefined;
  }
  if (!kind) {
    return undefined;
  }
  // With several devices of the kind, whichever has a controller plugged in fills the slot, so
  // there's no single device to point at
  const candidates = Object.values(deviceStatus).filter((status) => status.type === kind);
  return candidates.length === 1 ? candidates[0] : undefined;
}

// Shown under a mapping's source: a link to the source's device card, next to the help for the
// source, and what the device's settings that change this input's readings are set to
export function DeviceSettingsLink({
  input,
  slot,
  help,
}: {
  input: proto.IInput;
  slot?: ProfileSlot;
  help?: ReactNode;
}) {
  const { t } = useTranslation();
  // Returns a status already in the store, so this only re-renders when that device changes
  const status = useConfigStore((state) => resolveInputDevice(input, slot, state.deviceStatus));
  const device = status?.device ? status : undefined;
  const name = device && t(`devices.${device.type}`);
  const summary = device && deviceSummaries[device.type]?.(device.device, input, t);
  const summaryText = summary && (summary.items.length ? summary.items.join(' · ') : summary.empty);
  return (
    <>
      {/* Help stays put on the left whether or not there's a device to link */}
      <Group justify="space-between" align="center" gap="xs" mt={4}>
        {help}
        {device && (
          <Anchor component={Link} to={deviceHref(device.id, device.parentId)} size="xs" ml="auto">
            <Group gap={4} wrap="nowrap">
              {t('deviceSettings.edit', { device: name })}
              <IconArrowRight size={12} />
            </Group>
          </Anchor>
        )}
      </Group>
      {summaryText && (
        <Paper withBorder p="xs" radius="sm" mt="xs">
          <Text size="sm" fw={500}>
            {t('deviceSettings.title', { device: name })}
          </Text>
          <Text size="sm" c="dimmed">
            {summaryText}
          </Text>
        </Paper>
      )}
    </>
  );
}
