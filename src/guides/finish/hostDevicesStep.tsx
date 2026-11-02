import { useEffect, useRef, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Group, Paper, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { StepActions } from '../components/StepActions';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { PlugIn } from '../setup/setupPath';
import { GuideStepProps } from '../types';
import {
  addGamepadNavigation,
  addHostDeviceProfiles,
  BT_DEVICES,
  devicesWithProfiles,
  hasGamepadNavigation,
  HostDevice,
  MIDI_DEVICES,
  MIDI_DRUMS,
  midiDrumsProfile,
  PS2_DEVICES,
  USB_DEVICES,
  WII_DEVICES,
  XBOX360_RF_DEVICES,
} from './hostDevicesSetup';
import { useFinishText } from './text';

// Which controllers plug into the board, over USB or MIDI. A slot only matches its own kind of
// controller, so each kind ticked gets a profile, and kinds that already have one stay ticked.
export function HostDevicesStep({ plugIn, ...props }: GuideStepProps & { plugIn: PlugIn }) {
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles);
  const hasUsbHost = useConfigStore((state) => !!findDeviceStatus(state, 'usbHost'));
  const connected = useConfigStore((state) => state.connected);
  const have = devicesWithProfiles(profiles);
  const [picked, setPicked] = useState<string[]>([]);
  const [gamepad, setGamepad] = useState(false);
  const H = 'guides.finish.hostDevices';
  const usb = plugIn === 'usb';
  const groups = {
    usb: [
      { key: 'usb', devices: USB_DEVICES },
      { key: 'midiOverUsb', devices: MIDI_DEVICES },
    ],
    midi: [{ key: 'midi', devices: MIDI_DEVICES }],
    wii: [{ key: 'wii', devices: WII_DEVICES }],
    ps2: [{ key: 'ps2', devices: PS2_DEVICES }],
    bluetooth: [{ key: 'bluetooth', devices: BT_DEVICES }],
    xbox360rf: [{ key: 'xbox360rf', devices: XBOX360_RF_DEVICES }],
  }[plugIn];
  const adding = groups
    .flatMap((group) => group.devices)
    .filter((device) => picked.includes(device.key));
  // A gamepad for menus only goes with a MIDI drum kit, which the adapters don't offer
  const midi = plugIn === 'usb' || plugIn === 'midi';
  const drumsIdx = midi ? midiDrumsProfile(profiles) : -1;
  const drumsComing = drumsIdx !== -1 || picked.includes(MIDI_DRUMS.key);
  const navigationDone = drumsIdx !== -1 && hasGamepadNavigation(profiles?.[drumsIdx]);

  const apply = () => {
    addHostDeviceProfiles(adding);
    // The drum kit's profile may only exist now
    const idx = midiDrumsProfile(useConfigStore.getState().config.profiles);
    if (gamepad && idx !== -1) {
      addGamepadNavigation(idx);
    }
    setPicked([]);
    setGamepad(false);
  };

  // Leaving the step any way, not just by Next (the step bar, Previous, another page), sets up
  // whatever's still ticked, so it isn't lost. Profiles that already exist are skipped, so running
  // it again after Next does nothing.
  const leave = useRef(() => {});
  leave.current = () => {
    if (
      useConfigStore.getState().connected &&
      (adding.length > 0 || (gamepad && !navigationDone))
    ) {
      apply();
    }
  };
  useEffect(() => () => leave.current(), []);

  const card = (device: HostDevice) => (
    <Checkbox.Card
      key={device.key}
      value={device.key}
      radius="md"
      p="sm"
      disabled={have.has(device.key)}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <Group gap="sm" wrap="nowrap">
        <Checkbox.Indicator disabled={have.has(device.key)} />
        <div>
          <Text size="sm" fw={600}>
            {t(device.label ?? `subType.${proto.SubType[device.type]}`)}
          </Text>
          {have.has(device.key) && (
            <Text size="xs" c="dimmed">
              {t(`${H}.haveProfile`)}
            </Text>
          )}
        </div>
      </Group>
    </Checkbox.Card>
  );

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${H}.intro`)}</Text>
      <Checkbox.Group
        value={[...picked, ...have]}
        onChange={(value) => setPicked(value.filter((key) => !have.has(key)))}
      >
        <Stack gap="md">
          {groups.map(({ key, devices }) => (
            <div key={key}>
              {groups.length > 1 && (
                <Text size="sm" fw={700} mb="xs">
                  {t(`${H}.groups.${key}`)}
                </Text>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                {devices.map(card)}
              </SimpleGrid>
            </div>
          ))}
        </Stack>
      </Checkbox.Group>
      {drumsComing && (
        <Paper withBorder radius="md" p="md">
          <Switch
            label={t(`${H}.gamepad.label`)}
            description={t(hasUsbHost ? `${H}.gamepad.description` : `${H}.gamepad.needsUsbHost`)}
            checked={navigationDone || gamepad}
            disabled={navigationDone || !hasUsbHost}
            onChange={(event) => setGamepad(event.currentTarget.checked)}
          />
        </Paper>
      )}
      {/* Only a USB port can have several of the same kind plugged in, through a hub */}
      {usb && (
        <Text size="sm" c="dimmed">
          {t(`${H}.copies`)}
        </Text>
      )}
      <StepActions>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            disabled={adding.length === 0 && !(gamepad && !navigationDone)}
            onClick={apply}
          >
            {t(`${H}.apply`)}
          </Button>
        </Group>
      </StepActions>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useFinishText('hostDevices')}
      // Moving on sets up whatever's ticked, so it isn't lost by missing the button
      onNext={() => {
        if (connected && (adding.length > 0 || (gamepad && !navigationDone))) {
          apply();
        }
        props.onNext?.();
      }}
      guideContent={guideContent}
    />
  );
}
