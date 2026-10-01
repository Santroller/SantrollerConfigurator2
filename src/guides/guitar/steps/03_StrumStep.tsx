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
import { GUITAR_TARGETS } from '../guitarMappingUtils';

export type StrumWiringMode = 'direct' | 'trace_cut';

export function StrumStep(props: GuideStepProps) {
  const { t } = useTranslation();

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
                3-Wire Strum Connection
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepGround')}</List.Item>
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepUp')}</List.Item>
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepDown')}</List.Item>
              </List>
              <Group gap={6} mt={4}>
                <Badge color="cyan" variant="filled">
                  Strum Up: GP7
                </Badge>
                <Badge color="indigo" variant="filled">
                  Strum Down: GP8
                </Badge>
                <Badge color="gray" variant="filled">
                  Common Ground: GND
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

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                Wiring After Trace Cuts
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepGround')}</List.Item>
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepUp')}</List.Item>
                <List.Item>{t('guides.direct-pico-guitar.steps.strum.directStepDown')}</List.Item>
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
      badge={
        wiringMode === 'trace_cut'
          ? 'Stock PCB Mod'
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
