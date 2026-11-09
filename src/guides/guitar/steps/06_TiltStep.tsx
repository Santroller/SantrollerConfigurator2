import React from 'react';
import { IconCheck, IconInfoCircle, IconPlugConnected } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  Progress,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GuideDeviceEditor } from '../../components/GuideDeviceEditor';
import { gpPin } from '../../wiringText';
import {
  configureAccelerometerTilt,
  getTargetAnalogValue,
  GUITAR_TARGETS,
  isAccelerometerTiltConfigured,
  useGuitarI2cPins,
  useTargetPin,
} from '../guitarMappingUtils';

const TILT_PIN = 11;

export function TiltStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const tiltPin = useTargetPin(GUITAR_TARGETS.TILT, TILT_PIN);
  const pins = { pin: gpPin(tiltPin), gp: `GP${tiltPin}` };
  const i2cPins = useGuitarI2cPins();
  const connected = useConfigStore((state) => state.connected);
  const isAccelActive = useConfigStore(isAccelerometerTiltConfigured);
  const tiltValue = useConfigStore((s) =>
    isAccelActive ? getTargetAnalogValue(s, GUITAR_TARGETS.TILT) : 0
  );
  const [tab, setTab] = React.useState<string | null>(() =>
    isAccelerometerTiltConfigured(useConfigStore.getState()) ? 'i2c' : 'digital'
  );

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.direct-pico-guitar.steps.tilt.intro')}</Text>

      <Tabs value={tab} onChange={setTab}>
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
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.digitalPinGp', pins)}</List.Item>
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
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cSda', i2cPins)}</List.Item>
              <List.Item>{t('guides.direct-pico-guitar.steps.tilt.i2cScl', i2cPins)}</List.Item>
            </List>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.tilt.i2cShared')}
            </Text>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );

  const digitalBench = (
    <>
      <Text size="xs" c="dimmed">
        {t('guides.direct-pico-guitar.steps.tilt.benchHint')}
      </Text>

      <InputTestRow
        label={t('guides.direct-pico-guitar.steps.tilt.tiltLabel')}
        target={GUITAR_TARGETS.TILT}
        color="teal"
        recommendedPin={TILT_PIN}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={14} />}
        title={t('guides.direct-pico-guitar.steps.tilt.invertTitle')}
        mt="xs"
      >
        <Text size="xs">{t('guides.direct-pico-guitar.steps.tilt.invertDesc')}</Text>
      </Alert>
    </>
  );

  const accelBench = (
    <>
      <Card withBorder radius="md" p="sm">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.direct-pico-guitar.steps.tilt.accelDriverTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.tilt.accelDriverDesc', i2cPins)}
          </Text>
          {isAccelActive ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.direct-pico-guitar.steps.tilt.accelDriverActive', i2cPins)}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconPlugConnected size={16} />}
              onClick={configureAccelerometerTilt}
              disabled={!connected}
            >
              {t('guides.direct-pico-guitar.steps.tilt.accelDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind="accelerometer" />

      {isAccelActive && (
        <Stack gap={2}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.tilt.accelBenchHint')}
            </Text>
            <Text size="xs" style={{ fontFamily: 'monospace' }}>
              {tiltValue} / 65535
            </Text>
          </Group>
          <Progress value={(tiltValue / 65535) * 100} color="teal" size="xs" radius="sm" />
        </Stack>
      )}

      <Alert
        color="blue"
        icon={<IconInfoCircle size={14} />}
        title={t('guides.direct-pico-guitar.steps.tilt.accelAxisTitle')}
        mt="xs"
      >
        <Text size="xs">{t('guides.direct-pico-guitar.steps.tilt.accelAxisDesc')}</Text>
      </Alert>
    </>
  );

  const workbenchContent = <Stack gap="sm">{tab === 'i2c' ? accelBench : digitalBench}</Stack>;

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.tilt.title')}
      badge={t('guides.direct-pico-guitar.steps.tilt.badge')}
      badgeColor="teal"
      description={t('guides.direct-pico-guitar.steps.tilt.description', pins)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
