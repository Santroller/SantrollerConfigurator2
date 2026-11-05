import React, { useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconDeviceGamepad2,
  IconGuitarPick,
  IconInfoCircle,
  IconPlug,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Alert,
  Box,
  Button,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { BluetoothConfigDevice } from '@/components/SettingsContext/BluetoothConfigDevice';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { ConnectPrompt } from '@/guides/components/StepActions';
import { LayoutMarker, LayoutMarkerList } from '@/guides/setup/setupGuideSteps';
import { Rich, RichItems, StepTitle } from './guideText';

const K = 'compatibility.rpcs3';

// ---------------------------------------------------------------------------------------------
// Switching to PS3 mode from the tool
// ---------------------------------------------------------------------------------------------

type SwitchBlocker = 'bluetooth' | 'firmware' | 'profile' | 'unsaved';

function useSwitchBlocker(): SwitchBlocker | null {
  const hidDevice = useConfigStore((state) => state.hidDevice);
  const supported = useConfigStore((state) => state.rpcs3ModeCommand);
  const configModified = useConfigStore((state) => state.configModified);
  const profiles = useConfigStore((state) => state.config.profiles);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);

  if (hidDevice instanceof BluetoothConfigDevice) {
    return 'bluetooth';
  }
  if (!supported) {
    return 'firmware';
  }
  // The firmware only switches when a loaded profile wants passthrough, and the SDL handler only
  // treats it as a guitar when it is a Guitar Hero guitar
  const ready = (profiles ?? []).some(
    (profile) =>
      activeProfiles.includes(profile.opts?.uid ?? -1) &&
      profile.opts?.deviceToEmulate === proto.SubType.GuitarHeroGuitar &&
      profile.opts?.ps3OnRpcs3 !== false
  );
  if (!ready) {
    return 'profile';
  }
  // Unsaved changes only live until the controller is replugged, which is how it leaves PS3 mode
  if (configModified) {
    return 'unsaved';
  }
  return null;
}

function Ps3ModeSwitch() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const switchToRpcs3Mode = useConfigStore((state) => state.switchToRpcs3Mode);
  const blocker = useSwitchBlocker();
  const [switched, setSwitched] = useState(false);
  const [busy, setBusy] = useState(false);

  if (switched && !connected) {
    return (
      <Alert color="teal" icon={<IconCheck size={16} />} title={t(`${K}.gh.switch.doneTitle`)}>
        <Text size="sm">
          <Rich i18nKey={`${K}.gh.switch.doneBody`} />
        </Text>
      </Alert>
    );
  }
  if (!connected) {
    return <ConnectPrompt promptKey={`${K}.gh.switch.connectPrompt`} />;
  }

  return (
    <Stack gap="xs">
      {blocker && (
        <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm">
            <Rich i18nKey={`${K}.gh.switch.blocked.${blocker}`} />
          </Text>
        </Alert>
      )}
      <Group>
        <Button
          leftSection={<IconPlug size={16} />}
          disabled={blocker !== null}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await switchToRpcs3Mode();
            setBusy(false);
            setSwitched(true);
          }}
        >
          {t(`${K}.gh.switch.button`)}
        </Button>
      </Group>
    </Stack>
  );
}

// ---------------------------------------------------------------------------------------------
// A sketch of RPCS3's Gamepad Settings dialog (rpcs3qt/pad_settings_dialog.ui)
// ---------------------------------------------------------------------------------------------

const HIGHLIGHT = 'var(--mantine-color-orange-filled)';

// One of the dialog's group boxes, with its title on the border like Qt draws it
function MockGroup({
  title,
  marker,
  dim,
  children,
}: {
  title: string;
  marker?: number;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Box
      pos="relative"
      px="xs"
      pt="sm"
      pb="xs"
      mt={8}
      style={{
        border: `1px solid ${marker ? HIGHLIGHT : 'var(--mantine-color-default-border)'}`,
        borderRadius: 4,
        opacity: dim ? 0.45 : 1,
      }}
    >
      <Text
        size="xs"
        pos="absolute"
        top={-9}
        left={8}
        px={4}
        bg="var(--mantine-color-body)"
        style={{ lineHeight: '16px' }}
      >
        {title}
      </Text>
      {marker !== undefined && (
        <Box pos="absolute" top={-10} right={6}>
          <LayoutMarker n={marker} />
        </Box>
      )}
      <Group gap={6} wrap="nowrap">
        {children}
      </Group>
    </Box>
  );
}

function MockCombo({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <Group
      gap={4}
      px={6}
      py={2}
      wrap="nowrap"
      justify="space-between"
      style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${highlight ? HIGHLIGHT : 'var(--mantine-color-default-border)'}`,
        borderRadius: 3,
        background: 'var(--mantine-color-default)',
      }}
    >
      <Text size="xs" truncate fw={highlight ? 700 : undefined}>
        {value}
      </Text>
      <IconChevronDown size={12} style={{ flexShrink: 0 }} />
    </Group>
  );
}

function MockButton({ label, marker }: { label: string; marker?: number }) {
  return (
    <Group gap={4} wrap="nowrap">
      <Box
        px={8}
        py={2}
        style={{
          border: `1px solid ${marker ? HIGHLIGHT : 'var(--mantine-color-default-border)'}`,
          borderRadius: 3,
          background: 'var(--mantine-color-default)',
        }}
      >
        <Text size="xs" fw={marker ? 700 : undefined}>
          {label}
        </Text>
      </Box>
      {marker !== undefined && <LayoutMarker n={marker} />}
    </Group>
  );
}

// The binding groups either side of the controller picture, left alone in this guide
function MockBindings({ groups }: { groups: string[] }) {
  return (
    <Stack gap={4}>
      {groups.map((group) => (
        <MockGroup key={group} title={group} dim>
          <MockButton label="…" />
        </MockGroup>
      ))}
    </Stack>
  );
}

const M = `${K}.gh.dialog`;

function PadSettingsSketch() {
  const { t } = useTranslation();
  const border = '1px solid var(--mantine-color-default-border)';
  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }} aria-hidden>
      <Group px="xs" py={6} gap={6} style={{ borderBottom: border }}>
        <IconDeviceGamepad2 size={14} />
        <Text size="xs" fw={600}>
          Gamepad Settings
        </Text>
      </Group>
      <Group
        gap={0}
        px="xs"
        pt={6}
        wrap="nowrap"
        style={{ borderBottom: border, overflow: 'hidden' }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Box
            key={n}
            px={8}
            py={2}
            style={{
              border,
              borderBottom: 'none',
              borderRadius: '3px 3px 0 0',
              background: n === 1 ? 'var(--mantine-color-body)' : 'var(--mantine-color-default)',
              flexShrink: 0,
            }}
          >
            <Text size="xs" fw={n === 1 ? 700 : undefined} c={n === 1 ? undefined : 'dimmed'}>
              Player {n}
            </Text>
          </Box>
        ))}
      </Group>
      <Stack gap="xs" p="xs">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="xs">
          <MockGroup title="Handlers" marker={1}>
            <MockCombo value="SDL" highlight />
            <MockButton label="Refresh" />
          </MockGroup>
          <MockGroup title="Devices" marker={2}>
            <MockCombo value={t(`${M}.device`)} highlight />
          </MockGroup>
          <MockGroup title="Motion Controls" dim>
            <MockButton label="Configure" />
          </MockGroup>
          <MockGroup title="Configuration Files" dim>
            <MockCombo value="Default" />
          </MockGroup>
        </SimpleGrid>
        <Group align="flex-start" gap="xs" wrap="nowrap">
          <Box visibleFrom="sm" w={130} style={{ flexShrink: 0 }}>
            <MockBindings groups={['D-Pad', 'Left Stick', 'L1', 'L2']} />
          </Box>
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Box visibleFrom="sm">
              <Paper
                withBorder
                radius="sm"
                h={92}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconGuitarPick size={36} stroke={1} color="var(--mantine-color-dimmed)" />
              </Paper>
            </Box>
            <MockGroup title="Device Class" marker={3}>
              <MockCombo value="Guitar" highlight />
              <MockCombo value="Guitar Hero" highlight />
            </MockGroup>
          </Stack>
          <Box visibleFrom="sm" w={130} style={{ flexShrink: 0 }}>
            <MockBindings groups={['Face Buttons', 'Right Stick', 'R1', 'R2']} />
          </Box>
        </Group>
        <Group justify="flex-end" gap={6} pt={4} style={{ borderTop: border }}>
          <MockButton label="Restore Defaults" />
          <MockButton label="Reset" />
          <MockButton label="Cancel" />
          <MockButton label="Save" marker={4} />
        </Group>
      </Stack>
    </Paper>
  );
}

const DIALOG_PARTS = ['handler', 'device', 'deviceClass', 'save'] as const;

// ---------------------------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------------------------

export function Rpcs3Guide() {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={18} />} title={t(`${K}.alertTitle`)} color="blue">
        <Text size="xs">
          <Rich i18nKey={`${K}.alertBody`} />
        </Text>
      </Alert>

      {/* ================= Guitar Hero: SDL pad handler ================= */}
      <Paper id="rpcs3-gh" withBorder radius="md" p="lg">
        <Title order={3} size="h4" mb="sm">
          {t(`${K}.gh.title`)}
        </Title>

        <Text size="sm" mb="md">
          <Rich i18nKey={`${K}.gh.intro`} />
        </Text>

        <Stack gap="lg">
          <Stack gap="xs">
            <StepTitle n={1} title={t(`${K}.gh.steps.switch.title`)} />
            <Text size="sm">
              <Rich i18nKey={`${K}.gh.steps.switch.body`} />
            </Text>
            <Ps3ModeSwitch />
          </Stack>

          <Stack gap="xs">
            <StepTitle n={2} title={t(`${K}.gh.steps.open.title`)} />
            <Text size="sm">
              <Rich i18nKey={`${K}.gh.steps.open.body`} />
            </Text>
          </Stack>

          <Stack gap="sm">
            <StepTitle n={3} title={t(`${K}.gh.steps.configure.title`)} />
            <Text size="sm">
              <Rich i18nKey={`${K}.gh.steps.configure.body`} />
            </Text>
            <PadSettingsSketch />
            <LayoutMarkerList
              items={DIALOG_PARTS.map((part) => ({
                title: t(`${M}.parts.${part}.title`),
                bodyKey: `${M}.parts.${part}.body`,
              }))}
            />
          </Stack>

          <Stack gap="xs">
            <StepTitle n={4} title={t(`${K}.gh.steps.back.title`)} />
            <Text size="sm">
              <Rich i18nKey={`${K}.gh.steps.back.body`} />
            </Text>
          </Stack>

          <Accordion variant="separated" radius="md">
            <Accordion.Item value="troubleshooting">
              <Accordion.Control icon={<IconAlertTriangle size={16} />}>
                <Text size="sm" fw={600}>
                  {t(`${K}.gh.troubleshooting.title`)}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <List size="sm" spacing="xs">
                  <RichItems i18nKey={`${K}.gh.troubleshooting.items`} />
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Paper>

      {/* ================= Rock Band and others: USB passthrough ================= */}
      <Paper id="rpcs3-passthrough" withBorder radius="md" p="lg">
        <Title order={3} size="h4" mb="sm">
          {t(`${K}.passthrough.title`)}
        </Title>

        <Text size="sm" mb="sm">
          <Rich i18nKey={`${K}.passthrough.intro`} />
        </Text>
        <List size="sm" spacing={4} mb="md">
          <RichItems i18nKey={`${K}.passthrough.instruments`} />
        </List>

        <Title order={4} size="h5" mb="xs">
          {t(`${K}.passthrough.stepsTitle`)}
        </Title>
        <List type="ordered" size="sm" spacing="xs" mb="md">
          <RichItems i18nKey={`${K}.passthrough.steps`} />
        </List>

        <Stack gap="xs">
          <Alert
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title={t(`${K}.passthrough.conflicts.title`)}
          >
            <List size="sm" spacing="xs">
              <RichItems i18nKey={`${K}.passthrough.conflicts.items`} />
            </List>
          </Alert>
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              <Rich i18nKey={`${K}.passthrough.singleController`} />
            </Text>
          </Alert>
          <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              <Rich i18nKey={`${K}.passthrough.drivers`} />
            </Text>
          </Alert>
        </Stack>
      </Paper>
    </Stack>
  );
}
