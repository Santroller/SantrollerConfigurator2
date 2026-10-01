import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Group, Image, List, Stack, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export function NavStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.nav.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/guitar/360startselect.jpg" radius="md" alt="Xbox 360 Start Select" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.nav.x360Caption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image
            src="/guides/guitar/wiiLPstartselect.jpg"
            radius="md"
            alt="Wii Les Paul Start Select"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.nav.wiiCaption')}
          </Text>
        </Stack>
      </Group>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.nav.wiringTitle')}</Title>
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>{t('guides.direct-pico-guitar.steps.nav.navGround')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.nav.startSignal')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.nav.selectSignal')}</List.Item>
      </List>

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.direct-pico-guitar.steps.nav.comboTitle')}
      >
        {t('guides.direct-pico-guitar.steps.nav.comboDesc')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.nav.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.nav.startLabel')}
        target={GUITAR_TARGETS.START}
        color="cyan"
        recommendedPin={9}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.nav.selectLabel')}
        target={GUITAR_TARGETS.SELECT}
        color="cyan"
        recommendedPin={10}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.nav.homeLabel')}
        target={GUITAR_TARGETS.GUIDE}
        color="blue"
      />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.nav.title')}
      badge={t('guides.direct-pico-guitar.steps.nav.badge')}
      badgeColor="cyan"
      description={t('guides.direct-pico-guitar.steps.nav.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
