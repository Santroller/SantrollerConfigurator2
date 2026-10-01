import React from 'react';
import { IconAlertCircle, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { getTargetAnalogValue, GUITAR_TARGETS, isTargetPressed } from '../guitarMappingUtils';

export function ReviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Live input states
  const greenPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_GREEN));
  const redPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_RED));
  const yellowPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_YELLOW));
  const bluePressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_BLUE));
  const orangePressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_ORANGE));

  const strumUp = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.STRUM_UP));
  const strumDown = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.STRUM_DOWN));

  const startPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.START));
  const selectPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SELECT));
  const tiltPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TILT));

  const whammyVal = useConfigStore((s) => getTargetAnalogValue(s, GUITAR_TARGETS.WHAMMY));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await commitConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save configuration to controller');
    } finally {
      setSaving(false);
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.review.finalVerificationDesc')}</Text>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.review.saveTitle')}</Title>
      <Text size="sm" c="dimmed">
        {t('guides.direct-pico-guitar.steps.review.saveDesc')}
      </Text>

      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title={t('guides.direct-pico-guitar.steps.review.saveErrorTitle')}
        >
          {error}
        </Alert>
      )}

      {saved && (
        <Alert
          color="teal"
          icon={<IconCheck size={16} />}
          title={t('guides.direct-pico-guitar.steps.review.savedSuccessTitle')}
        >
          {t('guides.direct-pico-guitar.steps.review.savedSuccessDesc')}
        </Alert>
      )}

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.direct-pico-guitar.steps.review.btnSaved')
          : t('guides.direct-pico-guitar.steps.review.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Text fw={700} size="sm">
        {t('guides.direct-pico-guitar.steps.review.liveBenchTitle')}
      </Text>

      {/* 5 Frets Bar */}
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.direct-pico-guitar.steps.review.fretsHeader')}
          </Text>
          <Group justify="space-between" gap="xs">
            <Badge size="lg" color="green" variant={greenPressed ? 'filled' : 'outline'}>
              GRN
            </Badge>
            <Badge size="lg" color="red" variant={redPressed ? 'filled' : 'outline'}>
              RED
            </Badge>
            <Badge size="lg" color="yellow" variant={yellowPressed ? 'filled' : 'outline'}>
              YEL
            </Badge>
            <Badge size="lg" color="blue" variant={bluePressed ? 'filled' : 'outline'}>
              BLU
            </Badge>
            <Badge size="lg" color="orange" variant={orangePressed ? 'filled' : 'outline'}>
              ORG
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {/* Strum & Navigation */}
      <SimpleGrid cols={2} spacing="xs">
        <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.direct-pico-guitar.steps.review.strumHeader')}
            </Text>
            <Badge color="cyan" variant={strumUp ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.review.strumUp')}
            </Badge>
            <Badge color="indigo" variant={strumDown ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.review.strumDown')}
            </Badge>
          </Stack>
        </Paper>

        <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.direct-pico-guitar.steps.review.navHeader')}
            </Text>
            <Badge color="teal" variant={startPressed ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.review.navStart')}
            </Badge>
            <Badge color="teal" variant={selectPressed ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.review.navSelect')}
            </Badge>
            <Badge color="grape" variant={tiltPressed ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.review.navTilt')}
            </Badge>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Whammy Live Progress */}
      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.direct-pico-guitar.steps.review.whammyHeader')}
            </Text>
            <Text size="xs" fw={700}>
              {whammyVal} / 65535
            </Text>
          </Group>
          <Progress
            value={(whammyVal / 65535) * 100}
            color="grape"
            size="md"
            radius="xl"
            animated={whammyVal > 500}
          />
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.review.title')}
      badge={t('guides.direct-pico-guitar.steps.review.badge')}
      badgeColor="green"
      description={t('guides.direct-pico-guitar.steps.review.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.direct-pico-guitar.steps.review.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
