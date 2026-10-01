import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Group, Image, List, Stack, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export function FretsStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.intro')}</Text>

      <Image src="/guides/guitar/x360-wt.jpg" radius="md" alt="Fret PCB traces" />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.direct-pico-guitar.steps.frets.pcbCaption')}
      </Text>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.frets.howToWire')}</Title>
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>{t('guides.direct-pico-guitar.steps.frets.stepGround')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.frets.stepMultimeter')}</List.Item>
        <List.Item>{t('guides.direct-pico-guitar.steps.frets.stepSolderGround')}</List.Item>
        <List.Item>
          {t('guides.direct-pico-guitar.steps.frets.stepSolderSignals')}
          <Group gap={6} mt={6} wrap="wrap">
            <Badge color="green" variant="filled">
              {t('guides.direct-pico-guitar.steps.frets.greenPin')}
            </Badge>
            <Badge color="red" variant="filled">
              {t('guides.direct-pico-guitar.steps.frets.redPin')}
            </Badge>
            <Badge color="yellow" variant="filled">
              {t('guides.direct-pico-guitar.steps.frets.yellowPin')}
            </Badge>
            <Badge color="blue" variant="filled">
              {t('guides.direct-pico-guitar.steps.frets.bluePin')}
            </Badge>
            <Badge color="orange" variant="filled">
              {t('guides.direct-pico-guitar.steps.frets.orangePin')}
            </Badge>
          </Group>
        </List.Item>
      </List>

      <Alert
        color="teal"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.direct-pico-guitar.steps.frets.pullUpTitle')}
      >
        {t('guides.direct-pico-guitar.steps.frets.pullUpText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.frets.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.frets.fretGreen')}
        target={GUITAR_TARGETS.FRET_GREEN}
        color="green"
        recommendedPin={2}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.frets.fretRed')}
        target={GUITAR_TARGETS.FRET_RED}
        color="red"
        recommendedPin={3}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.frets.fretYellow')}
        target={GUITAR_TARGETS.FRET_YELLOW}
        color="yellow"
        recommendedPin={4}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.frets.fretBlue')}
        target={GUITAR_TARGETS.FRET_BLUE}
        color="blue"
        recommendedPin={5}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.frets.fretOrange')}
        target={GUITAR_TARGETS.FRET_ORANGE}
        color="orange"
        recommendedPin={6}
      />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.frets.title')}
      badge={t('guides.direct-pico-guitar.steps.frets.badge')}
      badgeColor="green"
      description={t('guides.direct-pico-guitar.steps.frets.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
