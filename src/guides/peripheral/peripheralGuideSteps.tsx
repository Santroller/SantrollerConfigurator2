import { useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconDeviceFloppy,
  IconDownload,
  IconPlugConnected,
  IconPlugConnectedX,
  IconRefresh,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { downloadPeripheralUf2, peripheralBootValid } from '@/components/Devices/peripheralUf2';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { gpPin, pinWithLabel } from '../wiringText';
import {
  ensurePeripheralDevice,
  findPeripheral,
  HEADER_PINS,
  HEADER_SDA_PINS,
  usePeripheralBootPins,
} from './peripheralSetup';

const P = 'guides.peripheral-pico.steps';

const addressHex = (address: number | null | undefined) => `0x${(address || 0x75).toString(16)}`;

function usePeripheral() {
  return useConfigStore(findPeripheral);
}

// Step 1: what a secondary Pico is for, and what's needed
export function PeripheralIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.periph-intro.intro`)}</Text>

      <Title order={4}>{t(`${P}.periph-intro.usesTitle`)}</Title>
      <GuideList iconColor="blue" items={t(`${P}.periph-intro.uses`, { returnObjects: true })} />

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList
        iconColor="teal"
        items={t(`${P}.periph-intro.supplies`, { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.periph-intro.howTitle`)}
          </Text>
          <GuideList type="ordered" items={t(`${P}.periph-intro.how`, { returnObjects: true })} />
        </Stack>
      </Card>
      <Alert color="blue" variant="light" icon={<IconCpu size={16} />}>
        <Text size="sm">{t(`${P}.periph-intro.limitsBody`)}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.periph-intro.title`)}
      badge={t(`${P}.periph-intro.badge`)}
      badgeColor="teal"
      description={t(`${P}.periph-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: flash the secondary Pico with the peripheral UF2
export function PeripheralFlashStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const { pins, setPins } = usePeripheralBootPins();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);
  const valid = peripheralBootValid(pins);

  const handleDownload = async () => {
    setDownloading(true);
    setError(false);
    try {
      await downloadPeripheralUf2(pins);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.periph-flash.intro`)}</Text>
      <GuideList
        type="ordered"
        items={t(`${P}.periph-flash.flashSteps`, { returnObjects: true })}
      />
      <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
        <Text size="sm">{t(`${P}.periph-flash.onceBody`)}</Text>
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="sm">
        <Text fw={700} size="sm">
          {t(`${P}.periph-flash.uf2Title`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.periph-flash.uf2Desc`)}
        </Text>
        <Select
          label={t('peripherals.target_board')}
          value={pins.pico2 ? 'pico2' : 'pico1'}
          onChange={(value) => setPins({ pico2: value === 'pico2' })}
          allowDeselect={false}
          data={[
            { value: 'pico1', label: 'Raspberry Pi Pico 1 (RP2040)' },
            { value: 'pico2', label: 'Raspberry Pi Pico 2 (RP2350)' },
          ]}
        />
        <Select
          label={t(`${P}.periph-flash.busLabel`)}
          description={t(`${P}.periph-flash.busDesc`)}
          value={String(pins.sda)}
          onChange={(value) => {
            const sda = Number(value);
            // Keep the ID pin off the bus
            const idPin =
              pins.idPin === sda || pins.idPin === sda + 1
                ? (HEADER_PINS.find((pin) => pin !== sda && pin !== sda + 1) ?? pins.idPin)
                : pins.idPin;
            setPins({ sda, scl: sda + 1, idPin });
          }}
          allowDeselect={false}
          data={HEADER_SDA_PINS.map((sda) => ({
            value: String(sda),
            label: t(`${P}.periph-flash.busOption`, { sda, scl: sda + 1 }),
          }))}
        />
        <Select
          label={t('peripherals.id_pin')}
          description={t(`${P}.periph-flash.idDesc`)}
          value={String(pins.idPin)}
          onChange={(value) => setPins({ idPin: Number(value) })}
          allowDeselect={false}
          data={HEADER_PINS.filter((pin) => pin !== pins.sda && pin !== pins.scl).map((pin) => ({
            value: String(pin),
            label: `GP${pin}`,
          }))}
        />
        <Button
          color="blue"
          leftSection={<IconDownload size={16} />}
          onClick={handleDownload}
          loading={downloading}
          disabled={!valid}
        >
          {t('peripherals.download_uf2')}
        </Button>
        {error && (
          <Text size="xs" c="red">
            {t(`${P}.periph-flash.downloadError`)}
          </Text>
        )}
      </Stack>
    </Card>
  );

  return (
    <StepWorkbench
      title={t(`${P}.periph-flash.title`)}
      badge={t(`${P}.periph-flash.badge`)}
      badgeColor="blue"
      description={t(`${P}.periph-flash.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: wire the two Picos together and add the peripheral on the main one
export function PeripheralWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const peripheral = usePeripheral();
  const boot = usePeripheralBootPins((state) => state.pins);
  const mainI2c = peripheral?.device.peripheral?.i2c;
  const address = peripheral?.device.peripheral?.address;
  const mainPin = (pin: number | null | undefined) =>
    pin != null && pin >= 0 ? gpPin(pin) : t(`${P}.periph-wiring.mainUnset`);
  const pinText = {
    mainSda: mainPin(mainI2c?.sda),
    mainScl: mainPin(mainI2c?.scl),
    secSda: gpPin(boot.sda),
    secScl: gpPin(boot.scl),
    secId: gpPin(boot.idPin),
  };

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.common.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.periph-wiring.wiringSteps`, { returnObjects: true, ...pinText })}
      />
      <Alert color="blue" variant="light" icon={<IconCpu size={16} />}>
        <Text size="sm">{t(`${P}.periph-wiring.secondBody`, pinText)}</Text>
      </Alert>
    </Stack>
  );

  const rows: [string, string, string][] = [
    ['SDA', pinText.mainSda, pinText.secSda],
    ['SCL', pinText.mainScl, pinText.secScl],
    ['GND', pinWithLabel(38, 'GND'), pinWithLabel(38, 'GND')],
    ['VSYS', pinWithLabel(39, 'VSYS'), pinWithLabel(39, 'VSYS')],
    [
      'ID',
      '-',
      t(address === 0x76 ? `${P}.periph-wiring.idToGnd` : `${P}.periph-wiring.idOpen`, pinText),
    ],
  ];

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.periph-wiring.tableTitle`)}
          </Text>
          <Table striped withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`${P}.periph-wiring.thSignal`)}</Table.Th>
                <Table.Th>{t(`${P}.periph-wiring.thMain`)}</Table.Th>
                <Table.Th>{t(`${P}.periph-wiring.thSecondary`)}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map(([signal, main, secondary]) => (
                <Table.Tr key={signal}>
                  <Table.Td>{signal}</Table.Td>
                  <Table.Td>{main}</Table.Td>
                  <Table.Td>{secondary}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.periph-wiring.deviceTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.periph-wiring.deviceDesc`)}
          </Text>
          {peripheral ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t(`${P}.periph-wiring.addedBadge`, { address: addressHex(address) })}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconCpu size={16} />}
              onClick={ensurePeripheralDevice}
              disabled={!connected}
            >
              {t(`${P}.periph-wiring.addBtn`)}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins and address, which the wiring follows */}
      <GuideDeviceEditor kind="peripheral" />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.periph-wiring.title`)}
      badge={t(`${P}.periph-wiring.badge`)}
      badgeColor="blue"
      description={t(`${P}.periph-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on adds it too, so it isn't missed by not pressing the button
      onNext={() => {
        if (connected && !peripheral) {
          ensurePeripheralDevice();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the main Pico can reach the secondary, including while it updates its firmware
export function PeripheralStatus() {
  const { t } = useTranslation();
  const C = `${P}.periph-test`;
  const connected = useConfigStore((state) => state.connected);
  const peripheral = usePeripheral();

  if (!peripheral) {
    return (
      <Badge size="lg" color="gray" variant="light" leftSection={<IconCpu size={16} />} tt="none">
        {t(`${C}.notAddedBadge`)}
      </Badge>
    );
  }
  if (peripheral.updating || peripheral.rebooting) {
    return (
      <Stack gap="xs">
        <Badge
          size="lg"
          color="blue"
          variant="light"
          leftSection={<IconRefresh size={16} />}
          tt="none"
        >
          {t(peripheral.rebooting ? `${C}.rebootingBadge` : `${C}.updatingBadge`, {
            percent: peripheral.updateProgress ?? 0,
          })}
        </Badge>
        <Progress value={peripheral.rebooting ? 100 : (peripheral.updateProgress ?? 0)} animated />
      </Stack>
    );
  }
  if (connected && peripheral.connected && peripheral.wrongChip) {
    return (
      <Badge
        size="lg"
        color="red"
        variant="light"
        leftSection={<IconAlertTriangle size={16} />}
        tt="none"
      >
        {t(`${C}.wrongChipBadge`)}
      </Badge>
    );
  }
  if (connected && peripheral.connected) {
    return (
      <Badge
        size="lg"
        color="teal"
        variant="light"
        leftSection={<IconPlugConnected size={16} />}
        tt="none"
      >
        {t(`${C}.connectedBadge`, { address: addressHex(peripheral.device.peripheral?.address) })}
      </Badge>
    );
  }
  return (
    <Badge
      size="lg"
      color="yellow"
      variant="light"
      leftSection={<IconPlugConnectedX size={16} />}
      tt="none"
    >
      {t(`${C}.waitingBadge`)}
    </Badge>
  );
}

// Step 4: save, check the main Pico finds it, and where to set it up from here
export function PeripheralTestStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);
  const peripheral = usePeripheral();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <Text size="sm">{t(`${P}.periph-test.saveText`)}</Text>
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
          {saved ? t('guides.common.btnSaved') : t(`${P}.periph-test.btnSave`)}
        </Button>
      )}

      <Title order={4}>{t(`${P}.periph-test.nextTitle`)}</Title>
      <GuideList type="ordered" items={t(`${P}.periph-test.nextSteps`, { returnObjects: true })} />
      {peripheral && (
        <Group>
          <Button component={Link} to={`/peripherals?id=${peripheral.id}`} variant="light">
            {t(`${P}.periph-test.openPeripheralBtn`)}
          </Button>
          <Button component={Link} to="/inputs" variant="light">
            {t(`${P}.periph-test.openInputsBtn`)}
          </Button>
        </Group>
      )}

      <Title order={4}>{t(`${P}.periph-test.troubleTitle`)}</Title>
      <GuideList
        iconColor="orange"
        items={t(`${P}.periph-test.trouble`, { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed">
          {t(`${P}.periph-test.statusTitle`)}
        </Text>
        <PeripheralStatus />
        <Text size="xs" c="dimmed">
          {t(`${P}.periph-test.statusHint`)}
        </Text>
      </Stack>
    </Paper>
  );

  return (
    <StepWorkbench
      title={t(`${P}.periph-test.title`)}
      badge={t(`${P}.periph-test.badge`)}
      badgeColor="green"
      description={t(`${P}.periph-test.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
