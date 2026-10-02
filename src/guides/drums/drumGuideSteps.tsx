import React from 'react';
import { IconAlertTriangle, IconDeviceFloppy, IconMusic } from '@tabler/icons-react';
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
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';

// Step 1: Supplies & Intro
export function DrumIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.drum-kit.steps.drum-intro.intro')}</Text>

      <Title order={4}>{t('guides.drum-kit.steps.drum-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="orange"
        items={t('guides.drum-kit.steps.drum-intro.supplies', { returnObjects: true })}
      />

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/drums/cd4051.png" radius="md" alt="CD4051 Multiplexer" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.drum-kit.steps.drum-intro.mux4051Caption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image src="/guides/drums/cd4067.png" radius="md" alt="CD4067 Multiplexer" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.drum-kit.steps.drum-intro.mux4067Caption')}
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
            {t('guides.drum-kit.steps.drum-intro.layoutTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.drum-kit.steps.drum-intro.layoutDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.drum-kit.steps.drum-intro.thPad')}</Table.Th>
                <Table.Th>{t('guides.drum-kit.steps.drum-intro.thColor')}</Table.Th>
                <Table.Th>{t('guides.drum-kit.steps.drum-intro.thDefaultNote')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.padSnare')}</Table.Td>
                <Table.Td>
                  <Badge color="red" size="xs">
                    Red
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.notePad1')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.padHiHat')}</Table.Td>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    Yellow
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.notePad2')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.padTom2')}</Table.Td>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    Blue
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.notePad3')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.padFloorTom')}</Table.Td>
                <Table.Td>
                  <Badge color="green" size="xs">
                    Green
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.notePad4')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.padKick')}</Table.Td>
                <Table.Td>
                  <Badge color="orange" size="xs">
                    Orange
                  </Badge>
                </Table.Td>
                <Table.Td>{t('guides.drum-kit.steps.drum-intro.noteKick')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.drum-kit.steps.drum-intro.title')}
      badge={t('guides.drum-kit.steps.drum-intro.badge')}
      badgeColor="orange"
      description={t('guides.drum-kit.steps.drum-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Piezo Wiring
export function DrumPadWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.drum-kit.steps.drum-wiring.intro')}</Text>

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.drum-kit.steps.drum-wiring.polarityWarningTitle')}
      >
        {t('guides.drum-kit.steps.drum-wiring.polarityWarningText')}
      </Alert>

      <Title order={4}>{t('guides.drum-kit.steps.drum-wiring.circuitTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.drum-kit.steps.drum-wiring.wiringSteps', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text fw={700} size="sm">
        {t('guides.drum-kit.steps.drum-wiring.hitMonitorTitle')}
      </Text>
      <Text size="xs" c="dimmed">
        {t('guides.drum-kit.steps.drum-wiring.hitMonitorDesc')}
      </Text>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge color="red" size="md">
              {t('guides.drum-kit.steps.drum-wiring.padRed')}
            </Badge>
            <Text size="xs" c="dimmed">
              GP26 (ADC0)
            </Text>
          </Group>
          <Progress value={0} color="red" size="sm" radius="xl" />
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge color="yellow" size="md">
              {t('guides.drum-kit.steps.drum-wiring.padYellow')}
            </Badge>
            <Text size="xs" c="dimmed">
              GP27 (ADC1)
            </Text>
          </Group>
          <Progress value={0} color="yellow" size="sm" radius="xl" />
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge color="blue" size="md">
              {t('guides.drum-kit.steps.drum-wiring.padBlue')}
            </Badge>
            <Text size="xs" c="dimmed">
              GP28 (ADC2)
            </Text>
          </Group>
          <Progress value={0} color="blue" size="sm" radius="xl" />
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge color="green" size="md">
              {t('guides.drum-kit.steps.drum-wiring.padGreen')}
            </Badge>
            <Text size="xs" c="dimmed">
              Mux Ch 3
            </Text>
          </Group>
          <Progress value={0} color="green" size="sm" radius="xl" />
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge color="orange" size="md">
              {t('guides.drum-kit.steps.drum-wiring.padOrange')}
            </Badge>
            <Text size="xs" c="dimmed">
              GP14 (Digital)
            </Text>
          </Group>
          <Progress value={0} color="orange" size="sm" radius="xl" />
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.drum-kit.steps.drum-wiring.title')}
      badge={t('guides.drum-kit.steps.drum-wiring.badge')}
      badgeColor="red"
      description={t('guides.drum-kit.steps.drum-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Review & Save
export function DrumReviewStep(props: GuideStepProps) {
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
      <Text size="sm">{t('guides.drum-kit.steps.drum-test.calibratedText')}</Text>

      <Title order={4}>{t('guides.drum-kit.steps.drum-test.tipsTitle')}</Title>
      <Text size="sm">{t('guides.drum-kit.steps.drum-test.tipsText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.drum-kit.steps.drum-test.btnSaved')
          : t('guides.drum-kit.steps.drum-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.drum-kit.steps.drum-test.telemetryTitle')}
          </Text>
          <Badge size="lg" color="teal" variant="light" leftSection={<IconMusic size={16} />}>
            {t('guides.drum-kit.steps.drum-test.driverActiveBadge')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.drum-kit.steps.drum-test.verifyPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.drum-kit.steps.drum-test.title')}
      badge={t('guides.drum-kit.steps.drum-test.badge')}
      badgeColor="green"
      description={t('guides.drum-kit.steps.drum-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.drum-kit.steps.drum-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
