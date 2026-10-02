import React from 'react';
import { IconDeviceFloppy, IconDisc } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  Group,
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
export function TurntableIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.dj-turntable.steps.tt-intro.intro')}</Text>

      <Title order={4}>{t('guides.dj-turntable.steps.tt-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="grape"
        items={t('guides.dj-turntable.steps.tt-intro.supplies', { returnObjects: true })}
      />

      <Title order={4}>{t('guides.dj-turntable.steps.tt-intro.subsystemsTitle')}</Title>
      <Text size="sm">{t('guides.dj-turntable.steps.tt-intro.subsystemsIntro')}</Text>
      <GuideList
        boldAllIfNoColon={false}
        items={t('guides.dj-turntable.steps.tt-intro.subsystems', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.dj-turntable.steps.tt-intro.pinoutTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.dj-turntable.steps.tt-intro.pinoutDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.dj-turntable.steps.tt-intro.thFeature')}</Table.Th>
                <Table.Th>{t('guides.dj-turntable.steps.tt-intro.thPicoPin')}</Table.Th>
                <Table.Th>{t('guides.dj-turntable.steps.tt-intro.thType')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Platter SDA (D)</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featurePlatterSda')}</Table.Td>
                <Table.Td>GP18 (Pin 24)</Table.Td>
                <Table.Td>I2C Data</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeI2cData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Platter SCL (C)</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featurePlatterScl')}</Table.Td>
                <Table.Td>GP19 (Pin 25)</Table.Td>
                <Table.Td>I2C Clock</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeI2cClock')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Crossfader</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featureCrossfader')}</Table.Td>
                <Table.Td>GP26 (Pin 31)</Table.Td>
                <Table.Td>ADC0 (Analog)</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeAdc0')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Effects Dial</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featureEffectsDial')}</Table.Td>
                <Table.Td>GP27 (Pin 32)</Table.Td>
                <Table.Td>ADC1 (Analog)</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeAdc1')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Platter Green</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featurePlatterGreen')}</Table.Td>
                <Table.Td>GP2 (Pin 4)</Table.Td>
                <Table.Td>Digital</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeDigital')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Platter Red</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featurePlatterRed')}</Table.Td>
                <Table.Td>GP3 (Pin 5)</Table.Td>
                <Table.Td>Digital</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeDigital')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Platter Blue</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.featurePlatterBlue')}</Table.Td>
                <Table.Td>GP4 (Pin 6)</Table.Td>
                <Table.Td>Digital</Table.Td>
                <Table.Td>{t('guides.dj-turntable.steps.tt-intro.typeDigital')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.dj-turntable.steps.tt-intro.title')}
      badge={t('guides.dj-turntable.steps.tt-intro.badge')}
      badgeColor="grape"
      description={t('guides.dj-turntable.steps.tt-intro.description')}
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
export function TurntableWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.dj-turntable.steps.tt-wiring.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.dj-turntable.steps.tt-wiring.wiringSteps', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text fw={700} size="sm">
        {t('guides.dj-turntable.steps.tt-wiring.testBenchTitle')}
      </Text>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.dj-turntable.steps.tt-wiring.platterButtonsHeader')}
          </Text>
          <Group justify="space-between">
            <Badge size="lg" color="green" variant="outline">
              {t('guides.dj-turntable.steps.tt-wiring.btnGreen')}
            </Badge>
            <Badge size="lg" color="red" variant="outline">
              {t('guides.dj-turntable.steps.tt-wiring.btnRed')}
            </Badge>
            <Badge size="lg" color="blue" variant="outline">
              {t('guides.dj-turntable.steps.tt-wiring.btnBlue')}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.dj-turntable.steps.tt-wiring.crossfaderHeader')}
            </Text>
            <Text size="xs">GP26 (ADC0)</Text>
          </Group>
          <Progress value={50} color="grape" size="md" radius="xl" />
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.dj-turntable.steps.tt-wiring.title')}
      badge={t('guides.dj-turntable.steps.tt-wiring.badge')}
      badgeColor="grape"
      description={t('guides.dj-turntable.steps.tt-wiring.description')}
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
export function TurntableReviewStep(props: GuideStepProps) {
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
      <Text size="sm">{t('guides.dj-turntable.steps.tt-test.configuredText')}</Text>

      <Title order={4}>{t('guides.dj-turntable.steps.tt-test.scratchTestTitle')}</Title>
      <Text size="sm">{t('guides.dj-turntable.steps.tt-test.scratchTestText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.dj-turntable.steps.tt-test.btnSaved')
          : t('guides.dj-turntable.steps.tt-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.dj-turntable.steps.tt-test.telemetryTitle')}
          </Text>
          <Badge size="lg" color="grape" variant="light" leftSection={<IconDisc size={16} />}>
            {t('guides.dj-turntable.steps.tt-test.encoderActiveBadge')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.dj-turntable.steps.tt-test.verifyPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.dj-turntable.steps.tt-test.title')}
      badge={t('guides.dj-turntable.steps.tt-test.badge')}
      badgeColor="green"
      description={t('guides.dj-turntable.steps.tt-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.dj-turntable.steps.tt-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
