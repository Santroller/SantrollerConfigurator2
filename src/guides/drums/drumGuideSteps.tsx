import React from 'react';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconMusic } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { IMAGE_ALT, PICO_PHYSICAL_PINS } from '../wiringText';
import {
  configureDrumMux,
  countMappedPads,
  DRUM_PADS,
  DrumFamily,
  drumFamily,
  DrumPad,
  findMux,
  MUX_CHIPS,
  MUX_COM_PIN,
  MUX_SELECT_PINS,
  MuxChip,
  padOutput,
  sameOutput,
} from './drumSetup';

const P = 'guides.drum-kit.steps';

// Hits only last a few milliseconds, so hold the highest reading long enough to see it
function usePeakHold(value: number, holdMs = 500) {
  const [peak, setPeak] = React.useState(0);
  React.useEffect(() => {
    setPeak((current) => Math.max(current, value));
  }, [value]);
  React.useEffect(() => {
    if (peak === 0) {
      return;
    }
    const timer = setTimeout(() => setPeak(0), holdMs);
    return () => clearTimeout(timer);
  }, [peak, holdMs]);
  return Math.max(peak, value);
}

function PadMonitor({ pad, family }: { pad: DrumPad; family: DrumFamily }) {
  const { t } = useTranslation();
  const output = padOutput(pad, family);
  const idx = useConfigStore((state) => {
    const mappings = state.config.profiles?.[state.currentProfile]?.mappings ?? [];
    return output ? mappings.findIndex((m) => sameOutput(m.mapping, output)) : -1;
  });
  const mapping = useConfigStore((state) =>
    idx === -1 ? undefined : state.config.profiles?.[state.currentProfile]?.mappings?.[idx]
  );
  const raw = useConfigStore((state) =>
    idx === -1 ? 0 : (state.mappingStatus[state.currentProfile]?.[idx]?.stateRaw ?? 0)
  );
  const value = usePeakHold(raw);
  const mux = mapping?.input?.multiplexer;
  const gpio = mapping?.input?.gpio;
  const source = !output
    ? t(`${P}.drum-wiring.padUnused`)
    : !mapping
      ? t(`${P}.drum-wiring.padNotMapped`)
      : mux
        ? t(`${P}.drum-wiring.padMuxChannel`, { channel: mux.channel })
        : gpio && gpio.pin != null && gpio.pin >= 0
          ? `GP${gpio.pin}`
          : t(`${P}.drum-wiring.padOtherInput`);

  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Group justify="space-between">
          <Badge color={pad.color} size="md" variant={mapping ? 'filled' : 'outline'}>
            {t(`${P}.drum-wiring.pad.${pad.key}`)}
          </Badge>
          <Text size="xs" c="dimmed">
            {source}
          </Text>
        </Group>
        <Progress value={(value / 65535) * 100} color={pad.color} size="sm" radius="xl" />
      </Stack>
    </Paper>
  );
}

function DrumHitMonitor() {
  const family = useConfigStore(drumFamily);
  return (
    <Stack gap="xs">
      {DRUM_PADS.map((pad) => (
        <PadMonitor key={pad.key} pad={pad} family={family} />
      ))}
    </Stack>
  );
}

// Step 1: Supplies & Intro
export function DrumIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.drum-intro.intro`)}</Text>

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.drum-intro.otherKitsTitle`)}
      >
        {t(`${P}.drum-intro.otherKitsText`)}
      </Alert>

      <Title order={4}>{t(`${P}.drum-intro.suppliesTitle`)}</Title>
      <GuideList
        iconColor="orange"
        items={t(`${P}.drum-intro.supplies`, { returnObjects: true })}
      />

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/drums/cd4051.png" radius="md" alt={t(`${IMAGE_ALT}.mux4051`)} />
          <Text size="xs" c="dimmed" ta="center">
            {t(`${P}.drum-intro.mux4051Caption`)}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image src="/guides/drums/cd4067.png" radius="md" alt={t(`${IMAGE_ALT}.mux4067`)} />
          <Text size="xs" c="dimmed" ta="center">
            {t(`${P}.drum-intro.mux4067Caption`)}
          </Text>
        </Stack>
      </Group>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.drum-intro.layoutTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.drum-intro.layoutDesc`)}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`${P}.drum-intro.thPad`)}</Table.Th>
                <Table.Th>{t(`${P}.drum-intro.thMuxChannel`)}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {DRUM_PADS.map((pad) => (
                <Table.Tr key={pad.key}>
                  <Table.Td>
                    <Badge color={pad.color} size="xs">
                      {t(`${P}.drum-wiring.pad.${pad.key}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {t(`${P}.drum-wiring.padMuxChannel`, { channel: pad.channel })}
                    {!pad.rb && ` (${t(`${P}.drum-intro.ghOnly`)})`}
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
      title={t(`${P}.drum-intro.title`)}
      badge={t(`${P}.drum-intro.badge`)}
      badgeColor="orange"
      description={t(`${P}.drum-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// The multiplexer's pins: its own once it's added, which can be changed on the wiring step, or the
// ones it's added with
function useMuxPins() {
  const mux = useConfigStore((state) => findMux(state)?.device.multiplexer);
  const com = mux?.inputPin ?? MUX_COM_PIN;
  const [s0, s1, s2] = [mux?.s0Pin, mux?.s1Pin, mux?.s2Pin].map(
    (pin, i) => pin ?? MUX_SELECT_PINS[i]
  );
  const s3 = mux?.s3Pin != null && mux.s3Pin >= 0 ? mux.s3Pin : MUX_SELECT_PINS[3];
  const physical = (pin: number) => PICO_PHYSICAL_PINS[pin];
  return {
    com,
    comPhysical: physical(com),
    s0,
    s1,
    s2,
    s3,
    s0Physical: physical(s0),
    s1Physical: physical(s1),
    s2Physical: physical(s2),
    s3Physical: physical(s3),
  };
}

// The multiplexer card's choices, kept by the step so moving on can set it up with them
function useMuxSetup() {
  const connected = useConfigStore((state) => state.connected);
  const profileFamily = useConfigStore(drumFamily);
  const mux = useConfigStore(findMux);
  const [family, setFamily] = React.useState<DrumFamily>(profileFamily);
  const [chip, setChip] = React.useState<MuxChip>(() => {
    const device = mux?.device.multiplexer;
    return (
      MUX_CHIPS.find((c) => c.sixteen === !!device?.sixteenChannel && c.slow === !!device?.slow)
        ?.value ?? '74hc4051'
    );
  });
  const mapped = useConfigStore((state) => countMappedPads(state, family));
  const total = DRUM_PADS.filter((pad) => padOutput(pad, family)).length;
  const done = !!mux && mapped === total && profileFamily === family;
  return {
    connected,
    profileFamily,
    mux,
    family,
    setFamily,
    chip,
    setChip,
    mapped,
    total,
    done,
    apply: () => configureDrumMux(family, chip),
  };
}

function MuxSetupCard({ setup }: { setup: ReturnType<typeof useMuxSetup> }) {
  const { t } = useTranslation();
  const pins = useMuxPins();
  const { connected, profileFamily, mux, family, setFamily, chip, setChip, mapped, total } = setup;

  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.drum-wiring.setupTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.drum-wiring.setupDesc`, pins)}
        </Text>
        <SegmentedControl
          size="xs"
          value={family}
          onChange={(value) => setFamily(value as DrumFamily)}
          data={[
            { value: 'gh', label: t(`${P}.drum-wiring.familyGh`) },
            { value: 'rb', label: t(`${P}.drum-wiring.familyRb`) },
          ]}
        />
        <SegmentedControl
          size="xs"
          value={chip}
          onChange={(value) => setChip(value as MuxChip)}
          data={MUX_CHIPS.map((c) => ({ value: c.value, label: c.label }))}
        />
        {mux && mapped === total && profileFamily === family ? (
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${P}.drum-wiring.setupDone`, { count: mapped })}
          </Badge>
        ) : (
          <Text size="xs" c="dimmed">
            {t(`${P}.drum-wiring.setupProgress`, { mapped, total })}
          </Text>
        )}
        <Button
          size="sm"
          color="orange"
          leftSection={<IconMusic size={16} />}
          disabled={!connected}
          onClick={() => configureDrumMux(family, chip)}
        >
          {mux ? t(`${P}.drum-wiring.updateBtn`) : t(`${P}.drum-wiring.createBtn`)}
        </Button>
      </Stack>
    </Card>
  );
}

// Step 2: Piezo & Multiplexer Wiring
export function DrumPadWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const setup = useMuxSetup();
  const pins = useMuxPins();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.drum-wiring.intro`)}</Text>

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.drum-wiring.polarityWarningTitle`)}
      >
        {t(`${P}.drum-wiring.polarityWarningText`)}
      </Alert>

      <Title order={4}>{t(`${P}.drum-wiring.circuitTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.drum-wiring.wiringSteps`, { returnObjects: true })}
      />

      <Title order={4}>{t(`${P}.drum-wiring.muxTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.drum-wiring.muxSteps`, { returnObjects: true, ...pins })}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t(`${P}.drum-wiring.slowTitle`)}
      >
        {t(`${P}.drum-wiring.slowText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <MuxSetupCard setup={setup} />
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="multiplexer" />
      <Text fw={700} size="sm">
        {t(`${P}.drum-wiring.hitMonitorTitle`)}
      </Text>
      <Text size="xs" c="dimmed">
        {t(`${P}.drum-wiring.hitMonitorDesc`)}
      </Text>
      <DrumHitMonitor />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.drum-wiring.title`)}
      badge={t(`${P}.drum-wiring.badge`)}
      badgeColor="red"
      description={t(`${P}.drum-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the multiplexer up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (setup.connected && !setup.done) {
          setup.apply();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the multiplexer is set up, and each pad's raw reading against its threshold, shown
// alongside the test step
export function DrumCheck() {
  const { t } = useTranslation();
  const C = `guides.drum-kit.check`;
  const connected = useConfigStore((state) => state.connected);
  const mux = useConfigStore(findMux);
  const family = useConfigStore(drumFamily);
  const mapped = useConfigStore((state) => countMappedPads(state, family));
  const muxDevice = mux?.device.multiplexer;
  const status = !connected
    ? t(`${C}.picoNotConnected`)
    : !muxDevice
      ? t(`${C}.muxMissing`)
      : t(`${C}.muxConfigured`, {
          com: muxDevice.inputPin,
          s0: muxDevice.s0Pin,
          s1: muxDevice.s1Pin,
          s2: muxDevice.s2Pin,
          count: mapped,
        });

  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Badge
        size="lg"
        color={connected && muxDevice ? 'teal' : 'gray'}
        variant="light"
        leftSection={<IconMusic size={16} />}
        tt="none"
      >
        {status}
      </Badge>
      <Text size="xs" c="dimmed">
        {t(`${C}.verifyPrompt`)}
      </Text>
      <DrumHitMonitor />
      <Text size="sm" fw={600} mt="xs">
        {t(`${C}.tipsTitle`)}
      </Text>
      <Text size="xs">{t(`${C}.tipsText`)}</Text>
    </Stack>
  );
}
