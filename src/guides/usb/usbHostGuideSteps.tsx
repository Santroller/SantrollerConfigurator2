import { IconAlertTriangle, IconCheck, IconPlugConnected, IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Image, Stack, Table, Text, Title } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { gpPin, IMAGE_ALT, pinWithLabel } from '../wiringText';
import { ensureUsbHostDevice, usbHostPins } from './usbHostUtils';

// Step 1: Supplies & Intro
// The USB port's pins: the driver's own once it's added, which can be changed on the wiring step, or
// the ones it's added with
function useUsbHostPins() {
  return usbHostPins(useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost);
}

export function UsbHostIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useUsbHostPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.usb-host.steps.usb-intro.intro')}</Text>

      <Image src="/guides/usb/usb.svg" radius="md" alt={t(`${IMAGE_ALT}.usbHostCable`)} />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.usb-host.steps.usb-intro.cableCaption')}
      </Text>

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList
        iconColor="teal"
        items={t('guides.usb-host.steps.usb-intro.supplies', { returnObjects: true })}
      />

      {/* Boards with a USB-A host port already on them, which need a change before hotplug works */}
      <Alert
        color="yellow"
        variant="light"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.usb-host.steps.usb-intro.waveshareUsbATitle')}
      >
        <Stack gap="xs">
          <Text size="sm">{t('guides.usb-host.steps.usb-intro.waveshareUsbABody')}</Text>
          <Image
            src="/guides/usb/waveshare-rp2350-usb-a-r13.png"
            radius="md"
            maw={240}
            mx="auto"
            alt={t(`${IMAGE_ALT}.waveshareUsbAR13`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.usb-host.steps.usb-intro.waveshareUsbACaption')}
          </Text>
        </Stack>
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.usb-host.steps.usb-intro.pinoutTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.usb-host.steps.usb-intro.pinoutDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.usb-host.steps.usb-intro.thWireColor')}</Table.Th>
                <Table.Th>{t('guides.usb-host.steps.usb-intro.thUsbSignal')}</Table.Th>
                <Table.Th>{t('guides.common.thPicoPin')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    {t('guides.usb-host.steps.usb-intro.colorRed')}
                  </Badge>
                </Table.Td>
                <Table.Td>VBUS (5V)</Table.Td>
                <Table.Td>{pinWithLabel(40, 'VBUS')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    {t('guides.usb-host.steps.usb-intro.colorBlack')}
                  </Badge>
                </Table.Td>
                <Table.Td>GND</Table.Td>
                <Table.Td>{pinWithLabel(38, 'GND')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="green" size="xs">
                    {t('guides.usb-host.steps.usb-intro.colorGreen')}
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.usb-host.steps.usb-intro.signalDPlus')}</Table.Td>
                <Table.Td>{gpPin(pins.dp)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    {t('guides.usb-host.steps.usb-intro.colorWhite')}
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.usb-host.steps.usb-intro.signalDMinus')}</Table.Td>
                <Table.Td>{gpPin(pins.dm)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.usb-host.steps.usb-intro.title')}
      badge={t('guides.usb-host.steps.usb-intro.badge')}
      badgeColor="teal"
      description={t('guides.usb-host.steps.usb-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring & Configuration
export function UsbHostWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost;
  const pins = usbHostPins(usbHost);

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.common.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.usb-host.steps.usb-wiring.wiringSteps', {
          returnObjects: true,
          dp: gpPin(pins.dp),
          dm: gpPin(pins.dm),
        })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.usb-host.steps.usb-wiring.driverConfigTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {/* A later step makes a profile for each kind of controller */}
            {t('guides.usb-host.steps.usb-wiring.driverConfigDesc', pins)}
          </Text>

          {usbHost ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.usb-host.steps.usb-wiring.driverConfiguredBadge', pins)}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconUsb size={16} />}
              onClick={ensureUsbHostDevice}
              disabled={!connected}
            >
              {t('guides.usb-host.steps.usb-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="usbHost" />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.usb-host.steps.usb-wiring.title')}
      badge={t('guides.usb-host.steps.usb-wiring.badge')}
      badgeColor="blue"
      description={t('guides.usb-host.steps.usb-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the driver up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !usbHost) {
          ensureUsbHostDevice();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees anything plugged into its USB port, shown alongside the test step
export function UsbHostCheck() {
  const { t } = useTranslation();
  const C = 'guides.usb-host.check';
  const connected = useConfigStore((state) => state.connected);
  const usbHostStatus = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const detectedCount = Object.keys(usbHostStatus?.usbDevices ?? {}).length;
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      {!usbHostStatus ? (
        <Badge size="lg" color="gray" variant="light" leftSection={<IconUsb size={16} />} tt="none">
          {t(`${C}.notConfiguredBadge`)}
        </Badge>
      ) : connected && detectedCount > 0 ? (
        <Badge
          size="lg"
          color="teal"
          variant="light"
          leftSection={<IconPlugConnected size={16} />}
          tt="none"
        >
          {t(`${C}.detectedBadge`, { count: detectedCount })}
        </Badge>
      ) : (
        <Badge
          size="lg"
          color="yellow"
          variant="light"
          leftSection={<IconUsb size={16} />}
          tt="none"
        >
          {t(`${C}.waitingBadge`)}
        </Badge>
      )}
      <Text size="xs" c="dimmed">
        {!usbHostStatus
          ? t(`${C}.notConfiguredPrompt`)
          : connected
            ? t(`${C}.verifyPrompt`)
            : t(`${C}.connectPrompt`)}
      </Text>
    </Stack>
  );
}
