import { IconAlertTriangle, IconBluetooth, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Group, Stack, Table, Text, Title } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { ensureUsbHostDevice, usbHostPins } from '../usb/usbHostUtils';
import { BoardPicker } from '../wireless/wirelessGuideSteps';
import { useWirelessBoard } from '../wireless/wirelessSetup';
import { gpPin } from '../wiringText';
import {
  connectedBluetoothControllers,
  ensureBluetoothDevice,
  findBluetooth,
  PAIRING_FAMILIES,
} from './btReceiverSetup';

const P = 'guides.bt-receiver.steps';
const strong = { strong: <strong /> };

// Step 1: What it does and what's needed
export function BtReceiverIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.bt-intro.intro`)}</Text>
      <Title order={4}>{t(`${P}.bt-intro.controllersTitle`)}</Title>
      <GuideList items={t(`${P}.bt-intro.controllers`, { returnObjects: true })} />
      <Title order={4}>{t(`${P}.bt-intro.suppliesTitle`)}</Title>
      <GuideList iconColor="teal" items={t(`${P}.bt-intro.supplies`, { returnObjects: true })} />
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      title={t(`${P}.bt-intro.title`)}
      description={t(`${P}.bt-intro.description`)}
      guideContent={guideContent}
    />
  );
}

// Step 2: The radio, either the Pico W's own or a USB adapter on a USB host port
export function BtReceiverHardwareStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const H = `${P}.bt-hardware`;
  const board = useWirelessBoard((state) => state.board);
  const connected = useConfigStore((state) => state.connected);
  const bluetooth = useConfigStore(findBluetooth);
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const pins = usbHostPins(usbHost?.device.usbHost);
  const dongle = board === 'plain';
  const ready = !!bluetooth && (!dongle || !!usbHost);

  const add = () => {
    if (dongle) {
      ensureUsbHostDevice();
    }
    ensureBluetoothDevice();
  };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${H}.intro`)}</Text>
      <BoardPicker
        plainNote={
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
            {t(`${H}.plainNote`)}
          </Alert>
        }
      />
      {board === 'wireless' && <Text size="sm">{t(`${H}.wirelessText`)}</Text>}
      {dongle && (
        <>
          <Title order={4}>{t(`${H}.dongleTitle`)}</Title>
          <GuideList
            type="ordered"
            items={t('guides.usb-host.steps.usb-wiring.wiringSteps', {
              returnObjects: true,
              dp: gpPin(pins.dp),
              dm: gpPin(pins.dm),
            })}
          />
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Trans i18nKey={`${H}.dongleSupport`} components={strong} />
          </Alert>
        </>
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${H}.driverTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(dongle ? `${H}.driverDescDongle` : `${H}.driverDesc`)}
          </Text>
          {ready ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t(`${H}.driverAdded`)}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconBluetooth size={16} />}
              onClick={add}
              disabled={!connected || board == null}
            >
              {t(dongle ? `${H}.addDriversBtn` : `${H}.addDriverBtn`)}
            </Button>
          )}
        </Stack>
      </Card>
      {/* The USB port's pins, which can be changed here once it's added */}
      {dongle && <GuideDeviceEditor kind="usbHost" />}
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      title={t(`${H}.title`)}
      description={t(`${H}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      // Moving on adds the drivers too, so they aren't missed by not pressing the button
      onNext={() => {
        if (connected && board != null && !ready) {
          add();
        }
        props.onNext?.();
      }}
    />
  );
}

// Step 3: Putting each kind of controller into pairing mode, then scanning for it
export function BtReceiverPairStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.bt-pair`;
  const bluetooth = useConfigStore(findBluetooth);

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        <Trans i18nKey={`${S}.intro`} components={strong} />
      </Text>
      <Table withTableBorder verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t(`${S}.controllerHeader`)}</Table.Th>
            <Table.Th>{t(`${S}.howHeader`)}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {PAIRING_FAMILIES.map((family) => (
            <Table.Tr key={family}>
              <Table.Td>
                <Text size="sm" fw={600}>
                  {t(`${S}.families.${family}.name`)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">
                  <Trans i18nKey={`${S}.families.${family}.how`} components={strong} />
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="sm" c="dimmed">
        {t(`${S}.reconnect`)}
      </Text>
    </Stack>
  );

  // The Bluetooth card from the Devices page, with its pairing button pin, scan and paired list
  const workbenchContent = bluetooth ? (
    <GuideDeviceEditor kind="bt" />
  ) : (
    <Text size="sm" c="dimmed">
      {t(`${S}.noDriver`)}
    </Text>
  );

  return (
    <StepWorkbench
      {...props}
      title={t(`${S}.title`)}
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
    />
  );
}

// The controllers connected over Bluetooth right now, shown alongside the test step
export function BtReceiverCheck() {
  const { t } = useTranslation();
  const C = 'guides.bt-receiver.check';
  const connected = useConfigStore((state) => state.connected);
  const bluetooth = useConfigStore(findBluetooth);
  const controllers = connectedBluetoothControllers(bluetooth);
  const status = !connected
    ? t('guides.common.picoNotConnected')
    : !bluetooth
      ? t(`${C}.driverMissing`)
      : !bluetooth.connected
        ? t(`${C}.noAdapter`)
        : controllers.length > 0
          ? t(`${C}.connectedCount`, { count: controllers.length })
          : t(`${C}.noControllers`);
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Badge
        size="lg"
        color={controllers.length > 0 ? 'teal' : bluetooth?.connected ? 'yellow' : 'gray'}
        variant="light"
        leftSection={<IconBluetooth size={16} />}
        tt="none"
      >
        {status}
      </Badge>
      {controllers.map((controller) => (
        <Group key={controller.id} justify="space-between" gap="xs">
          <Text size="sm">{controller.name || '-'}</Text>
          <Badge size="sm" variant="outline" tt="none">
            {controller.subtype === proto.SubType.Unknown
              ? t('devices.bluetooth_detecting_type')
              : t(`subType.${proto.SubType[controller.subtype]}`)}
          </Badge>
        </Group>
      ))}
      <Text size="xs" c="dimmed">
        {t(`${C}.prompt`)}
      </Text>
    </Stack>
  );
}
