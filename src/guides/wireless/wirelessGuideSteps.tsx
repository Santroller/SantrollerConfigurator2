import React from 'react';
import {
  IconAlertTriangle,
  IconBattery,
  IconBluetooth,
  IconCheck,
  IconDeviceFloppy,
  IconInfoCircle,
  IconMoon,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { InactivitySettings } from '@/components/Inputs/InactivitySettings';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { PICO_PHYSICAL_PINS } from '../wiringText';
import {
  addAdcBattery,
  addFuelGauge,
  BatterySensor,
  boardChip,
  enableBluetoothOutput,
  fuelGaugeConflicts,
  GAUGE_I2C,
  profileBluetoothMode,
  profileHasBluetoothOutput,
  sleepConfigured,
  useWirelessBoard,
  WirelessBoard,
} from './wirelessSetup';

const P = 'guides.wireless.steps';
const B = 'guides.wireless.board';

// The firmware can't report whether the wireless chip is fitted, so the user picks their board. A
// guide that works without it says what happens instead.
export function BoardPicker({ plainNote }: { plainNote?: React.ReactNode }) {
  const { t } = useTranslation();
  const board = useWirelessBoard((state) => state.board);
  const setBoard = useWirelessBoard((state) => state.setBoard);
  const connected = useConfigStore((state) => state.connected);
  const type = useConfigStore((state) => state.type);
  const chip = connected ? boardChip(type) : undefined;

  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${B}.title`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${B}.desc`)}
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          value={board ?? ''}
          onChange={(value) => setBoard(value as WirelessBoard)}
          data={[
            { value: 'wireless', label: t(`${B}.wireless`) },
            { value: 'plain', label: t(`${B}.plain`) },
          ]}
        />
        <Text size="xs">
          {chip
            ? t(`${B}.chip`, {
                chip: t(chip === 'rp2350' ? `${B}.chipRp2350` : `${B}.chipRp2040`),
              })
            : t(`${B}.chipUnknown`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${B}.identify`)}
        </Text>
        {board === 'plain' && plainNote}
        {board === 'plain' && !plainNote && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
            {t(`${B}.plainWarning`)}
          </Alert>
        )}
        {board == null && (
          <Text size="xs" c="yellow">
            {t(`${B}.unknownPrompt`)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function StatusBadge({ ok, okLabel, missingLabel }: StatusBadgeProps) {
  return ok ? (
    <Badge color="teal" variant="light" leftSection={<IconCheck size={14} />}>
      {okLabel}
    </Badge>
  ) : (
    <Badge color="gray" variant="light">
      {missingLabel}
    </Badge>
  );
}

interface StatusBadgeProps {
  ok: boolean;
  okLabel: string;
  missingLabel: string;
}

// Step 1: Supplies, overview & LiPo safety
export function WirelessIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.wireless-intro`;

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${S}.intro`)}</Text>

      <Title order={4}>{t(`${S}.getTitle`)}</Title>
      <GuideList
        iconColor="blue"
        icon={<IconBluetooth size={12} />}
        items={t(`${S}.getList`, { returnObjects: true })}
      />
      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
        {t(`${S}.consoleNote`)}
      </Alert>

      <Title order={4}>{t(`${S}.requiresTitle`)}</Title>
      <GuideList iconColor="grape" items={t(`${S}.requiresList`, { returnObjects: true })} />

      <Title order={4}>{t(`${S}.suppliesTitle`)}</Title>
      <GuideList iconColor="teal" items={t(`${S}.supplies`, { returnObjects: true })} />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Alert
        color="red"
        variant="light"
        title={t(`${S}.safetyTitle`)}
        icon={<IconAlertTriangle size={16} />}
      >
        <GuideList
          iconColor="red"
          icon={<IconAlertTriangle size={12} />}
          items={t(`${S}.safetyList`, { returnObjects: true })}
        />
      </Alert>
      <BoardPicker />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${S}.title`)}
      badge={t(`${S}.badge`)}
      badgeColor="blue"
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function AdcBatterySettings({ id }: { id: string }) {
  const { t } = useTranslation();
  const S = `${P}.wireless-battery`;
  const battery = useConfigStore((state) => state.deviceStatus[id]?.device.adcBattery);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  if (!battery) {
    return null;
  }
  const update = (changes: Partial<proto.IAdcBatteryDevice>) =>
    updateDevice({ deviceid: parseInt(id, 10), adcBattery: { ...battery, ...changes } }, id);
  return (
    <Group grow>
      <NumberInput
        size="xs"
        label={t(`${S}.emptyLabel`)}
        suffix=" mV"
        min={0}
        value={battery.emptyMv}
        onChange={(val) => update({ emptyMv: Number(val) || 0 })}
      />
      <NumberInput
        size="xs"
        label={t(`${S}.fullLabel`)}
        suffix=" mV"
        min={0}
        value={battery.fullMv}
        onChange={(val) => update({ fullMv: Number(val) || 0 })}
      />
    </Group>
  );
}

// Step 2: Charger, diode & VSYS wiring, and battery level sensing
export function WirelessBatteryStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.wireless-battery`;
  const connected = useConfigStore((state) => state.connected);
  const adc = useConfigStore((state) => findDeviceStatus(state, 'adcBattery'));
  const gauge = useConfigStore((state) => findDeviceStatus(state, 'max1704x'));
  const hasBt = useConfigStore((state) => !!findDeviceStatus(state, 'bt'));
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const profiles = useConfigStore((state) => state.config.profiles);
  const board = useWirelessBoard((state) => state.board);
  const [sensor, setSensor] = React.useState<BatterySensor>(gauge && !adc ? 'max1704x' : 'adc');
  const conflicts = React.useMemo(
    () => fuelGaugeConflicts(deviceStatus, profiles),
    [deviceStatus, profiles]
  );
  // The gauge's own pins once it's added, which can be changed below, or the ones it's added with
  const gaugeI2c = gauge?.device.max1704x?.i2c;
  const gaugeSda = gaugeI2c?.sda ?? GAUGE_I2C.sda;
  const gaugeScl = gaugeI2c?.scl ?? GAUGE_I2C.scl;
  const gaugeParams = {
    ...GAUGE_I2C,
    sda: gaugeSda,
    scl: gaugeScl,
    sdaPin: PICO_PHYSICAL_PINS[gaugeSda],
    sclPin: PICO_PHYSICAL_PINS[gaugeScl],
  };
  const pinRows = t(`${S}.pinRows`, { returnObjects: true });

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t(`${S}.wiringTitle`)}</Title>
      <GuideList type="ordered" items={t(`${S}.wiringSteps`, { returnObjects: true })} />

      <Text fw={700} size="sm">
        {t(`${S}.pinTitle`)}
      </Text>
      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t(`${S}.thPin`)}</Table.Th>
            <Table.Th>{t(`${S}.thConnect`)}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.isArray(pinRows) &&
            pinRows.map((row, idx) => (
              <Table.Tr key={idx}>
                <Table.Td>{String(row?.[0] ?? '')}</Table.Td>
                <Table.Td>{String(row?.[1] ?? '')}</Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );

  const adcCard = (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t(`${S}.adcInfo`)}
      </Text>
      {board !== 'plain' && !hasBt && (
        <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
          {t(`${S}.adcPicoW`)}
        </Alert>
      )}
      {adc ? (
        <>
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${S}.adcAdded`, {
              pin: adc.device.adcBattery?.pin,
              divider: (adc.device.adcBattery?.dividerX1000 ?? 0) / 1000,
            })}
          </Badge>
          <AdcBatterySettings id={adc.id} />
        </>
      ) : gauge ? (
        <Text size="xs" c="yellow">
          {t(`${S}.otherSensorGauge`)}
        </Text>
      ) : (
        <Button
          size="sm"
          color="teal"
          leftSection={<IconBattery size={16} />}
          disabled={!connected}
          onClick={() => addAdcBattery()}
        >
          {t(`${S}.addAdcBtn`)}
        </Button>
      )}
    </Stack>
  );

  const gaugeCard = (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t(`${S}.gaugeInfo`)}
      </Text>
      <GuideList
        iconColor="cyan"
        items={t(`${S}.gaugeWiring`, { returnObjects: true, ...gaugeParams })}
      />
      {gauge ? (
        <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
          {t(`${S}.gaugeAdded`, {
            sda: gauge.device.max1704x?.i2c?.sda,
            scl: gauge.device.max1704x?.i2c?.scl,
          })}
        </Badge>
      ) : adc ? (
        <Text size="xs" c="yellow">
          {t(`${S}.otherSensorAdc`)}
        </Text>
      ) : conflicts.length ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
          {t(`${S}.gaugeConflict`, { ...GAUGE_I2C, conflicts: conflicts.join(', ') })}
        </Alert>
      ) : (
        <Button
          size="sm"
          color="teal"
          leftSection={<IconBattery size={16} />}
          disabled={!connected}
          onClick={() => addFuelGauge()}
        >
          {t(`${S}.addGaugeBtn`, GAUGE_I2C)}
        </Button>
      )}
      {/* The gauge's pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="max1704x" />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${S}.sensorTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${S}.sensorDesc`)}
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={sensor}
            onChange={(value) => setSensor(value as BatterySensor)}
            data={[
              { value: 'adc', label: t(`${S}.sensorAdc`) },
              { value: 'max1704x', label: t(`${S}.sensorGauge`) },
            ]}
          />
          {sensor === 'adc' ? adcCard : gaugeCard}
          {!connected && (
            <Text size="xs" c="dimmed">
              {t(`${S}.connectFirst`)}
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${S}.title`)}
      badge={t(`${S}.badge`)}
      badgeColor="orange"
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Bluetooth radio, Bluetooth output on the profile, and pairing
export function WirelessBluetoothStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.wireless-bluetooth`;
  const connected = useConfigStore((state) => state.connected);
  const hasBt = useConfigStore((state) => !!findDeviceStatus(state, 'bt'));
  const hasOutput = useConfigStore(profileHasBluetoothOutput);
  const mode = useConfigStore(profileBluetoothMode);
  const profileName = useConfigStore(
    (state) => state.config.profiles?.[state.currentProfile]?.opts?.name ?? ''
  );
  const board = useWirelessBoard((state) => state.board);

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t(`${S}.howTitle`)}</Title>
      <Text size="sm">{t(`${S}.howText`)}</Text>

      <Title order={4}>{t(`${S}.pairTitle`)}</Title>
      <GuideList type="ordered" items={t(`${S}.pairSteps`, { returnObjects: true })} />
      <Text size="xs" c="dimmed">
        {t(`${S}.syncNote`)}
      </Text>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <BoardPicker />
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${S}.setupTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${S}.setupDesc`, { profile: profileName })}
          </Text>
          <Group gap="xs">
            <StatusBadge
              ok={hasBt}
              okLabel={t(`${S}.radioBadge`)}
              missingLabel={t(`${S}.radioMissing`)}
            />
            <StatusBadge
              ok={hasOutput}
              okLabel={t(
                mode === proto.BluetoothMode.BTWiimote
                  ? `${S}.outputBadgeWiimote`
                  : `${S}.outputBadge`
              )}
              missingLabel={t(`${S}.outputMissing`)}
            />
          </Group>
          {!(hasBt && hasOutput) && (
            <Button
              size="sm"
              color="blue"
              leftSection={<IconBluetooth size={16} />}
              disabled={!connected || board !== 'wireless'}
              onClick={() => enableBluetoothOutput()}
            >
              {t(`${S}.enableBtn`)}
            </Button>
          )}
          {hasOutput && (
            <Text size="xs" c="dimmed">
              {t(`${S}.inputsNote`)}
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${S}.title`)}
      badge={t(`${S}.badge`)}
      badgeColor="blue"
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function BluetoothTimeout({ id }: { id: string }) {
  const { t } = useTranslation();
  const bt = useConfigStore((state) => state.deviceStatus[id]?.device.bt);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  if (!bt) {
    return null;
  }
  return (
    <NumberInput
      label={t('devices.bluetooth_timeout.label')}
      description={t('devices.bluetooth_timeout.description')}
      suffix=" s"
      min={0}
      value={bt.timeoutSec ?? 0}
      onChange={(val) =>
        updateDevice(
          { deviceid: parseInt(id, 10), bt: { ...bt, timeoutSec: Number(val) || 0 } },
          id
        )
      }
    />
  );
}

// Step 4: Bluetooth timeout, sleep and LED timeout
export function WirelessPowerStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.wireless-power`;
  const bt = useConfigStore((state) => findDeviceStatus(state, 'bt'));
  const sleeping = useConfigStore(sleepConfigured);
  const inactivity = useConfigStore((state) => state.config.inactivity);

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t(`${S}.optionsTitle`)}</Title>
      <GuideList iconColor="indigo" items={t(`${S}.optionsList`, { returnObjects: true })} />
      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
        {t(`${S}.wakeTip`)}
      </Alert>

      <Title order={5}>{t(`${S}.powerMgmtTitle`)}</Title>
      <Text size="sm">{t(`${S}.powerMgmtText`)}</Text>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${S}.btTitle`)}
          </Text>
          {bt ? (
            <BluetoothTimeout id={bt.id} />
          ) : (
            <Text size="xs" c="dimmed">
              {t(`${S}.btMissing`)}
            </Text>
          )}
        </Stack>
      </Card>
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={700} size="sm">
              {t(`${S}.inactivityTitle`)}
            </Text>
            <Badge
              color={sleeping ? 'teal' : 'gray'}
              variant="light"
              leftSection={<IconMoon size={14} />}
            >
              {sleeping
                ? t(`${S}.sleepActive`, {
                    seconds: inactivity?.sleepTimeoutSec,
                    pin: inactivity?.wakePin,
                  })
                : t(`${S}.sleepInactive`)}
            </Badge>
          </Group>
          <InactivitySettings />
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${S}.title`)}
      badge={t(`${S}.badge`)}
      badgeColor="indigo"
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function BatteryStatus() {
  const { t } = useTranslation();
  const S = `${P}.wireless-test`;
  const adc = useConfigStore((state) => findDeviceStatus(state, 'adcBattery'));
  const gauge = useConfigStore((state) => findDeviceStatus(state, 'max1704x'));
  const status = adc ?? gauge;

  if (!status) {
    return (
      <Badge color="gray" variant="light" leftSection={<IconBattery size={14} />}>
        {t(`${S}.batteryNone`)}
      </Badge>
    );
  }
  // The fuel gauge reports whether it answered on I2C as its connected state
  if (!adc && !status.connected) {
    return (
      <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={14} />}>
        {t(`${S}.gaugeMissing`)}
      </Badge>
    );
  }
  if (status.battery == null) {
    return (
      <Badge color="yellow" variant="light" leftSection={<IconBattery size={14} />}>
        {t(`${S}.batteryWaiting`)}
      </Badge>
    );
  }
  const level = status.battery;
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {t(`${S}.batteryLevel`, { level })}
      </Text>
      <Progress
        value={level}
        color={level > 50 ? 'teal' : level > 20 ? 'yellow' : 'red'}
        size="lg"
        radius="sm"
      />
    </Stack>
  );
}

function BluetoothStatus() {
  const { t } = useTranslation();
  const S = `${P}.wireless-test`;
  const bt = useConfigStore((state) => findDeviceStatus(state, 'bt'));
  const hasOutput = useConfigStore(profileHasBluetoothOutput);

  if (!bt) {
    return (
      <Badge color="gray" variant="light" leftSection={<IconBluetooth size={14} />}>
        {t(`${S}.btNone`)}
      </Badge>
    );
  }
  if (!bt.connected) {
    return (
      <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={14} />}>
        {t(`${S}.btStackDown`)}
      </Badge>
    );
  }
  return (
    <Stack gap={4}>
      {!hasOutput && (
        <Badge color="yellow" variant="light" leftSection={<IconAlertTriangle size={14} />}>
          {t(`${S}.btNoOutput`)}
        </Badge>
      )}
      <Badge
        color={bt.hostConnected ? 'teal' : 'blue'}
        variant="light"
        leftSection={<IconBluetooth size={14} />}
      >
        {bt.hostConnected ? t(`${S}.btHostConnected`) : t(`${S}.btAdvertising`)}
      </Badge>
      <Text size="xs" c="dimmed">
        {t(`${S}.hostNote`)}
      </Text>
    </Stack>
  );
}

// Step 5: Live battery / Bluetooth status and save
export function WirelessTestStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const S = `${P}.wireless-test`;
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await commitConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t(`${S}.testTitle`)}</Title>
      <GuideList type="ordered" items={t(`${S}.testSteps`, { returnObjects: true })} />

      {/* The setup guide saves in a step of its own */}
      {!props.nested && (
        <Button
          size="md"
          color="teal"
          disabled={!connected}
          loading={saving}
          leftSection={<IconDeviceFloppy size={18} />}
          onClick={handleSave}
        >
          {saved ? t(`${S}.btnSaved`) : t(`${S}.btnSave`)}
        </Button>
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed">
            {t(`${S}.statusTitle`)}
          </Text>
          {connected ? (
            <>
              <Text size="sm" fw={700}>
                {t(`${S}.batteryLabel`)}
              </Text>
              <BatteryStatus />
              <Text size="sm" fw={700}>
                {t(`${S}.btLabel`)}
              </Text>
              <BluetoothStatus />
            </>
          ) : (
            <Text size="xs" c="dimmed">
              {t(`${S}.connectPrompt`)}
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${S}.title`)}
      badge={t(`${S}.badge`)}
      badgeColor="green"
      description={t(`${S}.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
