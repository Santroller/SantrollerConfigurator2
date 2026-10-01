import React from 'react';
import { IconActivity, IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, List, Stack, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export function WhammyStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.whammy.intro')}</Text>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.whammy.potTitle')}</Title>
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>{t('guides.direct-pico-guitar.steps.whammy.potCenter')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.whammy.potOuter1')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.whammy.potOuter2')}</List.Item>
      </List>
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.whammy.invertNote')}
      </Text>

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.direct-pico-guitar.steps.whammy.warning2Wire')}
      >
        <Stack gap="xs">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.whammy.warning2WireDesc')}</Text>
          <Image
            src="/guides/guitar/2wirewhammy.jpg"
            radius="sm"
            alt="2-wire whammy modification"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.whammy.warning2WireCaption')}
          </Text>
        </Stack>
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.whammy.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.whammy.whammyLabel')}
        target={GUITAR_TARGETS.WHAMMY}
        color="grape"
        recommendedPin={26}
        isAnalog
      />

      <Alert
        color="teal"
        icon={<IconActivity size={14} />}
        title={t('guides.direct-pico-guitar.steps.whammy.verificationTitle')}
        mt="xs"
      >
        <Text size="xs">{t('guides.direct-pico-guitar.steps.whammy.verificationDesc')}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.whammy.title')}
      badge={t('guides.direct-pico-guitar.steps.whammy.badge')}
      badgeColor="grape"
      description={t('guides.direct-pico-guitar.steps.whammy.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
