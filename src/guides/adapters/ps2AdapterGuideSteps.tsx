import React from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconDeviceFloppy,
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
import { GuideStepProps } from '../types';

// Step 1: Supplies & Overview
export function PS2IntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.ps2-adapter.steps.ps2-intro.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/ps2/ps2.png" radius="md" alt="PS2 plug pinout" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.ps2-adapter.steps.ps2-intro.plugCaption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image src="/guides/ps2/ps2-pinout.png" radius="md" alt="PS2 adapter wiring" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.ps2-adapter.steps.ps2-intro.socketCaption')}
          </Text>
        </Stack>
      </Group>

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
                <Table.Td>Pin 5 (Blue)</Table.Td>
                <Table.Td>GP6 (Pin 9)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="orange">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigMosi')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 2 (Orange)</Table.Td>
                <Table.Td>GP3 (Pin 5)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="yellow">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigMiso')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 1 (Brown)</Table.Td>
                <Table.Td>GP4 (Pin 6) + 1kΩ to 3V3</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="green">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigAck')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 9 (Green)</Table.Td>
                <Table.Td>GP7 (Pin 10) + 1kΩ to 3V3</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="grape">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigAtt')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 6 (Yellow)</Table.Td>
                <Table.Td>GP10 (Pin 14)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="red">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigPower')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 4 (Red)</Table.Td>
                <Table.Td>Pin 36 (3V3 OUT)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge size="xs" color="gray">
                    {t('guides.ps2-adapter.steps.ps2-intro.sigGnd')}
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 7 (Black)</Table.Td>
                <Table.Td>Pin 38 (GND)</Table.Td>
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
  const addDevice = useConfigStore((state) => state.addDevice);
  const devices = useConfigStore((state) => state.config.devices);
  const connected = useConfigStore((state) => state.connected);

  const hasPs2Device = devices?.some((d) => d.psx !== undefined && d.psx !== null);

  const handleConfigurePS2 = () => {
    if (!hasPs2Device) {
      addDevice('psx');
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.ps2-adapter.steps.ps2-wiring.solderingTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.ps2-adapter.steps.ps2-wiring.solderingSteps', { returnObjects: true })}
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

          {hasPs2Device ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.ps2-adapter.steps.ps2-wiring.driverConfiguredBadge')}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconPlugConnected size={16} />}
              onClick={handleConfigurePS2}
              disabled={!connected}
            >
              {t('guides.ps2-adapter.steps.ps2-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
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
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Verification
export function PS2ReviewStep(props: GuideStepProps) {
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
        title={t('guides.ps2-adapter.steps.ps2-test.adapterReadyTitle')}
      >
        {t('guides.ps2-adapter.steps.ps2-test.adapterReadyText')}
      </Alert>

      <Title order={4}>{t('guides.ps2-adapter.steps.ps2-test.testTitle')}</Title>
      <Text size="sm">{t('guides.ps2-adapter.steps.ps2-test.testText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.ps2-adapter.steps.ps2-test.btnSaved')
          : t('guides.ps2-adapter.steps.ps2-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.ps2-adapter.steps.ps2-test.telemetryTitle')}
          </Text>
          <Badge
            size="lg"
            color="teal"
            variant="light"
            leftSection={<IconPlugConnected size={16} />}
          >
            {t('guides.ps2-adapter.steps.ps2-test.driverActiveBadge')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.ps2-adapter.steps.ps2-test.verifyPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.ps2-adapter.steps.ps2-test.title')}
      badge={t('guides.ps2-adapter.steps.ps2-test.badge')}
      badgeColor="green"
      description={t('guides.ps2-adapter.steps.ps2-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.ps2-adapter.steps.ps2-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
