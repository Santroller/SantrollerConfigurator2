import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Image, Stack, Table, Text, Title } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { BrainStatusBadge } from '../bhdrums/bhDrumGuideSteps';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { gpPin } from '../wiringText';
import {
  addWtDrumDriver,
  findWtDrum,
  isWtDrumConfigured,
  WT_CONNECTOR,
  wtPins,
} from './wtDrumSetup';

const P = 'guides.wt-drums.steps';

// The driver's pins, which can be changed on the wiring step once it's added
function useWtPins() {
  return wtPins(useConfigStore((state) => findWtDrum(state)?.device.worldTourDrum));
}

function ConnectorTable({ withType }: { withType?: boolean }) {
  const { t } = useTranslation();
  const pins = useWtPins();
  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t(`${P}.wt-wiring.thConnector`)}</Table.Th>
          <Table.Th>{t(`${P}.wt-wiring.thPicoPin`)}</Table.Th>
          {withType && <Table.Th>{t(`${P}.wt-wiring.thType`)}</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {WT_CONNECTOR.map((pin) => (
          <Table.Tr key={pin.label}>
            <Table.Td>{pin.label}</Table.Td>
            <Table.Td>{pin.pico(pins)}</Table.Td>
            {withType && <Table.Td>{t(`${P}.wt-wiring.${pin.type}`)}</Table.Td>}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

// Step 1: Supplies & Overview
export function WtDrumIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.wt-intro.intro`)}</Text>

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.wt-intro.notPiezoTitle`)}
      >
        {t(`${P}.wt-intro.notPiezoText`)}
      </Alert>

      <Title order={4}>{t(`${P}.wt-intro.howTitle`)}</Title>
      <Text size="sm">{t(`${P}.wt-intro.howText`)}</Text>

      <Title order={4}>{t(`${P}.wt-intro.suppliesTitle`)}</Title>
      <GuideList iconColor="orange" items={t(`${P}.wt-intro.supplies`, { returnObjects: true })} />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.wt-intro.reversibleTitle`)}
      >
        {t(`${P}.wt-intro.reversibleText`)}
      </Alert>

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.wt-intro.buttonsTitle`)}
      >
        {t(`${P}.wt-intro.buttonsText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.wt-intro.pinoutTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.wt-intro.pinoutDesc`)}
        </Text>
        <ConnectorTable />
      </Stack>
    </Card>
  );

  return (
    <StepWorkbench
      title={t(`${P}.wt-intro.title`)}
      badge={t(`${P}.wt-intro.badge`)}
      badgeColor="orange"
      description={t(`${P}.wt-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function DriverSetup() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const drum = useConfigStore(findWtDrum);
  const configured = useConfigStore(isWtDrumConfigured);
  const device = drum?.device.worldTourDrum;
  const pins = useWtPins();
  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.wt-wiring.setupTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.wt-wiring.setupDesc`, { ...pins })}
        </Text>
        <ConnectorTable withType />
        {configured ? (
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${P}.wt-wiring.driverAdded`, {
              sck: device?.spi.sck,
              mosi: device?.spi.mosi,
              miso: device?.spi.miso,
              cs: device?.csPin,
            })}
          </Badge>
        ) : (
          <Button
            size="xs"
            color="orange"
            leftSection={<IconPlugConnected size={14} />}
            disabled={!connected}
            onClick={addWtDrumDriver}
          >
            {t(`${P}.wt-wiring.addDriverBtn`)}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

// Step 2: Wiring
export function WtDrumWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useWtPins();
  const connected = useConfigStore((state) => state.connected);
  const configured = useConfigStore(isWtDrumConfigured);

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Image
          src="/guides/drums/wt_mainboard.jpg"
          radius="md"
          alt={t(`${P}.wt-wiring.photoCaption`)}
        />
        <Text size="xs" c="dimmed" ta="center">
          {t(`${P}.wt-wiring.photoCaption`)}
        </Text>
      </Stack>

      <Title order={4}>{t(`${P}.wt-wiring.cableTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.wt-wiring.cableSteps`, {
          returnObjects: true,
          sckPin: gpPin(pins.sck),
          mosiPin: gpPin(pins.mosi),
          misoPin: gpPin(pins.miso),
          csPin: gpPin(pins.cs),
        })}
      />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.wt-wiring.leaveTitle`)}
      >
        {t(`${P}.wt-wiring.leaveText`)}
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.wt-wiring.title`)}
      badge={t(`${P}.wt-wiring.badge`)}
      badgeColor="orange"
      description={t(`${P}.wt-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={
        <Stack gap="sm">
          <DriverSetup />
          {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
          <GuideDeviceEditor kind="worldTourDrum" />
        </Stack>
      }
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the driver up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !configured) {
          addWtDrumDriver();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees the drums, shown alongside the test step
export function WtDrumCheck() {
  const { t } = useTranslation();
  const C = 'guides.wt-drums.check';
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <BrainStatusBadge prefix={C} findBrain={findWtDrum} />
      <Text size="sm" fw={600} mt="xs">
        {t(`${C}.tipsTitle`)}
      </Text>
      <Text size="xs">{t(`${C}.tipsText`)}</Text>
    </Stack>
  );
}
