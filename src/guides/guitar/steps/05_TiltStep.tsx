import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, List, Stack, Tabs, Text } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export function TiltStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.tilt.intro')}</Text>

      <Tabs defaultValue="digital">
        <Tabs.List>
          <Tabs.Tab value="digital">
            {t('guides.direct-pico-guitar.steps.tilt.tabDigital')}
          </Tabs.Tab>
          <Tabs.Tab value="i2c">{t('guides.direct-pico-guitar.steps.tilt.tabI2c')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="digital" pt="xs">
          <Stack gap="xs">
            <Text size="sm">{t('guides.direct-pico-guitar.steps.tilt.digitalIntro')}</Text>
            <Alert
              color="blue"
              icon={<IconInfoCircle size={16} />}
              title={t('guides.direct-pico-guitar.steps.tilt.seriesTipTitle')}
            >
              <Text size="xs">{t('guides.direct-pico-guitar.steps.tilt.seriesTipDesc')}</Text>
            </Alert>
            <List type="ordered" spacing="xs" size="sm">
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.digitalPinGnd')}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.digitalPinGp')}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.digitalMount')}</List.Item>
            </List>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="i2c" pt="xs">
          <Stack gap="xs">
            <Text size="sm">{t('guides.direct-pico-guitar.steps.tilt.i2cIntro')}</Text>
            <List type="ordered" spacing="xs" size="sm">
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cVcc')}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cGnd')}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cSda')}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cScl')}</List.Item>
            </List>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.tilt.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.tilt.tiltLabel')}
        target={GUITAR_TARGETS.TILT}
        color="teal"
        recommendedPin={11}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={14} />}
        title={t('guides.direct-pico-guitar.steps.tilt.invertTitle')}
        mt="xs"
      >
        <Text size="xs">{t('guides.direct-pico-guitar.steps.tilt.invertDesc')}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.tilt.title')}
      badge={t('guides.direct-pico-guitar.steps.tilt.badge')}
      badgeColor="teal"
      description={t('guides.direct-pico-guitar.steps.tilt.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
