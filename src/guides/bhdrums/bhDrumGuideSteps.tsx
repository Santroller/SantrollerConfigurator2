import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconMusic,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Image, Stack, Table, Text, Title } from '@mantine/core';
import {
  ConfigState,
  DeviceStatus,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { InputTestRow } from '../components/InputTestRow';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { gpPin, gpWithPin, labelWithPin } from '../wiringText';
import { addBhDrumDriver, BH_BUTTONS, BH_I2C, findBhDrum, isBhDrumConfigured } from './bhDrumSetup';

const P = 'guides.bh-drums.steps';

interface BrainLiveProps {
  // Translation prefix of the guide's check, which holds the status labels
  prefix: string;
}

/** Pico / driver / brain detection status for a MIDI drum brain device */
export function BrainStatusBadge({
  prefix,
  findBrain,
}: BrainLiveProps & { findBrain: (state: ConfigState) => DeviceStatus | undefined }) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const brain = useConfigStore(findBrain);
  const detected = connected && brain?.connected;
  const status = !connected
    ? t(`${prefix}.picoNotConnected`)
    : !brain
      ? t(`${prefix}.driverNotAdded`)
      : brain.connected
        ? t(`${prefix}.brainDetected`)
        : t(`${prefix}.brainNotDetected`);
  return (
    <Badge
      size="lg"
      color={detected ? 'teal' : brain && connected ? 'orange' : 'gray'}
      variant="light"
      leftSection={<IconMusic size={16} />}
      tt="none"
    >
      {status}
    </Badge>
  );
}

// Step 1: Supplies & Overview
// The brain's I2C pins: the driver's own once it's added, which can be changed on the wiring step,
// or the ones it's added with
function useBhPins() {
  const i2c = useConfigStore((state) => findBhDrum(state)?.device.bhDrum?.i2c);
  return { sda: i2c?.sda ?? BH_I2C.sda, scl: i2c?.scl ?? BH_I2C.scl };
}

export function BhDrumIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useBhPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.bh-intro.intro`)}</Text>

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.bh-intro.notPiezoTitle`)}
      >
        {t(`${P}.bh-intro.notPiezoText`)}
      </Alert>

      <Title order={4}>{t(`${P}.bh-intro.howTitle`)}</Title>
      <Text size="sm">{t(`${P}.bh-intro.howText`)}</Text>

      <Title order={4}>{t(`${P}.bh-intro.suppliesTitle`)}</Title>
      <GuideList iconColor="orange" items={t(`${P}.bh-intro.supplies`, { returnObjects: true })} />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.bh-intro.warningTitle`)}
      >
        {t(`${P}.bh-intro.warningText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.bh-intro.pinoutTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.bh-intro.pinoutDesc`, pins)}
        </Text>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t(`${P}.bh-intro.thBoardPad`)}</Table.Th>
              <Table.Th>{t(`${P}.bh-intro.thPicoPin`)}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>DATA</Table.Td>
              <Table.Td>{gpPin(pins.sda)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>CLK</Table.Td>
              <Table.Td>{gpPin(pins.scl)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>+V</Table.Td>
              <Table.Td>{labelWithPin('3V3(OUT)', 36)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>0V, BUTTON COM, BUT COM</Table.Td>
              <Table.Td>{labelWithPin('GND', 38)}</Table.Td>
            </Table.Tr>
            {BH_BUTTONS.map((button) => (
              <Table.Tr key={button.key}>
                <Table.Td>{button.pad}</Table.Td>
                <Table.Td>{gpWithPin(button.pin, button.physicalPin)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );

  return (
    <StepWorkbench
      title={t(`${P}.bh-intro.title`)}
      badge={t(`${P}.bh-intro.badge`)}
      badgeColor="orange"
      description={t(`${P}.bh-intro.description`)}
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
  const brain = useConfigStore(findBhDrum);
  const configured = useConfigStore(isBhDrumConfigured);
  const i2c = brain?.device.bhDrum?.i2c;
  const pins = useBhPins();
  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.bh-wiring.setupTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.bh-wiring.setupDesc`, pins)}
        </Text>
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t(`${P}.bh-wiring.thConnector`)}</Table.Th>
              <Table.Th>{t(`${P}.bh-wiring.thPicoPin`)}</Table.Th>
              <Table.Th>{t(`${P}.bh-wiring.thType`)}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>+V</Table.Td>
              <Table.Td>{labelWithPin('3V3(OUT)', 36)}</Table.Td>
              <Table.Td>{t(`${P}.bh-wiring.typePower`)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>CLK</Table.Td>
              <Table.Td>{gpPin(pins.scl)}</Table.Td>
              <Table.Td>{t(`${P}.bh-wiring.typeI2cClock`)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>DATA</Table.Td>
              <Table.Td>{gpPin(pins.sda)}</Table.Td>
              <Table.Td>{t(`${P}.bh-wiring.typeI2cData`)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>0V</Table.Td>
              <Table.Td>{labelWithPin('GND', 38)}</Table.Td>
              <Table.Td>{t(`${P}.bh-wiring.typeGround`)}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        {configured ? (
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${P}.bh-wiring.driverAdded`, { sda: i2c?.sda, scl: i2c?.scl })}
          </Badge>
        ) : (
          <Button
            size="xs"
            color="orange"
            leftSection={<IconPlugConnected size={14} />}
            disabled={!connected}
            onClick={addBhDrumDriver}
          >
            {t(`${P}.bh-wiring.addDriverBtn`)}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

// Step 2: Wiring
export function BhDrumWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useBhPins();
  const connected = useConfigStore((state) => state.connected);
  const configured = useConfigStore(isBhDrumConfigured);

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Image
          src="/guides/drums/bh_mainboard.jpg"
          radius="md"
          alt={t(`${P}.bh-wiring.photoCaption`)}
        />
        <Text size="xs" c="dimmed" ta="center">
          {t(`${P}.bh-wiring.photoCaption`)}
        </Text>
      </Stack>

      <Title order={4}>{t(`${P}.bh-wiring.brainTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.bh-wiring.brainSteps`, {
          returnObjects: true,
          sdaPin: gpPin(pins.sda),
          sclPin: gpPin(pins.scl),
        })}
      />

      <Title order={4}>{t(`${P}.bh-wiring.buttonsTitle`)}</Title>
      <GuideList type="ordered" items={t(`${P}.bh-wiring.buttonSteps`, { returnObjects: true })} />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.bh-wiring.leaveTitle`)}
      >
        {t(`${P}.bh-wiring.leaveText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <DriverSetup />
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="bhDrum" />

      <Text fw={700} size="sm">
        {t(`${P}.bh-wiring.buttonsHeader`)}
      </Text>
      <Text size="xs" c="dimmed">
        {t(`${P}.bh-wiring.buttonsDesc`)}
      </Text>
      {BH_BUTTONS.map((button) => (
        <InputTestRow
          key={button.key}
          label={`${t(`${P}.bh-wiring.button.${button.key}`)} (${button.pad})`}
          target={button.target}
          color={button.color}
          recommendedPin={button.pin}
        />
      ))}
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.bh-wiring.title`)}
      badge={t(`${P}.bh-wiring.badge`)}
      badgeColor="orange"
      description={t(`${P}.bh-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the driver up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !configured) {
          addBhDrumDriver();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees the drum brain, shown alongside the test step
export function BhDrumCheck() {
  const { t } = useTranslation();
  const pins = useBhPins();
  const C = 'guides.bh-drums.check';
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <BrainStatusBadge prefix={C} findBrain={findBhDrum} />
      <Text size="sm" fw={600} mt="xs">
        {t(`${C}.tipsTitle`)}
      </Text>
      <Text size="xs">{t(`${C}.tipsText`, pins)}</Text>
    </Stack>
  );
}
