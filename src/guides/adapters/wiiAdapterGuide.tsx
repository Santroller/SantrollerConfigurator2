import React from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconDeviceFloppy,
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
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideDefinition, GuideStepProps } from '../types';

// Step 1: Overview
function WiiIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.wii-adapter.steps.wii-intro.intro')}</Text>

      <Image src="/guides/wii/adaptor.jpg" radius="md" alt="Wii Guitar Adapter" />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.wii-adapter.steps.wii-intro.adapterCaption')}
      </Text>

      <Title order={4}>{t('guides.wii-adapter.steps.wii-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="cyan"
        items={t('guides.wii-adapter.steps.wii-intro.supplies', { returnObjects: true })}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.wii-adapter.steps.wii-intro.noDisassemblyTitle')}
      >
        {t('guides.wii-adapter.steps.wii-intro.noDisassemblyText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.wii-adapter.steps.wii-intro.quickStartTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.wii-adapter.steps.wii-intro.quickStartDesc')}
          </Text>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thWiiPin')}</Table.Th>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thPicoPin')}</Table.Th>
                <Table.Th>{t('guides.wii-adapter.steps.wii-intro.thFunction')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    3.3V (VCC)
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 36 (3V3 OUT)</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 38 (GND)</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnGround')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    SDA (Data)
                  </Badge>
                </Table.Td>
                <Table.Td>GP18 (Pin 24)</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    SCL (Clock)
                  </Badge>
                </Table.Td>
                <Table.Td>GP19 (Pin 25)</Table.Td>
                <Table.Td>{t('guides.wii-adapter.steps.wii-intro.fnClock')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.wii-adapter.steps.wii-intro.title')}
      badge={t('guides.wii-adapter.steps.wii-intro.badge')}
      badgeColor="cyan"
      description={t('guides.wii-adapter.steps.wii-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring
function WiiWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const addDevice = useConfigStore((state) => state.addDevice);
  const devices = useConfigStore((state) => state.config.devices);
  const connected = useConfigStore((state) => state.connected);

  const hasWiiDevice = devices?.some((d) => d.wii !== undefined && d.wii !== null);

  const handleConfigureWii = () => {
    if (!hasWiiDevice) {
      addDevice('wii');
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.wii-adapter.steps.wii-wiring.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/wii/wii-ext.jpg" radius="md" alt="Wii extension socket pinout" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.wii-adapter.steps.wii-wiring.socketCaption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image src="/guides/wii/wii.png" radius="md" alt="Wii schematic" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.wii-adapter.steps.wii-wiring.schematicCaption')}
          </Text>
        </Stack>
      </Group>

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.wii-adapter.steps.wii-wiring.voltageWarningTitle')}
      >
        {t('guides.wii-adapter.steps.wii-wiring.voltageWarningText')}
      </Alert>

      <Alert
        color="orange"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.wii-adapter.steps.wii-wiring.wireColorWarningTitle')}
      >
        {t('guides.wii-adapter.steps.wii-wiring.wireColorWarningText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.wii-adapter.steps.wii-wiring.deviceStatusTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.wii-adapter.steps.wii-wiring.deviceStatusDesc')}
          </Text>

          {hasWiiDevice ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.wii-adapter.steps.wii-wiring.driverConfiguredBadge')}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconPlugConnected size={16} />}
              onClick={handleConfigureWii}
              disabled={!connected}
            >
              {t('guides.wii-adapter.steps.wii-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.wii-adapter.steps.wii-wiring.title')}
      badge={t('guides.wii-adapter.steps.wii-wiring.badge')}
      badgeColor="blue"
      description={t('guides.wii-adapter.steps.wii-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Live Verification
function WiiReviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
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
      <Alert
        color="teal"
        icon={<IconCheck size={18} />}
        title={t('guides.wii-adapter.steps.wii-test.adapterReadyTitle')}
      >
        {t('guides.wii-adapter.steps.wii-test.adapterReadyText')}
      </Alert>

      <Title order={4}>{t('guides.wii-adapter.steps.wii-test.plugInTitle')}</Title>
      <Text size="sm">{t('guides.wii-adapter.steps.wii-test.plugInText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.wii-adapter.steps.wii-test.btnSaved')
          : t('guides.wii-adapter.steps.wii-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.wii-adapter.steps.wii-test.telemetryTitle')}
          </Text>
          <Badge
            size="lg"
            color="teal"
            variant="light"
            leftSection={<IconPlugConnected size={16} />}
          >
            {t('guides.wii-adapter.steps.wii-test.channel1Active')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.wii-adapter.steps.wii-test.verifyPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.wii-adapter.steps.wii-test.title')}
      badge={t('guides.wii-adapter.steps.wii-test.badge')}
      badgeColor="green"
      description={t('guides.wii-adapter.steps.wii-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.wii-adapter.steps.wii-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

export const WII_ADAPTER_GUITAR_GUIDE: GuideDefinition = {
  id: 'wii-adapter',
  title: 'Wii Controller & Guitar to USB Adapter',
  subtitle: 'Plug-and-Play I2C Adapter for Wii Guitars',
  description:
    'Build an adapter using a Raspberry Pi Pico to use any Wii Guitar Hero or Rock Band guitar on PC or console with zero soldering to the guitar itself.',
  category: 'adapters',
  difficulty: 'beginner',
  estimatedTime: '20 - 30 mins',
  featured: true,
  badge: 'Beginner Friendly',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'Wii Extension Socket / Breakout',
    'Soldering Iron',
    '4 Wires',
  ],
  steps: [
    {
      id: 'wii-intro',
      title: 'Supplies & Overview',
      shortTitle: 'Supplies',
      description: '4-wire I2C setup overview and parts list.',
      render: WiiIntroStep,
    },
    {
      id: 'wii-wiring',
      title: 'Wii Pinout & Wiring',
      shortTitle: 'Wiring',
      description: 'Connect 3.3V, GND, SDA (GP18), and SCL (GP19).',
      badge: '4 Wires',
      render: WiiWiringStep,
    },
    {
      id: 'wii-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Plug in your guitar, verify extension detection, and save to flash.',
      badge: 'Save to Pico',
      render: WiiReviewStep,
    },
  ],
};
