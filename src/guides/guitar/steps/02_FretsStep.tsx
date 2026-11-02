import React from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  List,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import { GuideDeviceEditor } from '../../components/GuideDeviceEditor';
import { IMAGE_ALT } from '../../wiringText';
import {
  configureDirectGpioFrets,
  configureGh5Neck,
  configureMpr121Slider,
  configureRbMatrixFrets,
  configureRbShiftedFrets,
  getGuitarFamily,
  GUITAR_TARGETS,
  isGh5NeckConfigured,
  isMpr121Configured,
  isRbMatrixConfigured,
  isRbShiftedConfigured,
  isTargetPressed,
  removeRbMatrixFrets,
  removeRbShiftedFrets,
  useGuitarI2cPins,
} from '../guitarMappingUtils';

export type FretWiringMode = 'direct' | 'gh5' | 'mpr121' | 'rb_solo' | 'rb_shifted';

export function SliderBarVisualizer() {
  const { t } = useTranslation();
  const tapGreen = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TAP_GREEN));
  const tapRed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TAP_RED));
  const tapYellow = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TAP_YELLOW));
  const tapBlue = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TAP_BLUE));
  const tapOrange = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.TAP_ORANGE));

  const zones = [
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapGreen'),
      short: t('guides.direct-pico-guitar.steps.frets.shortGreen'),
      color: 'green',
      active: tapGreen,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapRed'),
      short: t('guides.direct-pico-guitar.steps.frets.shortRed'),
      color: 'red',
      active: tapRed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapYellow'),
      short: t('guides.direct-pico-guitar.steps.frets.shortYellow'),
      color: 'yellow',
      active: tapYellow,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapBlue'),
      short: t('guides.direct-pico-guitar.steps.frets.shortBlue'),
      color: 'blue',
      active: tapBlue,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapOrange'),
      short: t('guides.direct-pico-guitar.steps.frets.shortOrange'),
      color: 'orange',
      active: tapOrange,
    },
  ];

  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="xs" fw={700} c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.sliderTitle')}
          </Text>
          <Badge size="xs" color="gray" variant="outline">
            {t('guides.direct-pico-guitar.steps.frets.sliderBadge')}
          </Badge>
        </Group>

        <Group gap={6} grow>
          {zones.map((zone, idx) => (
            <Paper
              key={idx}
              p="xs"
              radius="sm"
              ta="center"
              bg={
                zone.active
                  ? `var(--mantine-color-${zone.color}-filled)`
                  : 'var(--mantine-color-default)'
              }
              c={zone.active ? 'white' : undefined}
              style={{
                border: `1px solid ${
                  zone.active
                    ? `var(--mantine-color-${zone.color}-filled)`
                    : 'var(--mantine-color-default-border)'
                }`,
                transition: 'all 100ms ease',
                fontWeight: zone.active ? 700 : 500,
                transform: zone.active ? 'scale(1.04)' : 'none',
              }}
            >
              <Text size="xs" fw={700}>
                {zone.short}
              </Text>
            </Paper>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}

export function SoloFretsVisualizer() {
  const { t } = useTranslation();
  const soloGreen = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SOLO_GREEN));
  const soloRed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SOLO_RED));
  const soloYellow = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SOLO_YELLOW));
  const soloBlue = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SOLO_BLUE));
  const soloOrange = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.SOLO_ORANGE));

  const soloButtons = [
    {
      short: t('guides.direct-pico-guitar.steps.frets.shortGreen'),
      color: 'green',
      pressed: soloGreen,
    },
    { short: t('guides.direct-pico-guitar.steps.frets.shortRed'), color: 'red', pressed: soloRed },
    {
      short: t('guides.direct-pico-guitar.steps.frets.shortYellow'),
      color: 'yellow',
      pressed: soloYellow,
    },
    {
      short: t('guides.direct-pico-guitar.steps.frets.shortBlue'),
      color: 'blue',
      pressed: soloBlue,
    },
    {
      short: t('guides.direct-pico-guitar.steps.frets.shortOrange'),
      color: 'orange',
      pressed: soloOrange,
    },
  ];

  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="xs" fw={700} c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.soloFretsHeader')}
          </Text>
          <Badge size="xs" color="violet" variant="outline">
            {t('guides.direct-pico-guitar.steps.frets.soloTapsBadge')}
          </Badge>
        </Group>
        <Group gap="xs" grow>
          {soloButtons.map((btn, i) => (
            <Badge key={i} size="md" color={btn.color} variant={btn.pressed ? 'filled' : 'outline'}>
              {t('guides.direct-pico-guitar.steps.frets.soloShort', { fret: btn.short })}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}

export function FretsStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const i2cPins = useGuitarI2cPins();
  const connected = useConfigStore((state) => state.connected);
  const isGh5Active = useConfigStore((state) => isGh5NeckConfigured(state));
  const isMatrixActive = useConfigStore(isRbMatrixConfigured);
  const isShiftedActive = useConfigStore(isRbShiftedConfigured);
  const isMpr121Active = useConfigStore(isMpr121Configured);
  const family = getGuitarFamily(useConfigStore.getState());

  const [wiringMode, setWiringMode] = React.useState<FretWiringMode>(() => {
    const saved = localStorage.getItem('santroller_guitar_fret_mode');
    if (family === 'rb') {
      if (saved === 'rb_solo' || saved === 'rb_shifted' || saved === 'direct') {
        return saved;
      }
      // The split neck method was folded into Direct GPIO
      if (saved === 'rb_split') {
        return 'direct';
      }
      if (isShiftedActive) {
        return 'rb_shifted';
      }
      if (isMatrixActive) {
        return 'rb_solo';
      }
      return 'rb_solo';
    }
    if (saved === 'direct' || saved === 'gh5' || saved === 'mpr121') {
      return saved;
    }
    return isGh5Active ? 'gh5' : 'direct';
  });

  const handleModeChange = (mode: string) => {
    const val = mode as FretWiringMode;
    setWiringMode(val);
    localStorage.setItem('santroller_guitar_fret_mode', val);

    // Free the pins and fret mappings of the RB methods that this one replaces (the matrix rows on
    // GP14 / GP15 clash with direct wiring's solo frets), then put the frets back on the GP2-GP6
    // lines the neck was already wired to
    const removedMatrix = val !== 'rb_solo' && removeRbMatrixFrets();
    const removedShifted = val !== 'rb_shifted' && removeRbShiftedFrets();
    if ((removedMatrix || removedShifted) && val === 'direct') {
      configureDirectGpioFrets();
    }
  };

  const handleEnableGh5 = () => {
    configureGh5Neck();
  };

  const handleEnableRbMatrix = () => {
    configureRbMatrixFrets();
  };

  const handleEnableRbShifted = () => {
    configureRbShiftedFrets();
  };

  const fretGreenPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_GREEN));
  const fretRedPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_RED));
  const fretYellowPressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_YELLOW));
  const fretBluePressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_BLUE));
  const fretOrangePressed = useConfigStore((s) => isTargetPressed(s, GUITAR_TARGETS.FRET_ORANGE));

  const fretButtons = [
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretGreen'),
      short: t('guides.direct-pico-guitar.steps.frets.shortGreen'),
      color: 'green',
      pressed: fretGreenPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretRed'),
      short: t('guides.direct-pico-guitar.steps.frets.shortRed'),
      color: 'red',
      pressed: fretRedPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretYellow'),
      short: t('guides.direct-pico-guitar.steps.frets.shortYellow'),
      color: 'yellow',
      pressed: fretYellowPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretBlue'),
      short: t('guides.direct-pico-guitar.steps.frets.shortBlue'),
      color: 'blue',
      pressed: fretBluePressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretOrange'),
      short: t('guides.direct-pico-guitar.steps.frets.shortOrange'),
      color: 'orange',
      pressed: fretOrangePressed,
    },
  ];

  // Options adapt to Guitar Hero vs Rock Band
  const selectorOptions =
    family === 'rb'
      ? [
          { label: t('guides.direct-pico-guitar.steps.frets.methodRbSolo'), value: 'rb_solo' },
          {
            label: t('guides.direct-pico-guitar.steps.frets.methodRbShifted'),
            value: 'rb_shifted',
          },
          { label: t('guides.direct-pico-guitar.steps.frets.methodDirectRb'), value: 'direct' },
        ]
      : [
          { label: t('guides.direct-pico-guitar.steps.frets.methodDirect'), value: 'direct' },
          { label: t('guides.direct-pico-guitar.steps.frets.methodGh5'), value: 'gh5' },
          { label: t('guides.direct-pico-guitar.steps.frets.methodMpr121'), value: 'mpr121' },
        ];

  // Mode-dependent Guide Content
  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={600} c="dimmed">
          {t('guides.direct-pico-guitar.steps.frets.wiringMethodLabel')}
        </Text>
        {/* Stacked, as the RB labels don't fit side by side in the guide column */}
        <SegmentedControl
          size="sm"
          orientation="vertical"
          fullWidth
          value={wiringMode}
          onChange={handleModeChange}
          data={selectorOptions}
        />
      </Stack>

      {/* 1. Direct Wiring (GH & RB) */}
      {wiringMode === 'direct' && (
        <Stack gap="md">
          <Text size="sm">
            {family === 'rb'
              ? t('guides.direct-pico-guitar.steps.frets.introRb')
              : t('guides.direct-pico-guitar.steps.frets.intro')}
          </Text>

          {family === 'rb' && (
            <Card withBorder radius="md" p="sm">
              <Stack gap="xs">
                <Text fw={700} size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.directRbLayoutTitle')}
                </Text>
                <Group gap={6} wrap="wrap">
                  {fretButtons.map((btn, i) => (
                    <Badge key={btn.color} color={btn.color} size="sm">
                      {t('guides.direct-pico-guitar.steps.frets.pinBadge', {
                        label: btn.short,
                        pin: 2 + i,
                      })}
                    </Badge>
                  ))}
                  {fretButtons.map((btn, i) => (
                    <Badge key={`solo-${btn.color}`} color={btn.color} variant="outline" size="sm">
                      {t('guides.direct-pico-guitar.steps.frets.pinBadge', {
                        label: t('guides.direct-pico-guitar.steps.frets.soloShort', {
                          fret: btn.short,
                        }),
                        pin: 12 + i,
                      })}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            </Card>
          )}

          <Image
            src="/guides/guitar/xplorer.jpg"
            radius="md"
            alt={t(`${IMAGE_ALT}.fretPcbTraces`)}
          />
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
      )}

      {/* 2. GH5 I2C Neck (GH only) */}
      {wiringMode === 'gh5' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.gh5Intro')}</Text>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.gh5PinoutTitle')}
              </Text>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thNeckPin')}</Table.Th>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thPicoPin')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.neckVcc')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinVcc')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="gray" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.neckGnd')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinGnd')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.neckSda')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.gh5PinSda', i2cPins)}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.neckScl')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.gh5PinScl', i2cPins)}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>

          <Alert
            color="red"
            icon={<IconAlertTriangle size={16} />}
            title={t('guides.direct-pico-guitar.steps.frets.gh5VoltageTitle')}
          >
            {t('guides.direct-pico-guitar.steps.frets.gh5VoltageWarning')}
          </Alert>
        </Stack>
      )}

      {/* 3. Rock Band 7-Wire Matrix (RB) */}
      {wiringMode === 'rb_solo' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.rbSoloIntro')}</Text>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.rbSoloMatrixTitle')}
              </Text>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thNeckWire')}</Table.Th>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thRole')}</Table.Th>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thPicoPin')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="green" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireGreen')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleColumn', { n: 0 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 2, pin: 4 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireRed')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleColumn', { n: 1 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 3, pin: 5 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireYellow')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleColumn', { n: 2 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 4, pin: 6 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireBlue')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleColumn', { n: 3 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 5, pin: 7 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="orange" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireOrange')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleColumn', { n: 4 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 6, pin: 9 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireUpperCommon')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleRow', { n: 0 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 14, pin: 19 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireSoloCommon')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.roleRow', { n: 1 })}
                    </Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 15, pin: 20 })}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>

          <Card withBorder radius="md" p="sm">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text fw={700} size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.rbSoloDriverTitle')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('guides.direct-pico-guitar.steps.frets.rbSoloDriverDesc')}
                </Text>
              </Stack>
              {isMatrixActive ? (
                <Badge color="teal" variant="light" size="sm" leftSection={<IconCheck size={12} />}>
                  {t('guides.direct-pico-guitar.steps.frets.rbSoloDriverActive')}
                </Badge>
              ) : (
                <Button
                  size="xs"
                  color="violet"
                  leftSection={<IconPlugConnected size={14} />}
                  onClick={handleEnableRbMatrix}
                >
                  {t('guides.direct-pico-guitar.steps.frets.rbSoloDriverBtn')}
                </Button>
              )}
            </Group>
          </Card>

          <Alert
            color="teal"
            icon={<IconInfoCircle size={16} />}
            title={t('guides.direct-pico-guitar.steps.frets.rbSoloNoGndTitle')}
          >
            {t('guides.direct-pico-guitar.steps.frets.rbSoloMatrixNoGnd')}
          </Alert>
        </Stack>
      )}

      {/* 3b. Rock Band 7-Wire Shifted Dual Contact (RB) */}
      {wiringMode === 'rb_shifted' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.rbShiftedIntro')}</Text>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.rbShiftedMatrixTitle')}
              </Text>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thNeckWire')}</Table.Th>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thRole')}</Table.Th>
                    <Table.Th>{t('guides.direct-pico-guitar.steps.frets.thPicoPin')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="green" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireGreen')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleFretLine')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 2, pin: 4 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireRed')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleFretLine')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 3, pin: 5 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireYellow')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleFretLine')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 4, pin: 6 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireBlue')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleFretLine')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 5, pin: 7 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="orange" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireOrange')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleFretLine')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 6, pin: 9 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireSoloBus')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleSoloSwitch')}</Table.Td>
                    <Table.Td>
                      {t('guides.direct-pico-guitar.steps.frets.picoPin', { gp: 12, pin: 16 })}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="gray" size="xs">
                        {t('guides.direct-pico-guitar.steps.frets.wireGround')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.roleGround')}</Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.picoGnd')}</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>

          <Card withBorder radius="md" p="sm">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text fw={700} size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.rbShiftedDriverTitle')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('guides.direct-pico-guitar.steps.frets.rbShiftedDriverDesc')}
                </Text>
              </Stack>
              {isShiftedActive ? (
                <Badge color="teal" variant="light" size="sm" leftSection={<IconCheck size={12} />}>
                  {t('guides.direct-pico-guitar.steps.frets.rbShiftedDriverActive')}
                </Badge>
              ) : (
                <Button
                  size="xs"
                  color="violet"
                  leftSection={<IconPlugConnected size={14} />}
                  onClick={handleEnableRbShifted}
                >
                  {t('guides.direct-pico-guitar.steps.frets.rbShiftedDriverBtn')}
                </Button>
              )}
            </Group>
          </Card>

          <Alert
            color="teal"
            icon={<IconInfoCircle size={16} />}
            title={t('guides.direct-pico-guitar.steps.frets.pullUpTitle')}
          >
            {t('guides.direct-pico-guitar.steps.frets.pullUpText')}
          </Alert>
        </Stack>
      )}

      {/* 4. Rock Band Split Neck (RB) */}

      {/* 5. World Tour Slider (MPR121) */}
      {wiringMode === 'mpr121' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.mpr121Intro')}</Text>

          <Title order={4}>{t('guides.direct-pico-guitar.steps.frets.mpr121StepsTitle')}</Title>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('guides.direct-pico-guitar.steps.frets.mpr121TracesTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.frets.mpr121StepTraces')}
            </Text>
            <Image
              src="/guides/guitar/wt_traces.jpg"
              radius="md"
              alt={t(`${IMAGE_ALT}.wtSliderTraces`)}
            />
            <Text size="xs" c="dimmed" ta="center">
              {t('guides.direct-pico-guitar.steps.frets.mpr121TracesCaption')}
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('guides.direct-pico-guitar.steps.frets.mpr121ViasTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.frets.mpr121StepVias')}
            </Text>
            <Image
              src="/guides/guitar/wt_vias.jpg"
              radius="md"
              alt={t(`${IMAGE_ALT}.wtSliderVias`)}
            />
            <Text size="xs" c="dimmed" ta="center">
              {t('guides.direct-pico-guitar.steps.frets.mpr121ViasCaption')}
            </Text>
          </Stack>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.mpr121I2cTitle')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.mpr121StepI2c', i2cPins)}
              </Text>
              <Group gap={6} wrap="wrap">
                <Badge color="red" size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.mpr121Vcc')}
                </Badge>
                <Badge color="gray" size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.mpr121Gnd')}
                </Badge>
                <Badge color="blue" size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.mpr121Sda', i2cPins)}
                </Badge>
                <Badge color="yellow" size="sm">
                  {t('guides.direct-pico-guitar.steps.frets.mpr121Scl', i2cPins)}
                </Badge>
              </Group>
            </Stack>
          </Card>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('guides.direct-pico-guitar.steps.frets.mpr121FretsTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.frets.mpr121StepFrets')}
            </Text>
          </Stack>
        </Stack>
      )}
    </Stack>
  );

  const directFretRows = (
    <>
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
    </>
  );

  // Mode-dependent Workbench Content
  const workbenchContent = (
    <Stack gap="sm">
      {/* Direct Mode Workbench */}
      {wiringMode === 'direct' && family !== 'rb' && (
        <>
          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.benchHint')}
          </Text>

          {directFretRows}
        </>
      )}

      {/* RB Direct Mode Workbench (upper and solo frets each on their own pin) */}
      {wiringMode === 'direct' && family === 'rb' && (
        <>
          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.benchHint')}
          </Text>

          <Text size="xs" fw={700} c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.splitUpperHeader')}
          </Text>
          {directFretRows}

          <Text size="xs" fw={700} c="dimmed" mt="xs">
            {t('guides.direct-pico-guitar.steps.frets.splitSoloHeader')}
          </Text>
          <InputTestRow
            label={t('guides.direct-pico-guitar.steps.frets.soloGreen')}
            target={GUITAR_TARGETS.SOLO_GREEN}
            color="green"
            recommendedPin={12}
          />
          <InputTestRow
            label={t('guides.direct-pico-guitar.steps.frets.soloRed')}
            target={GUITAR_TARGETS.SOLO_RED}
            color="red"
            recommendedPin={13}
          />
          <InputTestRow
            label={t('guides.direct-pico-guitar.steps.frets.soloYellow')}
            target={GUITAR_TARGETS.SOLO_YELLOW}
            color="yellow"
            recommendedPin={14}
          />
          <InputTestRow
            label={t('guides.direct-pico-guitar.steps.frets.soloBlue')}
            target={GUITAR_TARGETS.SOLO_BLUE}
            color="blue"
            recommendedPin={15}
          />
          <InputTestRow
            label={t('guides.direct-pico-guitar.steps.frets.soloOrange')}
            target={GUITAR_TARGETS.SOLO_ORANGE}
            color="orange"
            recommendedPin={16}
          />
        </>
      )}

      {/* GH5 Mode Workbench */}
      {wiringMode === 'gh5' && (
        <Stack gap="md">
          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.gh5DriverCardTitle')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.gh5DriverCardDesc', i2cPins)}
              </Text>

              {isGh5Active ? (
                <Badge
                  color="teal"
                  size="md"
                  variant="filled"
                  leftSection={<IconCheck size={14} />}
                >
                  {t('guides.direct-pico-guitar.steps.frets.gh5DriverActive', i2cPins)}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  color="teal"
                  leftSection={<IconPlugConnected size={16} />}
                  onClick={handleEnableGh5}
                  disabled={!connected}
                >
                  {t('guides.direct-pico-guitar.steps.frets.gh5DriverBtn')}
                </Button>
              )}
            </Stack>
          </Card>
          {/* Its pins, which can be changed here once it's added, and the wiring follows them */}
          <GuideDeviceEditor kind="gh5Neck" />

          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.gh5FretsHeader')}
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.short}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>

          <SliderBarVisualizer />
        </Stack>
      )}

      {/* RB 7-Wire Matrix Mode Workbench */}
      {wiringMode === 'rb_solo' && (
        <Stack gap="md">
          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.upperFretsHeader')}
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.short}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>

          <SoloFretsVisualizer />
        </Stack>
      )}

      {/* RB 7-Wire Shifted Mode Workbench */}
      {wiringMode === 'rb_shifted' && (
        <Stack gap="md">
          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.upperFretsHeader')}
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.short}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>

          <SoloFretsVisualizer />
        </Stack>
      )}

      {/* MPR121 Mode Workbench */}
      {wiringMode === 'mpr121' && (
        <Stack gap="md">
          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                {t('guides.direct-pico-guitar.steps.frets.mpr121DriverTitle')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.mpr121DriverDesc', i2cPins)}
              </Text>

              {isMpr121Active ? (
                <Badge
                  color="teal"
                  size="md"
                  variant="filled"
                  leftSection={<IconCheck size={14} />}
                >
                  {t('guides.direct-pico-guitar.steps.frets.mpr121DriverActive', i2cPins)}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  color="teal"
                  leftSection={<IconPlugConnected size={16} />}
                  onClick={configureMpr121Slider}
                  disabled={!connected}
                >
                  {t('guides.direct-pico-guitar.steps.frets.mpr121DriverBtn')}
                </Button>
              )}
            </Stack>
          </Card>
          <GuideDeviceEditor kind="mpr121" />

          <SliderBarVisualizer />

          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.benchHint')}
          </Text>
          {directFretRows}
        </Stack>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.frets.title')}
      badge={
        wiringMode === 'direct'
          ? t('guides.direct-pico-guitar.steps.frets.badge')
          : t(`guides.direct-pico-guitar.steps.frets.badgeModes.${wiringMode}`)
      }
      badgeColor={family === 'rb' ? 'violet' : 'green'}
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
