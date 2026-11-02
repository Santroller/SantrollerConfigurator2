import React, { useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconDeviceFloppy,
  IconDeviceGamepad2,
  IconPlugConnected,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { IMAGE_ALT, pinNum } from '../wiringText';
import {
  consoleListHasUsbSlot,
  consoleOutputConflicts,
  consoleOutputPins,
  consoleOutputTriggered,
  ConsolePower,
  consoleSubtype,
  ConsoleTarget,
  consoleUsbHostPins,
  findConsoleOutput,
  findConsoleOutputList,
  getConsolePower,
  getConsoleTarget,
  getConsoleUsbHost,
  isConsoleOutputConfigured,
  picoPinLabel,
  setConsolePower,
  setConsoleTarget,
  setConsoleUsbHost,
  setupConsoleOutput,
} from './consoleOutputSetup';

const K = 'guides.console-output.steps';

/** The console, USB host and power choices, shared between steps through localStorage */
function useConsoleChoice() {
  const [target, setTargetState] = useState<ConsoleTarget>(() => getConsoleTarget());
  const [usbHost, setUsbHostState] = useState<boolean>(() => getConsoleUsbHost());
  const setTarget = (value: ConsoleTarget) => {
    setTargetState(value);
    setConsoleTarget(value);
  };
  const setUsbHost = (value: boolean) => {
    setUsbHostState(value);
    setConsoleUsbHost(value);
  };
  const [power, setPowerState] = useState<ConsolePower>(() => getConsolePower());
  const setPower = (value: ConsolePower) => {
    setPowerState(value);
    setConsolePower(value);
  };
  return { target, setTarget, usbHost, setUsbHost, power, setPower };
}

function ConsoleChoice({
  target,
  setTarget,
  usbHost,
  setUsbHost,
  power,
  setPower,
}: ReturnType<typeof useConsoleChoice>) {
  const { t } = useTranslation();
  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t(`${K}.console-intro.consoleSelectLabel`)}
        </Text>
        <SegmentedControl
          orientation="vertical"
          fullWidth
          value={target}
          onChange={(v) => setTarget(v as ConsoleTarget)}
          data={[
            { label: t(`${K}.console-intro.consoleWii`), value: 'wii' },
            { label: t(`${K}.console-intro.consolePs2`), value: 'ps2' },
          ]}
        />
      </Stack>
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t(`${K}.console-intro.usbSelectLabel`)}
        </Text>
        <SegmentedControl
          orientation="vertical"
          fullWidth
          value={usbHost ? 'yes' : 'no'}
          onChange={(v) => setUsbHost(v === 'yes')}
          data={[
            { label: t(`${K}.console-intro.usbNo`), value: 'no' },
            { label: t(`${K}.console-intro.usbYes`), value: 'yes' },
          ]}
        />
        <Text size="xs" c="dimmed">
          {t(`${K}.console-intro.usbHelp`)}
        </Text>
      </Stack>
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t(`${K}.console-intro.powerSelectLabel`)}
        </Text>
        <SegmentedControl
          orientation="vertical"
          fullWidth
          value={power}
          onChange={(v) => setPower(v as ConsolePower)}
          data={[
            { label: t(`${K}.console-intro.powerConsole`), value: 'console' },
            { label: t(`${K}.console-intro.powerUsb`), value: 'usb' },
          ]}
        />
      </Stack>
    </Stack>
  );
}

/** The controller type the console will see for the active profile */
function ConsoleTypeCard({ target }: { target: ConsoleTarget }) {
  const { t } = useTranslation();
  const deviceToEmulate = useConfigStore(
    (state) => state.config.profiles?.[state.currentProfile]?.opts?.deviceToEmulate
  );
  const connected = useConfigStore((state) => state.connected);
  const subtype = consoleSubtype(target, deviceToEmulate);
  const profileType = t(`subType.${proto.SubType[deviceToEmulate ?? proto.SubType.Gamepad]}`);
  const typeLabel =
    subtype === null
      ? '-'
      : target === 'wii' && subtype === proto.SubType.Gamepad
        ? t(`${K}.console-intro.classicController`)
        : t(`subType.${proto.SubType[subtype]}`);
  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${K}.console-intro.profileTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${K}.console-intro.profileDesc`)}
        </Text>
        {connected && (
          <Badge
            size="lg"
            variant="light"
            color={subtype === null ? 'red' : 'teal'}
            leftSection={<IconDeviceGamepad2 size={16} />}
          >
            {t(`${K}.console-intro.profileSees`, {
              console: t(
                target === 'wii'
                  ? `${K}.console-intro.consoleNameWii`
                  : `${K}.console-intro.consoleNamePs2`
              ),
              type: typeLabel,
            })}
          </Badge>
        )}
        {connected && subtype === null && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={16} />}
            title={t(`${K}.console-intro.ps2UnsupportedTitle`)}
          >
            {t(`${K}.console-intro.ps2UnsupportedText`, { type: profileType })}
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          {t(
            target === 'wii' ? `${K}.console-intro.wiiTypesHint` : `${K}.console-intro.ps2TypesHint`
          )}
        </Text>
      </Stack>
    </Card>
  );
}

function PlugImage({ target }: { target: ConsoleTarget }) {
  const { t } = useTranslation();
  return (
    <Stack gap={4}>
      <Image
        src={
          target === 'wii'
            ? '/guides/consoleout/wii-ext-plug-pinout.jpg'
            : '/guides/ps2/ps2-pinout.png'
        }
        radius="md"
        maw={target === 'wii' ? 360 : undefined}
        mx="auto"
        alt={t(`${IMAGE_ALT}.${target === 'wii' ? 'wiiExtPlugPinout' : 'ps2PlugPinout'}`)}
      />
      <Text size="xs" c="dimmed" ta="center">
        {t(
          target === 'wii'
            ? `${K}.console-wiring.plugCaptionWii`
            : `${K}.console-wiring.plugCaptionPs2`
        )}
      </Text>
    </Stack>
  );
}

/** Powered from USB, the console's supply lines must stay off the Pico */
function UsbPowerWarning({ target }: { target: ConsoleTarget }) {
  const { t } = useTranslation();
  return (
    <Alert
      color="red"
      icon={<IconAlertTriangle size={16} />}
      title={t(`${K}.console-intro.usbPowerWarningTitle`)}
    >
      {t(
        target === 'wii'
          ? `${K}.console-intro.usbPowerWarningWii`
          : `${K}.console-intro.usbPowerWarningPs2`
      )}
    </Alert>
  );
}

// Step 1: Overview, console choice & supplies
export function ConsoleOutputIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const choice = useConsoleChoice();
  const { target, usbHost, power } = choice;
  const list = (key: string) => t(`${K}.console-intro.${key}`, { returnObjects: true }) as string[];
  const supplies = [
    ...list(target === 'wii' ? 'suppliesWii' : 'suppliesPs2'),
    ...list(power === 'console' ? 'suppliesConsolePower' : 'suppliesUsbPower'),
    ...(usbHost ? list('suppliesUsb') : []),
    // From USB the Pico's own 5V already feeds the socket, so only console power needs boosting
    ...(usbHost && power === 'console' ? list('suppliesBoost') : []),
  ];

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${K}.console-intro.intro`)}</Text>

      <ConsoleChoice {...choice} />

      <Title order={4}>{t(`${K}.console-intro.howTitle`)}</Title>
      <Text size="sm">
        {t(target === 'wii' ? `${K}.console-intro.howWii` : `${K}.console-intro.howPs2`)}
      </Text>

      <Title order={4}>{t(`${K}.console-intro.suppliesTitle`)}</Title>
      <GuideList iconColor="grape" items={supplies} />

      {target === 'ps2' ? (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={16} />}
          title={t(`${K}.console-intro.rumbleTitle`)}
        >
          {t(`${K}.console-intro.rumbleText`)}
        </Alert>
      ) : (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={16} />}
          title={t(`${K}.console-intro.coloursTitle`)}
        >
          {t(`${K}.console-intro.coloursText`)}
        </Alert>
      )}
      {power === 'console' ? (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={16} />}
          title={t(`${K}.console-intro.diodeTitle`)}
        >
          {t(`${K}.console-intro.diodeText`)}
        </Alert>
      ) : (
        <UsbPowerWarning target={target} />
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <ConsoleTypeCard target={target} />
      <PlugImage target={target} />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${K}.console-intro.title`)}
      badge={t(`${K}.console-intro.badge`)}
      badgeColor="grape"
      description={t(`${K}.console-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      {ok ? (
        <IconCheck size={14} color="var(--mantine-color-teal-6)" />
      ) : (
        <IconX size={14} color="var(--mantine-color-orange-6)" />
      )}
      <Text size="xs" c={ok ? 'dimmed' : 'orange'}>
        {label}
      </Text>
    </Group>
  );
}

// Step 2: Wiring & setup
export function ConsoleOutputWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const choice = useConsoleChoice();
  const { target, usbHost } = choice;
  const connected = useConfigStore((state) => state.connected);
  const device = useConfigStore((state) => findConsoleOutput(state, target));
  const hasList = useConfigStore((state) => findConsoleOutputList(state, target) !== -1);
  const usbHostDevice = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const hasUsbSlot = useConfigStore((state) => consoleListHasUsbSlot(state, target));
  const configured = useConfigStore((state) => isConsoleOutputConfigured(state, target, usbHost));
  const pins = useConfigStore(useShallow((state) => consoleOutputPins(state, target)));
  const usbPins = useConfigStore(useShallow((state) => consoleUsbHostPins(state, target)));
  const conflicts = useConfigStore(useShallow((state) => consoleOutputConflicts(state, target)));

  const labels = Object.fromEntries(
    Object.entries(pins).map(([key, pin]) => [key, picoPinLabel(pin)])
  );
  const usbLabels = usbPins
    ? { dp: picoPinLabel(usbPins.dp), dm: picoPinLabel(usbPins.dm) }
    : { dp: '-', dm: '-' };
  const blocked = conflicts.length > 0 || (usbHost && !usbPins);

  const rows: { signal: string; plug: string; pico: string; color: string }[] =
    target === 'wii'
      ? [
          {
            signal: t(`${K}.console-wiring.sigSda`),
            plug: 'SDA',
            pico: labels.sda,
            color: 'green',
          },
          {
            signal: t(`${K}.console-wiring.sigScl`),
            plug: 'SCL',
            pico: labels.scl,
            color: 'yellow',
          },
        ]
      : [
          {
            signal: t(`${K}.console-wiring.sigData`),
            plug: pinNum(1),
            pico: labels.data,
            color: 'orange',
          },
          {
            signal: t(`${K}.console-wiring.sigCommand`),
            plug: pinNum(2),
            pico: labels.command,
            color: 'orange',
          },
          {
            signal: t(`${K}.console-wiring.sigAttention`),
            plug: pinNum(6),
            pico: labels.attention,
            color: 'yellow',
          },
          {
            signal: t(`${K}.console-wiring.sigClock`),
            plug: pinNum(7),
            pico: labels.clock,
            color: 'blue',
          },
          {
            signal: t(`${K}.console-wiring.sigAcknowledge`),
            plug: pinNum(9),
            pico: labels.acknowledge,
            color: 'green',
          },
        ];
  if (usbHost) {
    const plug = t(`${K}.console-wiring.plugUsb`);
    rows.push(
      { signal: t(`${K}.console-wiring.sigDp`), plug, pico: usbLabels.dp, color: 'teal' },
      { signal: t(`${K}.console-wiring.sigDm`), plug, pico: usbLabels.dm, color: 'teal' }
    );
  }

  const { power } = choice;
  const powerSteps = t(
    power === 'usb'
      ? `${K}.console-wiring.usbSupplyPower`
      : usbHost
        ? target === 'wii'
          ? `${K}.console-wiring.wiiUsbPower`
          : `${K}.console-wiring.ps2UsbPower`
        : target === 'wii'
          ? `${K}.console-wiring.wiiPower`
          : `${K}.console-wiring.ps2Power`,
    { returnObjects: true }
  );

  const guideContent = (
    <Stack gap="md">
      <ConsoleChoice {...choice} />

      <PlugImage target={target} />

      <Title order={4}>{t(`${K}.console-wiring.signalTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(
          target === 'wii' ? `${K}.console-wiring.wiiSteps` : `${K}.console-wiring.ps2Steps`,
          { returnObjects: true, ...labels }
        )}
      />
      {target === 'ps2' && (
        <Text size="xs" c="dimmed">
          {t(`${K}.console-wiring.ps2ColoursNote`)}
        </Text>
      )}

      <Title order={4}>
        {t(
          power === 'usb'
            ? `${K}.console-wiring.usbSupplyTitle`
            : usbHost
              ? `${K}.console-wiring.usbPowerTitle`
              : `${K}.console-wiring.powerTitle`
        )}
      </Title>
      {power === 'console' && usbHost && (
        <Text size="sm">{t(`${K}.console-wiring.usbPowerIntro`)}</Text>
      )}
      <GuideList type="ordered" items={powerSteps} />
      {power === 'usb' && <UsbPowerWarning target={target} />}
      {target === 'ps2' && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={16} />}
          title={t(`${K}.console-intro.rumbleTitle`)}
        >
          {t(`${K}.console-intro.rumbleText`)}
        </Alert>
      )}

      {usbHost && (
        <>
          <Title order={4}>{t(`${K}.console-wiring.usbTitle`)}</Title>
          <GuideList
            type="ordered"
            items={t(`${K}.console-wiring.usbSteps`, { returnObjects: true, ...usbLabels })}
          />
          <Stack gap={4}>
            <Image src="/guides/usb/usb.svg" radius="md" alt={t(`${IMAGE_ALT}.usbSocket`)} />
            <Text size="xs" c="dimmed" ta="center">
              {t(`${K}.console-wiring.usbCaption`)}
            </Text>
          </Stack>
        </>
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${K}.console-wiring.setupTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {target === 'wii'
              ? t(`${K}.console-wiring.setupDescWii`, labels)
              : t(`${K}.console-wiring.setupDescPs2`)}
          </Text>
          {usbHost && usbPins && (
            <Text size="xs" c="dimmed">
              {t(`${K}.console-wiring.setupDescUsb`, usbLabels)}
            </Text>
          )}

          {configured ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t(`${K}.console-wiring.configuredBadge`)}
            </Badge>
          ) : (
            <>
              <Stack gap={2}>
                {!device && (
                  <StatusLine ok={false} label={t(`${K}.console-wiring.deviceMissing`)} />
                )}
                {!hasList && <StatusLine ok={false} label={t(`${K}.console-wiring.listMissing`)} />}
                {usbHost && !usbHostDevice && (
                  <StatusLine ok={false} label={t(`${K}.console-wiring.usbHostMissing`)} />
                )}
                {usbHost && hasList && !hasUsbSlot && (
                  <StatusLine ok={false} label={t(`${K}.console-wiring.usbSlotMissing`)} />
                )}
              </Stack>
              <Button
                size="sm"
                color="grape"
                leftSection={<IconPlugConnected size={16} />}
                onClick={() => setupConsoleOutput(target, usbHost)}
                disabled={!connected || blocked}
              >
                {device ? t(`${K}.console-wiring.finishBtn`) : t(`${K}.console-wiring.setupBtn`)}
              </Button>
            </>
          )}

          {conflicts.length > 0 && (
            <Alert
              color="orange"
              icon={<IconAlertTriangle size={16} />}
              title={t(`${K}.console-wiring.conflictTitle`)}
            >
              {t(`${K}.console-wiring.conflictText`, {
                pins: conflicts.map((pin) => `GP${pin}`).join(', '),
              })}
            </Alert>
          )}
          {usbHost && !usbPins && (
            <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
              {t(`${K}.console-wiring.usbNoPins`)}
            </Alert>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${K}.console-wiring.pinsTitle`)}
          </Text>
          <Table striped withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`${K}.console-wiring.thSignal`)}</Table.Th>
                <Table.Th>{t(`${K}.console-wiring.thPlugPin`)}</Table.Th>
                <Table.Th>{t(`${K}.console-wiring.thPicoPin`)}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.signal}>
                  <Table.Td>
                    <Badge size="xs" color={row.color}>
                      {row.signal}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.plug}</Table.Td>
                  <Table.Td>{row.pico}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
      {/* The drivers' pins, which can be changed here once they're added, and the wiring follows */}
      <GuideDeviceEditor kind={target === 'wii' ? 'wiiEmulation' : 'psxEmulation'} />
      {usbHost && <GuideDeviceEditor kind="usbHost" />}
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${K}.console-wiring.title`)}
      badge={t(`${K}.console-wiring.badge`)}
      badgeColor="orange"
      description={t(`${K}.console-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Save & play
export function ConsoleOutputTestStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const { target, usbHost } = useConsoleChoice();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);
  const configured = useConfigStore((state) => isConsoleOutputConfigured(state, target, usbHost));
  const talking = useConfigStore((state) => consoleOutputTriggered(state, target));
  const usbCount = useConfigStore(
    (state) => Object.keys(findDeviceStatus(state, 'usbHost')?.usbDevices ?? {}).length
  );

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
      <Text size="sm">{t(`${K}.console-test.saveText`)}</Text>
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
          {saved ? t(`${K}.console-test.btnSaved`) : t(`${K}.console-test.btnSave`)}
        </Button>
      )}

      <Title order={4}>{t(`${K}.console-test.expectTitle`)}</Title>
      <GuideList
        type="ordered"
        items={[
          ...(t(target === 'wii' ? `${K}.console-test.wiiExpect` : `${K}.console-test.ps2Expect`, {
            returnObjects: true,
          }) as string[]),
          ...(usbHost ? [t(`${K}.console-test.usbExpect`)] : []),
        ]}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t(`${K}.console-test.statusTitle`)}
          </Text>
          {!configured ? (
            <Badge size="lg" color="gray" variant="light" leftSection={<IconX size={16} />}>
              {t(`${K}.console-test.notConfiguredBadge`)}
            </Badge>
          ) : connected && talking ? (
            <Badge
              size="lg"
              color="teal"
              variant="light"
              leftSection={<IconPlugConnected size={16} />}
            >
              {t(`${K}.console-test.detectedBadge`)}
            </Badge>
          ) : (
            <Badge
              size="lg"
              color="yellow"
              variant="light"
              leftSection={<IconDeviceGamepad2 size={16} />}
            >
              {t(`${K}.console-test.waitingBadge`)}
            </Badge>
          )}
          {configured && usbHost && connected && (
            <Text size="xs" c={usbCount > 0 ? 'teal' : 'dimmed'}>
              {usbCount > 0
                ? t(`${K}.console-test.usbDetected`, { count: usbCount })
                : t(`${K}.console-test.usbNone`)}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {!configured
              ? t(`${K}.console-test.notConfiguredPrompt`)
              : !connected
                ? t(`${K}.console-test.connectPrompt`)
                : t(`${K}.console-test.liveHint`)}
          </Text>
        </Stack>
      </Paper>
      <ConsoleTypeCard target={target} />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${K}.console-test.title`)}
      badge={t(`${K}.console-test.badge`)}
      badgeColor="green"
      description={t(`${K}.console-test.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
