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
import {
  configureGh5Neck,
  configureRbMatrixFrets,
  configureRbShiftedFrets,
  getGuitarFamily,
  GUITAR_TARGETS,
  isGh5NeckConfigured,
  isRbMatrixConfigured,
  isRbShiftedConfigured,
  isTargetPressed,
} from '../guitarMappingUtils';

export type FretWiringMode = 'direct' | 'gh5' | 'mpr121' | 'rb_solo' | 'rb_shifted' | 'rb_split';

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
      short: 'GRN',
      color: 'green',
      active: tapGreen,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapRed'),
      short: 'RED',
      color: 'red',
      active: tapRed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapYellow'),
      short: 'YEL',
      color: 'yellow',
      active: tapYellow,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapBlue'),
      short: 'BLU',
      color: 'blue',
      active: tapBlue,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.tapOrange'),
      short: 'ORG',
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
            Touch Slider
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
    { short: 'SOLO GRN', color: 'green', pressed: soloGreen },
    { short: 'SOLO RED', color: 'red', pressed: soloRed },
    { short: 'SOLO YEL', color: 'yellow', pressed: soloYellow },
    { short: 'SOLO BLU', color: 'blue', pressed: soloBlue },
    { short: 'SOLO ORG', color: 'orange', pressed: soloOrange },
  ];

  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="xs" fw={700} c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.soloFretsHeader')}
          </Text>
          <Badge size="xs" color="violet" variant="outline">
            Solo Taps
          </Badge>
        </Group>
        <Group gap="xs" grow>
          {soloButtons.map((btn, i) => (
            <Badge key={i} size="md" color={btn.color} variant={btn.pressed ? 'filled' : 'outline'}>
              {btn.short}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}

export function FretsStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const isGh5Active = useConfigStore((state) => isGh5NeckConfigured(state));
  const isMatrixActive = useConfigStore(isRbMatrixConfigured);
  const isShiftedActive = useConfigStore(isRbShiftedConfigured);
  const family = getGuitarFamily(useConfigStore.getState());

  const [wiringMode, setWiringMode] = React.useState<FretWiringMode>(() => {
    const saved = localStorage.getItem('santroller_guitar_fret_mode');
    if (family === 'rb') {
      if (
        saved === 'rb_solo' ||
        saved === 'rb_shifted' ||
        saved === 'rb_split' ||
        saved === 'direct'
      ) {
        return saved;
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
      color: 'green',
      pressed: fretGreenPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretRed'),
      color: 'red',
      pressed: fretRedPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretYellow'),
      color: 'yellow',
      pressed: fretYellowPressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretBlue'),
      color: 'blue',
      pressed: fretBluePressed,
    },
    {
      label: t('guides.direct-pico-guitar.steps.frets.fretOrange'),
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
          { label: t('guides.direct-pico-guitar.steps.frets.methodRbSplit'), value: 'rb_split' },
          { label: t('guides.direct-pico-guitar.steps.frets.methodDirect'), value: 'direct' },
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
        <SegmentedControl
          size="sm"
          value={wiringMode}
          onChange={handleModeChange}
          data={selectorOptions}
        />
      </Stack>

      {/* 1. Direct Wiring (GH & RB) */}
      {wiringMode === 'direct' && (
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
                    <Table.Th>Neck Pin</Table.Th>
                    <Table.Th>Raspberry Pi Pico Pin</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        3.3V (VCC)
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinVcc')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="gray" size="xs">
                        GND
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinGnd')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        SDA (Data)
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinSda')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        SCL (Clock)
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t('guides.direct-pico-guitar.steps.frets.gh5PinScl')}</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>

          <Alert color="red" icon={<IconAlertTriangle size={16} />} title="3.3V Power Only">
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
                    <Table.Th>Neck Wire</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Raspberry Pi Pico Pin</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="green" size="xs">
                        Green Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Column 0 (Input)</Table.Td>
                    <Table.Td>GP2 (Pin 4)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        Red Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Column 1 (Input)</Table.Td>
                    <Table.Td>GP3 (Pin 5)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        Yellow Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Column 2 (Input)</Table.Td>
                    <Table.Td>GP4 (Pin 6)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        Blue Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Column 3 (Input)</Table.Td>
                    <Table.Td>GP5 (Pin 7)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="orange" size="xs">
                        Orange Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Column 4 (Input)</Table.Td>
                    <Table.Td>GP6 (Pin 9)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        Upper Common
                      </Badge>
                    </Table.Td>
                    <Table.Td>Row 0 (Output)</Table.Td>
                    <Table.Td>GP14 (Pin 19)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        Solo Common
                      </Badge>
                    </Table.Td>
                    <Table.Td>Row 1 (Output)</Table.Td>
                    <Table.Td>GP15 (Pin 20)</Table.Td>
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

          <Alert color="teal" icon={<IconInfoCircle size={16} />} title="No Ground Wire Needed">
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
                    <Table.Th>Neck Wire</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Raspberry Pi Pico Pin</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="green" size="xs">
                        Green Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Green Fret Line</Table.Td>
                    <Table.Td>GP2 (Pin 4)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="red" size="xs">
                        Red Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Red Fret Line</Table.Td>
                    <Table.Td>GP3 (Pin 5)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="yellow" size="xs">
                        Yellow Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Yellow Fret Line</Table.Td>
                    <Table.Td>GP4 (Pin 6)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue" size="xs">
                        Blue Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Blue Fret Line</Table.Td>
                    <Table.Td>GP5 (Pin 7)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="orange" size="xs">
                        Orange Signal
                      </Badge>
                    </Table.Td>
                    <Table.Td>Orange Fret Line</Table.Td>
                    <Table.Td>GP6 (Pin 9)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="violet" size="xs">
                        Solo Bus
                      </Badge>
                    </Table.Td>
                    <Table.Td>Solo Modifier Switch</Table.Td>
                    <Table.Td>GP12 (Pin 16)</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="gray" size="xs">
                        Common GND
                      </Badge>
                    </Table.Td>
                    <Table.Td>Ground</Table.Td>
                    <Table.Td>GND (Pin 3, 8, etc.)</Table.Td>
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
      {wiringMode === 'rb_split' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.rbSplitIntro')}</Text>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                Recommended 10-Pin Split Neck Layout
              </Text>
              <Group gap={6} wrap="wrap">
                <Badge color="green" size="sm">
                  GRN: GP2
                </Badge>
                <Badge color="red" size="sm">
                  RED: GP3
                </Badge>
                <Badge color="yellow" size="sm">
                  YEL: GP4
                </Badge>
                <Badge color="blue" size="sm">
                  BLU: GP5
                </Badge>
                <Badge color="orange" size="sm">
                  ORG: GP6
                </Badge>
                <Badge color="green" variant="outline" size="sm">
                  SOLO GRN: GP12
                </Badge>
                <Badge color="red" variant="outline" size="sm">
                  SOLO RED: GP13
                </Badge>
                <Badge color="yellow" variant="outline" size="sm">
                  SOLO YEL: GP14
                </Badge>
                <Badge color="blue" variant="outline" size="sm">
                  SOLO BLU: GP15
                </Badge>
                <Badge color="orange" variant="outline" size="sm">
                  SOLO ORG: GP16
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* 5. World Tour Slider (MPR121) */}
      {wiringMode === 'mpr121' && (
        <Stack gap="md">
          <Text size="sm">{t('guides.direct-pico-guitar.steps.frets.mpr121Intro')}</Text>

          <Title order={4}>{t('guides.direct-pico-guitar.steps.frets.mpr121StepsTitle')}</Title>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              1. Cut U2 Chip Traces
            </Text>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.frets.mpr121StepTraces')}
            </Text>
            <Image src="/guides/guitar/wt_traces.png" radius="md" alt="WT Slider PCB Traces" />
            <Text size="xs" c="dimmed" ta="center">
              {t('guides.direct-pico-guitar.steps.frets.mpr121TracesCaption')}
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600}>
              2. Solder Slider Vias to MPR121
            </Text>
            <Text size="xs" c="dimmed">
              {t('guides.direct-pico-guitar.steps.frets.mpr121StepVias')}
            </Text>
            <Image src="/guides/guitar/wt_vias.png" radius="md" alt="WT Slider Vias" />
            <Text size="xs" c="dimmed" ta="center">
              {t('guides.direct-pico-guitar.steps.frets.mpr121ViasCaption')}
            </Text>
          </Stack>

          <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={700} size="sm">
                3. MPR121 to Raspberry Pi Pico Connections
              </Text>
              <Text size="xs" c="dimmed">
                {t('guides.direct-pico-guitar.steps.frets.mpr121StepI2c')}
              </Text>
              <Group gap={6} wrap="wrap">
                <Badge color="red" size="sm">
                  VCC: 3V3 OUT (Pin 36)
                </Badge>
                <Badge color="gray" size="sm">
                  GND: Pin 38
                </Badge>
                <Badge color="blue" size="sm">
                  SDA: GP18 (Pin 24)
                </Badge>
                <Badge color="yellow" size="sm">
                  SCL: GP19 (Pin 25)
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Stack>
      )}
    </Stack>
  );

  // Mode-dependent Workbench Content
  const workbenchContent = (
    <Stack gap="sm">
      {/* Direct Mode Workbench */}
      {wiringMode === 'direct' && (
        <>
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
                {t('guides.direct-pico-guitar.steps.frets.gh5DriverCardDesc')}
              </Text>

              {isGh5Active ? (
                <Badge
                  color="teal"
                  size="md"
                  variant="filled"
                  leftSection={<IconCheck size={14} />}
                >
                  {t('guides.direct-pico-guitar.steps.frets.gh5DriverActive')}
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

          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                GH5 I2C FRET BUTTONS
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.label.split(' ')[0]}
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
                LIVE MAIN FRETS (UPPER NECK)
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.label.split(' ')[0]}
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
                LIVE MAIN FRETS (UPPER NECK)
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.label.split(' ')[0]}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>

          <SoloFretsVisualizer />
        </Stack>
      )}

      {/* RB Split Neck 10-Wire Workbench */}
      {wiringMode === 'rb_split' && (
        <>
          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.frets.benchHint')}
          </Text>

          <Text size="xs" fw={700} c="dimmed">
            MAIN FRETS (UPPER)
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

          <Text size="xs" fw={700} c="dimmed" mt="xs">
            SOLO FRETS (LOWER)
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

      {/* MPR121 Mode Workbench */}
      {wiringMode === 'mpr121' && (
        <Stack gap="md">
          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                LIVE FRET BUTTON STATUS
              </Text>
              <Group gap="xs" grow>
                {fretButtons.map((btn, i) => (
                  <Badge
                    key={i}
                    size="lg"
                    color={btn.color}
                    variant={btn.pressed ? 'filled' : 'outline'}
                  >
                    {btn.label.split(' ')[0]}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>

          <SliderBarVisualizer />
        </Stack>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.frets.title')}
      badge={
        wiringMode === 'gh5'
          ? '4-Wire I2C Neck'
          : wiringMode === 'rb_solo'
            ? '7-Wire Matrix'
            : wiringMode === 'rb_shifted'
              ? '7-Wire Solo Bus'
              : wiringMode === 'rb_split'
                ? '10-Wire Split Neck'
                : wiringMode === 'mpr121'
                  ? 'MPR121 I2C'
                  : t('guides.direct-pico-guitar.steps.frets.badge')
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
