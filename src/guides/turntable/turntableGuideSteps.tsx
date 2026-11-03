import {
  IconAlertTriangle,
  IconCheck,
  IconDisc,
  IconInfoCircle,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { LiveAxis, LiveButtons, LiveInput } from '../adapters/adapterLiveStatus';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { InputTestRow } from '../components/InputTestRow';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { gpPin, gpWithPin, labelWithPin } from '../wiringText';
import {
  addPlatter,
  applyBasePinout,
  BASE_PINOUT,
  baseTarget,
  findPlatter,
  isBasePinoutApplied,
  PLATTER_SCL,
  PLATTER_SDA,
} from './turntableSetup';

const P = 'guides.dj-turntable.steps';

const BASE_COLORS: Record<string, string> = {
  crossfader: 'grape',
  effectsDial: 'violet',
  euphoria: 'yellow',
};

// Built once, as the pin pickers watch their target for changes
const BASE_ROWS = BASE_PINOUT.map((base) => ({
  base,
  target: baseTarget(base),
  color: BASE_COLORS[base.key] ?? 'teal',
}));

function platterInput(left: boolean, type: proto.DJHeroPlatterInputType) {
  return (m: proto.IMapping) => {
    const status = useConfigStore.getState().deviceStatus[m.input?.djhPlatter?.deviceid ?? ''];
    return (
      m.input?.djhPlatter?.type === type && (status?.device.djhTurntable?.left ?? true) === left
    );
  };
}

function usePlatterButtons(left: boolean): LiveInput[] {
  const { t } = useTranslation();
  const T = proto.DJHeroPlatterInputType;
  return [
    {
      label: t(`${P}.tt-wiring.btnGreen`),
      color: 'green',
      match: platterInput(left, T.DJHeroPlatterGreen),
    },
    {
      label: t(`${P}.tt-wiring.btnRed`),
      color: 'red',
      match: platterInput(left, T.DJHeroPlatterRed),
    },
    {
      label: t(`${P}.tt-wiring.btnBlue`),
      color: 'blue',
      match: platterInput(left, T.DJHeroPlatterBlue),
    },
  ];
}

function PlatterStatus({ left }: { left: boolean }) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const platter = useConfigStore((state) => findPlatter(state, left));
  const side = left ? t(`${P}.tt-wiring.leftPlatter`) : t(`${P}.tt-wiring.rightPlatter`);
  const C = 'guides.dj-turntable.check';
  const status = !connected
    ? t('guides.common.picoNotConnected')
    : !platter
      ? t(`${C}.platterNotAdded`)
      : platter.connected
        ? t(`${C}.platterConnected`)
        : t(`${C}.platterNotDetected`);
  return (
    <Badge
      size="lg"
      color={connected && platter?.connected ? 'grape' : 'gray'}
      variant="light"
      leftSection={<IconDisc size={16} />}
    >
      {side}: {status}
    </Badge>
  );
}

// Step 1: Supplies & Intro
// The platters' I2C pins: a platter's own once one is added, which can be changed on the wiring step,
// or the ones they're added with
function usePlatterPins() {
  const i2c = useConfigStore(
    (state) => (findPlatter(state, true) ?? findPlatter(state, false))?.device.djhTurntable?.i2c
  );
  return { sda: i2c?.sda ?? PLATTER_SDA, scl: i2c?.scl ?? PLATTER_SCL };
}

export function TurntableIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = usePlatterPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.tt-intro.intro`)}</Text>

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList iconColor="grape" items={t(`${P}.tt-intro.supplies`, { returnObjects: true })} />

      <Title order={4}>{t(`${P}.tt-intro.subsystemsTitle`)}</Title>
      <Text size="sm">{t(`${P}.tt-intro.subsystemsIntro`)}</Text>
      <GuideList
        boldAllIfNoColon={false}
        items={t(`${P}.tt-intro.subsystems`, { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.tt-intro.pinoutTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.tt-intro.pinoutDesc`)}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`${P}.tt-intro.thFeature`)}</Table.Th>
                <Table.Th>{t('guides.common.thPicoPin')}</Table.Th>
                <Table.Th>{t('guides.common.thType')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>{t(`${P}.tt-intro.featurePlatterSda`)}</Table.Td>
                <Table.Td>{gpPin(pins.sda)}</Table.Td>
                <Table.Td>{t(`${P}.tt-intro.typeI2cData`)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t(`${P}.tt-intro.featurePlatterScl`)}</Table.Td>
                <Table.Td>{gpPin(pins.scl)}</Table.Td>
                <Table.Td>{t(`${P}.tt-intro.typeI2cClock`)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t(`${P}.tt-intro.featurePlatterPower`)}</Table.Td>
                <Table.Td>
                  {labelWithPin('3V3(OUT)', 36)}, {labelWithPin('GND', 38)}
                </Table.Td>
                <Table.Td>{t(`${P}.tt-intro.typePower`)}</Table.Td>
              </Table.Tr>
              {BASE_PINOUT.map((base) => (
                <Table.Tr key={base.key}>
                  <Table.Td>{t(`${P}.tt-intro.base.${base.key}`)}</Table.Td>
                  <Table.Td>{gpWithPin(base.pin, base.physicalPin)}</Table.Td>
                  <Table.Td>
                    {base.analog
                      ? t(`${P}.tt-intro.typeAnalog`, { adc: base.pin - 26 })
                      : t(`${P}.tt-intro.typeDigital`)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.tt-intro.title`)}
      badge={t(`${P}.tt-intro.badge`)}
      badgeColor="grape"
      description={t(`${P}.tt-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function PlatterSetup({ left }: { left: boolean }) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const platter = useConfigStore((state) => findPlatter(state, left));
  const i2c = platter?.device.djhTurntable?.i2c;
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" fw={600}>
        {left ? t(`${P}.tt-wiring.leftPlatter`) : t(`${P}.tt-wiring.rightPlatter`)}
      </Text>
      {platter ? (
        <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
          {t(`${P}.tt-wiring.platterAdded`, { sda: i2c?.sda, scl: i2c?.scl })}
        </Badge>
      ) : (
        <Button
          size="xs"
          color="grape"
          leftSection={<IconPlugConnected size={14} />}
          disabled={!connected}
          onClick={() => addPlatter(left)}
        >
          {t(`${P}.tt-wiring.addPlatterBtn`)}
        </Button>
      )}
    </Group>
  );
}

// Step 2: Wiring
export function TurntableWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = usePlatterPins();
  const connected = useConfigStore((state) => state.connected);
  const baseApplied = useConfigStore(isBasePinoutApplied);
  const leftButtons = usePlatterButtons(true);
  const rightButtons = usePlatterButtons(false);
  const T = proto.DJHeroPlatterInputType;
  const leftVelocity: LiveInput = {
    label: t(`${P}.tt-wiring.leftPlatter`),
    color: 'grape',
    match: platterInput(true, T.DJHeroPlatterVelocity),
  };
  const rightVelocity: LiveInput = {
    label: t(`${P}.tt-wiring.rightPlatter`),
    color: 'grape',
    match: platterInput(false, T.DJHeroPlatterVelocity),
  };

  const guideContent = (
    <Stack gap="md">
      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.tt-wiring.removeBoardTitle`)}
      >
        {t(`${P}.tt-wiring.removeBoardText`)}
      </Alert>

      <Stack gap={4}>
        <Image
          src="/guides/dj-turntable-mainboard.jpg"
          radius="md"
          alt={t(`${P}.tt-wiring.mainBoardPhotoCaption`)}
        />
        <Text size="xs" c="dimmed" ta="center">
          {t(`${P}.tt-wiring.mainBoardPhotoCaption`)}
        </Text>
      </Stack>

      <Title order={4}>{t(`${P}.tt-wiring.wiringTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.tt-wiring.wiringSteps`, { returnObjects: true, ...pins })}
      />
      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.tt-wiring.orientationTitle`)}
      >
        {t(`${P}.tt-wiring.orientationText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.tt-wiring.setupTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.tt-wiring.setupDesc`, pins)}
          </Text>
          <PlatterSetup left />
          <PlatterSetup left={false} />
          {baseApplied ? (
            <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
              {t(`${P}.tt-wiring.baseApplied`)}
            </Badge>
          ) : (
            <Button
              size="xs"
              color="grape"
              variant="light"
              disabled={!connected}
              onClick={applyBasePinout}
            >
              {t(`${P}.tt-wiring.applyBaseBtn`)}
            </Button>
          )}
        </Stack>
      </Card>
      {/* The platters' pins, which can be changed here once they're added */}
      <GuideDeviceEditor kind="djhTurntable" />

      <Text fw={700} size="sm">
        {t(`${P}.tt-wiring.testBenchTitle`)}
      </Text>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t(`${P}.tt-wiring.platterButtonsHeader`)}
          </Text>
          <Group gap="xs">
            <Text size="xs" w={60}>
              {t(`${P}.tt-wiring.leftPlatter`)}
            </Text>
            <LiveButtons inputs={leftButtons} />
          </Group>
          <Group gap="xs">
            <Text size="xs" w={60}>
              {t(`${P}.tt-wiring.rightPlatter`)}
            </Text>
            <LiveButtons inputs={rightButtons} />
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t(`${P}.tt-wiring.scratchHeader`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.tt-wiring.scratchDesc`)}
          </Text>
          <LiveAxis input={leftVelocity} notMappedLabel={t(`${P}.tt-wiring.notMapped`)} />
          <LiveAxis input={rightVelocity} notMappedLabel={t(`${P}.tt-wiring.notMapped`)} />
        </Stack>
      </Paper>

      <Text fw={700} size="sm">
        {t(`${P}.tt-wiring.baseControlsHeader`)}
      </Text>
      <Text size="xs" c="dimmed">
        {t(`${P}.tt-wiring.baseControlsDesc`)}
      </Text>
      {BASE_ROWS.map(({ base, target, color }) => (
        <InputTestRow
          key={base.key}
          label={t(`${P}.tt-intro.base.${base.key}`)}
          target={target}
          color={color}
          recommendedPin={base.pin}
          isAnalog={base.analog}
        />
      ))}
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.tt-wiring.title`)}
      badge={t(`${P}.tt-wiring.badge`)}
      badgeColor="grape"
      description={t(`${P}.tt-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the Pico sees each platter, and how to check scratching, shown alongside the test step
export function TurntableCheck() {
  const { t } = useTranslation();
  const C = 'guides.dj-turntable.check';
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <PlatterStatus left />
      <PlatterStatus left={false} />
      <Text size="sm" fw={600} mt="xs">
        {t(`${C}.scratchTestTitle`)}
      </Text>
      <Text size="xs">{t(`${C}.scratchTestText`)}</Text>
    </Stack>
  );
}
