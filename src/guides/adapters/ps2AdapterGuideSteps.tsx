import { IconAlertTriangle, IconCheck, IconPlugConnected } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Image, Stack, Table, Text, Title } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { gpPin, IMAGE_ALT, pinWithColour, pinWithLabel, withPullup } from '../wiringText';

// The PS2 controller's pins: the driver's own once it's added, which can be changed on the wiring
// step, or the ones it's added with
function usePs2Pins() {
  const psx = useConfigStore((state) => findDeviceStatus(state, 'psx')?.device.psx);
  return {
    mosi: psx?.spi?.mosi ?? 3,
    miso: psx?.spi?.miso ?? 4,
    sck: psx?.spi?.sck ?? 6,
    ack: psx?.ackPin ?? 7,
    att: psx?.attPin ?? 10,
  };
}

// Adds the PS2 controller driver unless it's already there
function ensurePs2Device() {
  const existing = findDeviceStatus(useConfigStore.getState(), 'psx');
  return (
    existing?.id ??
    useConfigStore.getState().addDevice('psx', undefined, (device) => {
      const psx = device.psx!;
      psx.spi = { ...psx.spi, mosi: 3, miso: 4, sck: 6, block: 0 };
      psx.ackPin = 7;
      psx.attPin = 10;
    })
  );
}

// Step 1: Supplies & Overview
export function PS2IntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = usePs2Pins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.ps2-adapter.steps.ps2-intro.intro')}</Text>

      <Stack gap={4}>
        <Image src="/guides/ps2/ps2-pinout.png" radius="md" alt={t(`${IMAGE_ALT}.ps2PlugPinout`)} />
        <Text size="xs" c="dimmed" ta="center">
          {t('guides.ps2-adapter.steps.ps2-intro.plugCaption')}
        </Text>
      </Stack>

      <Title order={4}>{t('guides.ps2-adapter.steps.ps2-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="blue"
        items={t('guides.ps2-adapter.steps.ps2-intro.supplies', { returnObjects: true })}
      />

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.ps2-adapter.steps.ps2-intro.logicLevelWarningTitle')}
      >
        {t('guides.ps2-adapter.steps.ps2-intro.logicLevelWarningText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.ps2-adapter.steps.ps2-intro.pinoutSummaryTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.ps2-adapter.steps.ps2-intro.pinoutSummaryDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.ps2-adapter.steps.ps2-intro.thSignal')}</Table.Th>
                <Table.Th>{t('guides.ps2-adapter.steps.ps2-intro.thPs2Pin')}</Table.Th>
                <Table.Th>{t('guides.ps2-adapter.steps.ps2-intro.thPicoPin')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="blue">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigSck')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(7, 'blue')}</Table.Td>
                <Table.Td>{gpPin(pins.sck)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="orange">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigMosi')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(2, 'orange')}</Table.Td>
                <Table.Td>{gpPin(pins.mosi)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="yellow">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigMiso')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(1, 'brown')}</Table.Td>
                <Table.Td>{withPullup(gpPin(pins.miso))}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="green">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigAck')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(9, 'green')}</Table.Td>
                <Table.Td>{withPullup(gpPin(pins.ack))}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="grape">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigAtt')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(6, 'yellow')}</Table.Td>
                <Table.Td>{gpPin(pins.att)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="red">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigPower')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(5, 'red')}</Table.Td>
                <Table.Td>{pinWithLabel(36, '3V3 OUT')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="gray">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigGnd')}
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithColour(4, 'black')}</Table.Td>
                <Table.Td>{pinWithLabel(38, 'GND')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.ps2-adapter.steps.ps2-intro.title')}
      badge={t('guides.ps2-adapter.steps.ps2-intro.badge')}
      badgeColor="blue"
      description={t('guides.ps2-adapter.steps.ps2-intro.description')}
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
export function PS2WiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = usePs2Pins();
  const connected = useConfigStore((state) => state.connected);
  // config.devices is only rebuilt on connect, so read live devices from deviceStatus
  const ps2Device = useConfigStore((state) => findDeviceStatus(state, 'psx'));
  const psx = ps2Device?.device.psx;

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.ps2-adapter.steps.ps2-wiring.solderingTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.ps2-adapter.steps.ps2-wiring.solderingSteps', {
          returnObjects: true,
          sck: gpPin(pins.sck),
          mosi: gpPin(pins.mosi),
          miso: gpPin(pins.miso),
          ack: gpPin(pins.ack),
          att: gpPin(pins.att),
          misoGp: pins.miso,
          ackGp: pins.ack,
        })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.ps2-adapter.steps.ps2-wiring.driverStatusTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.ps2-adapter.steps.ps2-wiring.driverStatusDesc')}
          </Text>

          {/* Profiles for each controller are made in a step of their own */}
          {ps2Device ? (
            <>
              <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
                {t('guides.ps2-adapter.steps.ps2-wiring.driverConfiguredBadge')}
              </Badge>
              <Text size="xs" c="dimmed">
                {t('guides.ps2-adapter.steps.ps2-wiring.driverPins', {
                  mosi: psx?.spi?.mosi,
                  miso: psx?.spi?.miso,
                  sck: psx?.spi?.sck,
                  ack: psx?.ackPin,
                  att: psx?.attPin,
                })}
              </Text>
            </>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconPlugConnected size={16} />}
              onClick={ensurePs2Device}
              disabled={!connected}
            >
              {t('guides.ps2-adapter.steps.ps2-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="psx" />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.ps2-adapter.steps.ps2-wiring.title')}
      badge={t('guides.ps2-adapter.steps.ps2-wiring.badge')}
      badgeColor="orange"
      description={t('guides.ps2-adapter.steps.ps2-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the driver up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !ps2Device) {
          ensurePs2Device();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees the PS2 controller, shown alongside the test step
export function Ps2Check() {
  const { t } = useTranslation();
  const C = 'guides.ps2-adapter.check';
  const connected = useConfigStore((state) => state.connected);
  const ps2Device = useConfigStore((state) => findDeviceStatus(state, 'psx'));
  const cntType = ps2Device?.ps2CntType ?? proto.PS2ControllerType.PS2ControllerTypeUnknown;
  const detected =
    connected && !!ps2Device && cntType !== proto.PS2ControllerType.PS2ControllerTypeUnknown;
  const label = !connected
    ? t(`${C}.picoNotConnected`)
    : !ps2Device
      ? t(`${C}.driverMissing`)
      : detected
        ? t(`${C}.controllerDetected`, { type: t(`ps2Cnt.${proto.PS2ControllerType[cntType]}`) })
        : t(`${C}.controllerNone`);
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Badge
        size="lg"
        color={detected ? 'teal' : 'gray'}
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
