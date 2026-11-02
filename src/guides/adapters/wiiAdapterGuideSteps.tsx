import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Group, Image, Stack, Table, Text, Title } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { gpPin, IMAGE_ALT, pinWithLabel, signalWithName } from '../wiringText';

// The Wii extension's I2C pins: the driver's own once it's added, which can be changed on the wiring
// step, or the ones it's added with
function useWiiPins() {
  const i2c = useConfigStore((state) => findDeviceStatus(state, 'wii')?.device.wii?.i2c);
  return { sda: i2c?.sda ?? 18, scl: i2c?.scl ?? 19 };
}

// Adds the Wii extension driver on GP18 / GP19 unless it's already there
function ensureWiiDevice() {
  const existing = findDeviceStatus(useConfigStore.getState(), 'wii');
  return (
    existing?.id ??
    useConfigStore.getState().addDevice('wii', undefined, (device) => {
      device.wii!.i2c = { ...device.wii!.i2c, sda: 18, scl: 19, block: 1 };
    })
  );
}

// Step 1: Overview
export function WiiIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useWiiPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.wii-adapter.steps.wii-intro.intro')}</Text>

      <Image src="/guides/wii/adaptor.jpg" radius="md" alt={t(`${IMAGE_ALT}.wiiAdapter`)} />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.wii-adapter.steps.wii-intro.adapterCaption')}
      </Text>

      <Title order={4}>{t('guides.wii-adapter.steps.wii-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="cyan"
        items={t('guides.wii-adapter.steps.wii-intro.supplies', { returnObjects: true })}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.wii-adapter.steps.wii-intro.noDisassemblyTitle')}
      >
        {t('guides.wii-adapter.steps.wii-intro.noDisassemblyText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.wii-adapter.steps.wii-intro.quickStartTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.wii-adapter.steps.wii-intro.quickStartDesc')}
          </Text>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thWiiPin')}</Table.Th>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thPicoPin')}</Table.Th>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thFunction')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    3.3V (VCC)
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithLabel(36, '3V3 OUT')}</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithLabel(38, 'GND')}</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnGround')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    {signalWithName('SDA', 'data')}
                  </Badge>
                </Table.Td>
                <Table.Td>{gpPin(pins.sda)}</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    {signalWithName('SCL', 'clock')}
                  </Badge>
                </Table.Td>
                <Table.Td>{gpPin(pins.scl)}</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnClock')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.wii-adapter.steps.wii-intro.title')}
      badge={t('guides.wii-adapter.steps.wii-intro.badge')}
      badgeColor="cyan"
      description={t('guides.wii-adapter.steps.wii-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring
export function WiiWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  // config.devices is only rebuilt on connect, so read live devices from deviceStatus
  const wiiDevice = useConfigStore((state) => findDeviceStatus(state, 'wii'));
  const i2c = wiiDevice?.device.wii?.i2c;
  const pins = useWiiPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.wii-adapter.steps.wii-wiring.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image
            src="/guides/wii/wii-ext.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.wiiExtSocketPins`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.wii-adapter.steps.wii-wiring.socketCaption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image
            src="/guides/wii/wii-ext-pinout.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.wiiExtPlugPinout`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.wii-adapter.steps.wii-wiring.plugCaption', pins)}
          </Text>
        </Stack>
      </Group>

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.wii-adapter.steps.wii-wiring.voltageWarningTitle')}
      >
        {t('guides.wii-adapter.steps.wii-wiring.voltageWarningText')}
      </Alert>

      <Alert
        color="orange"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.wii-adapter.steps.wii-wiring.wireColorWarningTitle')}
      >
        {t('guides.wii-adapter.steps.wii-wiring.wireColorWarningText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.wii-adapter.steps.wii-wiring.deviceStatusTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.wii-adapter.steps.wii-wiring.deviceStatusDesc', pins)}
          </Text>

          {/* Profiles for each extension are made in a step of their own */}
          {wiiDevice ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.wii-adapter.steps.wii-wiring.driverConfiguredBadge', {
                sda: i2c?.sda,
                scl: i2c?.scl,
              })}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconPlugConnected size={16} />}
              onClick={ensureWiiDevice}
              disabled={!connected}
            >
              {t('guides.wii-adapter.steps.wii-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins, which can be changed here once it's added, and the wiring above follows them */}
      <GuideDeviceEditor kind="wii" />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.wii-adapter.steps.wii-wiring.title')}
      badge={t('guides.wii-adapter.steps.wii-wiring.badge', pins)}
      badgeColor="blue"
      description={t('guides.wii-adapter.steps.wii-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the driver up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !wiiDevice) {
          ensureWiiDevice();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees the Wii extension, shown alongside the test step
export function WiiCheck() {
  const { t } = useTranslation();
  const C = 'guides.wii-adapter.check';
  const connected = useConfigStore((state) => state.connected);
  const wiiDevice = useConfigStore((state) => findDeviceStatus(state, 'wii'));
  const extType = wiiDevice?.wiiExtType ?? proto.WiiExtType.WiiNoExtension;
  const extDetected =
    connected &&
    !!wiiDevice &&
    extType !== proto.WiiExtType.WiiNoExtension &&
    extType !== proto.WiiExtType.WiiNotInitialised;
  const label = !connected
    ? t(`${C}.picoNotConnected`)
    : !wiiDevice
      ? t(`${C}.driverMissing`)
      : extDetected
        ? t(`${C}.extDetected`, { type: t(`wiiExt.${proto.WiiExtType[extType]}`) })
        : t(`${C}.extNone`);
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Badge
        size="lg"
        color={extDetected ? 'teal' : 'gray'}
        variant="light"
        leftSection={<IconPlugConnected size={16} />}
        tt="none"
      >
        {label}
      </Badge>
      <Text size="xs" c="dimmed">
        {t(`${C}.prompt`)}
      </Text>
    </Stack>
  );
}
