import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Group, Image, List, Stack, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { gpPin, IMAGE_ALT } from '../../wiringText';
import { GUITAR_TARGETS, useTargetPin } from '../guitarMappingUtils';

const START_PIN = 9;
const SELECT_PIN = 10;

export function NavStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const startPin = useTargetPin(GUITAR_TARGETS.START, START_PIN);
  const selectPin = useTargetPin(GUITAR_TARGETS.SELECT, SELECT_PIN);

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.nav.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image
            src="/guides/guitar/360startselect.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.xbox360StartSelect`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.nav.x360Caption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image
            src="/guides/guitar/wiiLPstartselect.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.wiiLesPaulStartSelect`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.direct-pico-guitar.steps.nav.wiiCaption')}
          </Text>
        </Stack>
      </Group>

      <Title order={4}>{t('guides.common.wiringTitle')}</Title>
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>{t('guides.direct-pico-guitar.steps.nav.navGround')}</List.Item>
        <List.Item>
          {t('guides.direct-pico-guitar.steps.nav.startSignal', { pin: gpPin(startPin) })}
        </List.Item>
        <List.Item>
          {t('guides.direct-pico-guitar.steps.nav.selectSignal', { pin: gpPin(selectPin) })}
        </List.Item>
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
        recommendedPin={START_PIN}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.nav.selectLabel')}
        target={GUITAR_TARGETS.SELECT}
        color="cyan"
        recommendedPin={SELECT_PIN}
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
      description={t('guides.direct-pico-guitar.steps.nav.description', {
        start: `GP${startPin}`,
        select: `GP${selectPin}`,
      })}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
