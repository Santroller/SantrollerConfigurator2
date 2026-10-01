import React from 'react';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, List, Stack, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export function StrumStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.strum.intro')}</Text>

      <Image src="/guides/guitar/wii-strum.jpg" radius="md" alt="Wii Strum PCB" />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.direct-pico-guitar.steps.strum.strumPcbCaption')}
      </Text>

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.direct-pico-guitar.steps.strum.cutTraceTitle')}
      >
        <Stack gap="xs">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.strum.cutTraceDesc1')}</Text>
          <Text size="sm">{t('guides.direct-pico-guitar.steps.strum.cutTraceDesc2')}</Text>
          <Image src="/guides/guitar/trace cuts.jpg" radius="sm" alt="Trace cuts on PCB" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.strum.cutTraceCaption')}
          </Text>
        </Stack>
      </Alert>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.strum.wiringInstructions')}</Title>
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>{t('guides.direct-pico-guitar.steps.strum.strumGround')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.strum.strumUpSignal')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.strum.strumDownSignal')}</List.Item>
      </List>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.strum.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.strum.strumUpLabel')}
        target={GUITAR_TARGETS.STRUM_UP}
        color="cyan"
        recommendedPin={7}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.strum.strumDownLabel')}
        target={GUITAR_TARGETS.STRUM_DOWN}
        color="indigo"
        recommendedPin={8}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={14} />}
        title={t('guides.direct-pico-guitar.steps.strum.debounceTitle')}
        mt="xs"
      >
        <Text size="xs">{t('guides.direct-pico-guitar.steps.strum.debounceDesc')}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.strum.title')}
      badge={t('guides.direct-pico-guitar.steps.strum.badge')}
      badgeColor="cyan"
      description={t('guides.direct-pico-guitar.steps.strum.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
