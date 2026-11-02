import React, { useState } from 'react';
import {
  IconAlertTriangle,
  IconBulb,
  IconBulbOff,
  IconCheck,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  NumberInput,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { InactivitySettings } from '@/components/Inputs/InactivitySettings';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { gpPin, IMAGE_ALT, pinWithLabel, WIRING } from '../wiringText';
import {
  addLedDevice,
  APA102_MOSI_PIN,
  APA102_SCK_PIN,
  DEFAULT_LED_COUNT,
  findLedDevice,
  getLedChipType,
  LedChipType,
  setLedChipType,
  setLedCount,
  WS2812_DATA_PIN,
} from './ledUtils';

// The LEDs' pins: the device's own once it's added, which can be changed on the wiring step, or the
// ones it's added with
function useLedPins() {
  const device = useConfigStore(findLedDevice);
  const data = device?.ws2812?.pin ?? WS2812_DATA_PIN;
  const sck = device?.apa102?.spi?.sck ?? APA102_SCK_PIN;
  const mosi = device?.apa102?.spi?.mosi ?? APA102_MOSI_PIN;
  return {
    data,
    sck,
    mosi,
    dataPin: gpPin(data),
    sckPin: gpPin(sck),
    mosiPin: gpPin(mosi),
  };
}

function useLedChipType() {
  const device = useConfigStore(findLedDevice);
  const [chosen, setChosen] = useState<LedChipType>(() => getLedChipType());
  // An existing LED device fixes the type; otherwise the picked type is remembered
  const chipType: LedChipType = device ? (device.apa102 ? 'apa102' : 'ws2812') : chosen;
  const setChipType = (type: LedChipType) => {
    setChosen(type);
    setLedChipType(type);
  };
  return { device, chipType, setChipType };
}

function LedChipTypeSelect({
  chipType,
  onChange,
  disabled,
}: {
  chipType: LedChipType;
  onChange: (type: LedChipType) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={4}>
      <Text size="xs" fw={700} c="dimmed">
        {t('guides.rgb-leds.steps.led-intro.typeSelectLabel')}
      </Text>
      <SegmentedControl
        size="sm"
        value={chipType}
        disabled={disabled}
        onChange={(v) => onChange(v as LedChipType)}
        data={[
          { label: t('guides.rgb-leds.steps.led-intro.typeWs2812'), value: 'ws2812' },
          { label: t('guides.rgb-leds.steps.led-intro.typeApa102'), value: 'apa102' },
        ]}
      />
    </Stack>
  );
}

// Step 1: Supplies & Intro
export function LedIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useLedPins();
  const { device, chipType, setChipType } = useLedChipType();
  const isApa102 = chipType === 'apa102';

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.rgb-leds.steps.led-intro.intro')}</Text>

      <LedChipTypeSelect chipType={chipType} onChange={setChipType} disabled={device != null} />

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList
        iconColor="pink"
        items={t('guides.rgb-leds.steps.led-intro.supplies', { returnObjects: true })}
      />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.rgb-leds.steps.led-intro.levelShiftTitle')}
      >
        {t('guides.rgb-leds.steps.led-intro.levelShiftText')}
      </Alert>

      <Title order={4}>{t('guides.rgb-leds.steps.led-intro.inlineTitle')}</Title>
      <Text size="sm">{t('guides.rgb-leds.steps.led-intro.inlineText')}</Text>
      <Group grow align="start">
        <Stack gap={4}>
          <Image
            src="/guides/leds/inline-led.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.inlineFretLeds`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.rgb-leds.steps.led-intro.inlineCaption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image
            src="/guides/leds/led.png"
            radius="md"
            alt={t(`${IMAGE_ALT}.inlineFretLedSchematic`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.rgb-leds.steps.led-intro.schematicCaption')}
          </Text>
        </Stack>
      </Group>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.rgb-leds.steps.led-intro.pinoutTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {isApa102
              ? t('guides.rgb-leds.steps.led-intro.pinoutDescApa102')
              : t('guides.rgb-leds.steps.led-intro.pinoutDescWs2812', pins)}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.rgb-leds.steps.led-intro.thLedPin')}</Table.Th>
                <Table.Th>{t('guides.common.thPicoPin')}</Table.Th>
                <Table.Th>{t('guides.rgb-leds.steps.led-intro.thDescription')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    5V (VCC)
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithLabel(40, 'VBUS')}</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>{pinWithLabel(38, 'GND')}</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descGround')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    {t(`${WIRING}.dataIn`, { id: isApa102 ? 'DI' : 'DIN' })}
                  </Badge>
                </Table.Td>
                <Table.Td>{isApa102 ? pins.mosiPin : pins.dataPin}</Table.Td>
                <Table.Td>
                  {isApa102
                    ? t('guides.rgb-leds.steps.led-intro.descDataApa102')
                    : t('guides.rgb-leds.steps.led-intro.descData')}
                </Table.Td>
              </Table.Tr>
              {isApa102 && (
                <Table.Tr>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      {t(`${WIRING}.clockIn`, { id: 'CI' })}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{pins.sckPin}</Table.Td>
                  <Table.Td>{t('guides.rgb-leds.steps.led-intro.descClock')}</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          {isApa102 && (
            <Text size="xs" c="dimmed">
              {t('guides.rgb-leds.steps.led-intro.apa102PinNote')}
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.rgb-leds.steps.led-intro.title')}
      badge={t('guides.rgb-leds.steps.led-intro.badge')}
      badgeColor="pink"
      description={t('guides.rgb-leds.steps.led-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring
export function LedWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useLedPins();
  const connected = useConfigStore((state) => state.connected);
  const { device, chipType, setChipType } = useLedChipType();
  const isApa102 = chipType === 'apa102';
  const [pendingCount, setPendingCount] = useState(DEFAULT_LED_COUNT);
  const deviceCount = device?.apa102?.count ?? device?.ws2812?.count;
  const count = deviceCount ?? pendingCount;

  const handleCountChange = (val: string | number) => {
    const next = Math.max(1, Math.min(255, Number(val) || 1));
    if (device) {
      setLedCount(device, next);
    } else {
      setPendingCount(next);
    }
  };

  const guideContent = (
    <Stack gap="md">
      <LedChipTypeSelect chipType={chipType} onChange={setChipType} disabled={device != null} />

      <Title order={4}>{t('guides.common.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={
          isApa102
            ? t('guides.rgb-leds.steps.led-wiring.wiringStepsApa102', {
                returnObjects: true,
                ...pins,
              })
            : t('guides.rgb-leds.steps.led-wiring.wiringSteps', { returnObjects: true, ...pins })
        }
      />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.rgb-leds.steps.led-intro.levelShiftTitle')}
      >
        {t('guides.rgb-leds.steps.led-intro.levelShiftText')}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.rgb-leds.steps.led-wiring.driverConfigTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {isApa102
              ? t('guides.rgb-leds.steps.led-wiring.driverConfigDescApa102', pins)
              : t('guides.rgb-leds.steps.led-wiring.driverConfigDescWs2812', pins)}
          </Text>

          <NumberInput
            size="xs"
            label={t('guides.rgb-leds.steps.led-wiring.ledCountLabel')}
            min={1}
            max={255}
            value={count}
            onChange={handleCountChange}
          />

          {device ? (
            <Badge color="pink" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.rgb-leds.steps.led-wiring.driverConfiguredBadge', { count })}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="pink"
              leftSection={<IconBulb size={16} />}
              onClick={() => addLedDevice(chipType, count)}
              disabled={!connected}
            >
              {isApa102
                ? t('guides.rgb-leds.steps.led-wiring.addApa102Btn')
                : t('guides.rgb-leds.steps.led-wiring.addWs2812Btn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
      <GuideDeviceEditor kind={isApa102 ? 'apa102' : 'ws2812'} />

      <Text fw={700} size="sm">
        {t('guides.rgb-leds.steps.led-wiring.previewTitle')}
      </Text>

      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.rgb-leds.steps.led-wiring.previewHeader')}
          </Text>
          <Group justify="space-between">
            <Badge size="lg" color="green" variant="filled">
              {t('guides.rgb-leds.steps.led-wiring.ledGreen')}
            </Badge>
            <Badge size="lg" color="red" variant="filled">
              {t('guides.rgb-leds.steps.led-wiring.ledRed')}
            </Badge>
            <Badge size="lg" color="yellow" variant="filled">
              {t('guides.rgb-leds.steps.led-wiring.ledYellow')}
            </Badge>
            <Badge size="lg" color="blue" variant="filled">
              {t('guides.rgb-leds.steps.led-wiring.ledBlue')}
            </Badge>
            <Badge size="lg" color="orange" variant="filled">
              {t('guides.rgb-leds.steps.led-wiring.ledOrange')}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.rgb-leds.steps.led-wiring.title')}
      badge={t('guides.rgb-leds.steps.led-wiring.badge')}
      badgeColor="pink"
      description={t('guides.rgb-leds.steps.led-wiring.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Review & Save
export function LedReviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);
  const device = useConfigStore(findLedDevice);

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await commitConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        {device
          ? t('guides.rgb-leds.steps.led-test.configuredText')
          : t('guides.rgb-leds.steps.led-test.notConfiguredText')}
      </Text>

      <Title order={4}>{t('guides.rgb-leds.steps.led-test.syncTitle')}</Title>
      <Text size="sm">{t('guides.rgb-leds.steps.led-test.syncText')}</Text>
      <InactivitySettings ledOnly />

      {/* The setup guide saves in a step of its own */}
      {!props.nested && (
        <Button
          size="md"
          color="teal"
          disabled={!connected}
          loading={saving}
          leftSection={<IconDeviceFloppy size={18} />}
          onClick={handleSave}
        >
          {saved ? t('guides.common.btnSaved') : t('guides.rgb-leds.steps.led-test.btnSave')}
        </Button>
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.rgb-leds.steps.led-test.driverStatusTitle')}
          </Text>
          {device ? (
            <Badge size="lg" color="pink" variant="light" leftSection={<IconBulb size={16} />}>
              {device.apa102
                ? t('guides.rgb-leds.steps.led-test.driverActiveApa102', {
                    count: device.apa102.count,
                  })
                : t('guides.rgb-leds.steps.led-test.driverActiveWs2812', {
                    count: device.ws2812?.count,
                  })}
            </Badge>
          ) : (
            <Badge size="lg" color="gray" variant="light" leftSection={<IconBulbOff size={16} />}>
              {t('guides.rgb-leds.steps.led-test.driverMissingBadge')}
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            {device
              ? t('guides.rgb-leds.steps.led-test.verifyPrompt')
              : t('guides.rgb-leds.steps.led-test.notConfiguredPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.rgb-leds.steps.led-test.title')}
      badge={t('guides.rgb-leds.steps.led-test.badge')}
      badgeColor="green"
      description={t('guides.rgb-leds.steps.led-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
