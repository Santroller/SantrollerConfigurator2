import React from 'react';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Card,
  Group,
  Image,
  List,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { gpPin, IMAGE_ALT } from '../../wiringText';
import { GUITAR_TARGETS, useTargetPin } from '../guitarMappingUtils';

const STRUM_UP_PIN = 7;
const STRUM_DOWN_PIN = 8;

export type StrumWiringMode = 'direct' | 'trace_cut';

export function StrumStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const strumUp = useTargetPin(GUITAR_TARGETS.STRUM_UP, STRUM_UP_PIN);
  const strumDown = useTargetPin(GUITAR_TARGETS.STRUM_DOWN, STRUM_DOWN_PIN);
  const upPins = { pin: gpPin(strumUp), gp: `GP${strumUp}` };
  const downPins = { pin: gpPin(strumDown), gp: `GP${strumDown}` };

  const [wiringMode, setWiringMode] = React.useState<StrumWiringMode>(() => {
    const saved = localStorage.getItem('santroller_guitar_strum_mode');
    if (saved === 'direct' || saved === 'trace_cut') {
      return saved;
    }
    return 'direct';
  });

  const handleModeChange = (mode: string) => {
    const val = mode as StrumWiringMode;
    setWiringMode(val);
    localStorage.setItem('santroller_guitar_strum_mode', val);
  };

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={600} c="dimmed">
          {t('guides.direct-pico-guitar.steps.strum.wiringMethodLabel')}
        </Text>
        <SegmentedControl
          size="sm"
          value={wiringMode}
          onChange={handleModeChange}
          data={[
            { label: t('guides.direct-pico-guitar.steps.strum.methodDirect'), value: 'direct' },
            {
              label: t('guides.direct-pico-guitar.steps.strum.methodTraceCut'),
              value: 'trace_cut',
            },
          ]}
        />
      </Stack>

      {/* 1. Direct Switches / 3D-Printed Bracket */}
      {wiringMode === 'direct' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.strum.directIntro')}</Text>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.strum.directWiringTitle')}
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepGround')}</List.Item>
                <List.Item>
                  {t('guides.direct-pico-guitar.steps.strum.directStepUp', upPins)}
                </List.Item>
                <List.Item>
                  {t('guides.direct-pico-guitar.steps.strum.directStepDown', downPins)}
                </List.Item>
              </List>
              <Group gap={6} mt={4}>
                <Badge color="cyan" variant="filled">
                  {t('guides.direct-pico-guitar.steps.strum.strumUpPin', upPins)}
                </Badge>
                <Badge color="indigo" variant="filled">
                  {t('guides.direct-pico-guitar.steps.strum.strumDownPin', downPins)}
                </Badge>
                <Badge color="gray" variant="filled">
                  {t('guides.direct-pico-guitar.steps.strum.groundPin')}
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* 2. Stock Motherboard Switches (Trace Cuts) */}
      {wiringMode === 'trace_cut' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.strum.intro')}</Text>

          <Image
            src="/guides/guitar/wii-strum.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.wiiStrumPcb`)}
          />
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
              <Image
                src="/guides/guitar/trace cuts.jpg"
                radius="sm"
                alt={t(`${IMAGE_ALT}.traceCuts`)}
              />
              <Text size="xs" c="dimmed" ta="center">
                {t('guides.direct-pico-guitar.steps.strum.cutTraceCaption')}
              </Text>
            </Stack>
          </Alert>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.strum.traceCutWiringTitle')}
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepGround')}</List.Item>
                <List.Item>
                  {t('guides.direct-pico-guitar.steps.strum.directStepUp', upPins)}
                </List.Item>
                <List.Item>
                  {t('guides.direct-pico-guitar.steps.strum.directStepDown', downPins)}
                </List.Item>
              </List>
            </Stack>
          </Card>
        </Stack>
      )}
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
        recommendedPin={STRUM_UP_PIN}
      />

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.strum.strumDownLabel')}
        target={GUITAR_TARGETS.STRUM_DOWN}
        color="indigo"
        recommendedPin={STRUM_DOWN_PIN}
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
      badge={
        wiringMode === 'trace_cut'
          ? t('guides.direct-pico-guitar.steps.strum.badgeTraceCut')
          : t('guides.direct-pico-guitar.steps.strum.badge')
      }
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
