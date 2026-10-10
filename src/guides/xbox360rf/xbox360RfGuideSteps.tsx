import React, { useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconDeviceFloppy,
  IconInfoCircle,
  IconPlugConnected,
  IconRefresh,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { getXbox360RfModel, setXbox360RfModel, Xbox360RfModel } from './xbox360RfUtils';

// Step 1: Model Selection & Supplies Overview
export function Xbox360RfIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const [model, setModelState] = useState<Xbox360RfModel>(() => getXbox360RfModel());

  const handleModelChange = (val: Xbox360RfModel) => {
    setModelState(val);
    setXbox360RfModel(val);
  };

  const isFat = model === 'fat';

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t('guides.xbox360-rf.steps.rf-intro.modelSelectLabel')}
        </Text>
        <SegmentedControl
          size="sm"
          value={model}
          onChange={(v) => handleModelChange(v as Xbox360RfModel)}
          data={[
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelFat'),
              value: 'fat',
            },
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelSlim'),
              value: 'slim',
            },
          ]}
        />
      </Stack>

      <Text size="sm">{t('guides.xbox360-rf.steps.rf-intro.intro')}</Text>

      {isFat ? (
        <Stack gap={4}>
          <Image
            src="/guides/xbox360rf/fat-pinout.png"
            radius="md"
            alt="Xbox 360 Fat RF Module Connector Pinout"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-intro.fatPreviewCaption')}
          </Text>
        </Stack>
      ) : (
        <Stack gap={4}>
          <Image
            src="/guides/xbox360rf/slim-scheme.png"
            radius="md"
            alt="Xbox 360 Slim RF Module Wiring Scheme"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-intro.slimPreviewCaption')}
          </Text>
        </Stack>
      )}

      <Alert
        color="red"
        icon={<IconAlertTriangle size={16} />}
        title={t('guides.xbox360-rf.steps.rf-intro.voltageWarningTitle')}
      >
        {t('guides.xbox360-rf.steps.rf-intro.voltageWarningText')}
      </Alert>

      <Title order={4}>{t('guides.xbox360-rf.steps.rf-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="green"
        items={t('guides.xbox360-rf.steps.rf-intro.supplies', { returnObjects: true })}
      />

      <Title order={4}>{t('guides.xbox360-rf.steps.rf-intro.twoInterfacesTitle')}</Title>
      <Text size="sm">{t('guides.xbox360-rf.steps.rf-intro.twoInterfacesText')}</Text>
      <GuideList
        iconColor="blue"
        items={t('guides.xbox360-rf.steps.rf-intro.twoInterfacesList', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={700} size="sm">
              {t('guides.xbox360-rf.steps.rf-intro.architectureOverviewTitle')}
            </Text>
            <Badge color={isFat ? 'green' : 'teal'} size="sm" variant="light">
              {isFat
                ? t('guides.xbox360-rf.steps.rf-intro.badgeFat')
                : t('guides.xbox360-rf.steps.rf-intro.badgeSlim')}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t('guides.xbox360-rf.steps.rf-intro.architectureOverviewDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.xbox360-rf.steps.rf-intro.thSignal')}</Table.Th>
                <Table.Th>{t('guides.xbox360-rf.steps.rf-intro.thTarget')}</Table.Th>
                <Table.Th>{t('guides.xbox360-rf.steps.rf-intro.thPurpose')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    3.3V VCC
                  </Badge>
                </Table.Td>
                <Table.Td>Pico Pin 36 (3V3 OUT)</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>Pico Pin 38 (GND)</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descGnd')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="green" size="xs">
                    USB D+ / D-
                  </Badge>
                </Table.Td>
                <Table.Td>Pico USB Host or PC USB</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descUsb')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    Serial Data
                  </Badge>
                </Table.Td>
                <Table.Td>Pico GP Pin (e.g. GP4)</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descSerialData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="cyan" size="xs">
                    Serial Clock
                  </Badge>
                </Table.Td>
                <Table.Td>Pico GP Pin (e.g. GP5)</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descSerialClock')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    Sync Button (Opt)
                  </Badge>
                </Table.Td>
                <Table.Td>Pico GP Pin (e.g. GP6)</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descSync')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.xbox360-rf.steps.rf-intro.title')}
      badge={
        isFat
          ? t('guides.xbox360-rf.steps.rf-intro.badgeFat')
          : t('guides.xbox360-rf.steps.rf-intro.badgeSlim')
      }
      badgeColor={isFat ? 'green' : 'teal'}
      description={t('guides.xbox360-rf.steps.rf-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring Step (Dynamically renders chosen Fat or Slim pinout & diagram)
export function Xbox360RfWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const [model, setModelState] = useState<Xbox360RfModel>(() => getXbox360RfModel());

  const handleModelChange = (val: Xbox360RfModel) => {
    setModelState(val);
    setXbox360RfModel(val);
  };

  const isFat = model === 'fat';

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t('guides.xbox360-rf.steps.rf-intro.modelSelectLabel')}
        </Text>
        <SegmentedControl
          size="xs"
          value={model}
          onChange={(v) => handleModelChange(v as Xbox360RfModel)}
          data={[
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelFat'),
              value: 'fat',
            },
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelSlim'),
              value: 'slim',
            },
          ]}
        />
      </Stack>

      {isFat ? (
        <>
          <Text size="sm">{t('guides.xbox360-rf.steps.rf-fat.intro')}</Text>

          <Image
            src="/guides/xbox360rf/fat-pinout.png"
            radius="md"
            alt="Xbox 360 Fat RF Module Connector Pinout"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-fat.connectorCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-fat.testPointsTitle')}</Title>
          <Text size="sm">{t('guides.xbox360-rf.steps.rf-fat.testPointsDesc')}</Text>

          <Image
            src="/guides/xbox360rf/fat-test-points.jpg"
            radius="md"
            alt="Xbox 360 Fat RF Module Rev H Test Points"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-fat.testPointsCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-fat.wiringStepsTitle')}</Title>
          <GuideList
            type="ordered"
            iconColor="green"
            items={t('guides.xbox360-rf.steps.rf-fat.wiringSteps', { returnObjects: true })}
          />
        </>
      ) : (
        <>
          <Text size="sm">{t('guides.xbox360-rf.steps.rf-slim.intro')}</Text>

          <Image
            src="/guides/xbox360rf/slim-scheme.png"
            radius="md"
            alt="Xbox 360 Slim RF Module Wiring Scheme"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-slim.schemeCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-slim.wiringStepsTitle')}</Title>
          <GuideList
            type="ordered"
            iconColor="teal"
            items={t('guides.xbox360-rf.steps.rf-slim.wiringSteps', { returnObjects: true })}
          />

          <Alert
            color="blue"
            icon={<IconInfoCircle size={16} />}
            title={t('guides.xbox360-rf.steps.rf-slim.syncPinNoteTitle')}
          >
            {t('guides.xbox360-rf.steps.rf-slim.syncPinNoteText')}
          </Alert>
        </>
      )}
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={700} size="sm">
              {isFat
                ? t('guides.xbox360-rf.steps.rf-fat.pinoutTableTitle')
                : t('guides.xbox360-rf.steps.rf-slim.pinoutTableTitle')}
            </Text>
            <Badge color={isFat ? 'green' : 'teal'} size="sm" variant="light">
              {isFat ? 'Fat / RF01' : 'Slim / Trinity'}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {isFat
              ? t('guides.xbox360-rf.steps.rf-fat.pinoutTableDesc')
              : t('guides.xbox360-rf.steps.rf-slim.pinoutTableDesc')}
          </Text>

          {isFat ? (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-fat.thHeaderPin')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-fat.thTestPoint')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-fat.thFunction')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-fat.thConnectTo')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>Top Pin 1</Table.Td>
                  <Table.Td>TP18</Table.Td>
                  <Table.Td>
                    <Badge color="red" size="xs">
                      +3.3V VCC
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico Pin 36 (3V3)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Top Pin 2</Table.Td>
                  <Table.Td>TP13</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      USB D-
                    </Badge>
                  </Table.Td>
                  <Table.Td>USB D- / Host Pin</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Top Pin 3</Table.Td>
                  <Table.Td>TP14</Table.Td>
                  <Table.Td>
                    <Badge color="green" size="xs">
                      USB D+
                    </Badge>
                  </Table.Td>
                  <Table.Td>USB D+ / Host Pin</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Top Pin 4</Table.Td>
                  <Table.Td>TP9 / TP10</Table.Td>
                  <Table.Td>
                    <Badge color="gray" size="xs">
                      GND
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico Pin 38 (GND)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Bottom Pin 1</Table.Td>
                  <Table.Td>Button Contact</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      Sync / Power
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GP Pin (Optional)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Bottom Pin 2</Table.Td>
                  <Table.Td>TP16</Table.Td>
                  <Table.Td>
                    <Badge color="blue" size="xs">
                      Serial Data
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GP4</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Bottom Pin 3</Table.Td>
                  <Table.Td>TP15</Table.Td>
                  <Table.Td>
                    <Badge color="cyan" size="xs">
                      Serial Clock
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GP5</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Bottom Pin 4</Table.Td>
                  <Table.Td>TP9 / TP10</Table.Td>
                  <Table.Td>
                    <Badge color="gray" size="xs">
                      GND
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GND</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          ) : (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-slim.thSlimPin')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-slim.thColor')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-slim.thFunction')}</Table.Th>
                  <Table.Th>{t('guides.xbox360-rf.steps.rf-slim.thConnectTo')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>Pin 1 & 2</Table.Td>
                  <Table.Td>
                    <Badge color="red" size="xs">
                      Orange / Red
                    </Badge>
                  </Table.Td>
                  <Table.Td>+3.3V Power</Table.Td>
                  <Table.Td>Pico Pin 36 (3V3 OUT)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 3</Table.Td>
                  <Table.Td>
                    <Badge color="green" size="xs">
                      Green
                    </Badge>
                  </Table.Td>
                  <Table.Td>USB Data+ (D+)</Table.Td>
                  <Table.Td>USB D+ / Host Pin</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 4</Table.Td>
                  <Table.Td>
                    <Badge color="gray" size="xs">
                      Grey / White
                    </Badge>
                  </Table.Td>
                  <Table.Td>USB Data- (D-)</Table.Td>
                  <Table.Td>USB D- / Host Pin</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 5</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      Yellow
                    </Badge>
                  </Table.Td>
                  <Table.Td>Sync / Power Button</Table.Td>
                  <Table.Td>Pico GP Pin (e.g. GP6)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 6</Table.Td>
                  <Table.Td>
                    <Badge color="pink" size="xs">
                      Pink
                    </Badge>
                  </Table.Td>
                  <Table.Td>Serial Data</Table.Td>
                  <Table.Td>Pico GP4</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 7</Table.Td>
                  <Table.Td>
                    <Badge color="blue" size="xs">
                      Cyan / Blue
                    </Badge>
                  </Table.Td>
                  <Table.Td>Serial Clock</Table.Td>
                  <Table.Td>Pico GP5</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Pin 13 & 14</Table.Td>
                  <Table.Td>
                    <Badge color="dark" size="xs">
                      Black
                    </Badge>
                  </Table.Td>
                  <Table.Td>Ground (GND)</Table.Td>
                  <Table.Td>Pico Pin 38 (GND)</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={
        isFat
          ? t('guides.xbox360-rf.steps.rf-fat.title')
          : t('guides.xbox360-rf.steps.rf-slim.title')
      }
      badge={
        isFat
          ? t('guides.xbox360-rf.steps.rf-fat.badge')
          : t('guides.xbox360-rf.steps.rf-slim.badge')
      }
      badgeColor={isFat ? 'green' : 'teal'}
      description={
        isFat
          ? t('guides.xbox360-rf.steps.rf-fat.description')
          : t('guides.xbox360-rf.steps.rf-slim.description')
      }
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Live Configuration, Sync & Save
export function Xbox360RfReviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);
  const addDevice = useConfigStore((state) => state.addDevice);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const devices = useConfigStore((state) => state.config.devices);
  const scanBluetooth = useConfigStore((state) => state.scanBluetooth);
  const scanningBluetooth = useConfigStore((state) => state.scanningBluetooth);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [model, setModelState] = useState<Xbox360RfModel>(() => getXbox360RfModel());

  const handleModelChange = (val: Xbox360RfModel) => {
    setModelState(val);
    setXbox360RfModel(val);
  };

  const isFat = model === 'fat';

  const existingRfEntry = devices?.find((d) => d.xbox360Rf !== undefined && d.xbox360Rf !== null);
  const hasRfDevice = existingRfEntry !== undefined;
  const rfData = existingRfEntry?.xbox360Rf;

  const handleAddDevice = () => {
    const targetType = isFat
      ? proto.Xbox360RfModuleType.Xbox360RfFat
      : proto.Xbox360RfModuleType.Xbox360RfSlim;

    if (!hasRfDevice) {
      addDevice('xbox360Rf');
    } else if (existingRfEntry?.deviceid !== undefined) {
      updateDevice(
        {
          deviceid: existingRfEntry.deviceid,
          xbox360Rf: {
            type: targetType,
            dataPin: rfData?.dataPin ?? -1,
            clockPin: rfData?.clockPin ?? -1,
            syncPin: rfData?.syncPin ?? -1,
          },
        },
        String(existingRfEntry.deviceid)
      );
    }
  };

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
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t('guides.xbox360-rf.steps.rf-intro.modelSelectLabel')}
        </Text>
        <SegmentedControl
          size="xs"
          value={model}
          onChange={(v) => handleModelChange(v as Xbox360RfModel)}
          data={[
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelFat'),
              value: 'fat',
            },
            {
              label: t('guides.xbox360-rf.steps.rf-intro.modelSlim'),
              value: 'slim',
            },
          ]}
        />
      </Stack>

      <Text size="sm">{t('guides.xbox360-rf.steps.rf-test.intro')}</Text>

      <Title order={4}>{t('guides.xbox360-rf.steps.rf-test.syncInstructionsTitle')}</Title>
      <GuideList
        type="ordered"
        iconColor="green"
        items={t('guides.xbox360-rf.steps.rf-test.syncSteps', { returnObjects: true })}
      />

      <Button
        size="md"
        color="green"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.xbox360-rf.steps.rf-test.btnSaved')
          : t('guides.xbox360-rf.steps.rf-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.xbox360-rf.steps.rf-test.deviceControlTitle')}
            </Text>
            <Badge color={isFat ? 'green' : 'teal'} size="xs" variant="light">
              {isFat ? 'Fat / RF01' : 'Slim / Trinity'}
            </Badge>
          </Group>

          {hasRfDevice ? (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Badge
                  size="md"
                  color="green"
                  variant="filled"
                  leftSection={<IconCheck size={14} />}
                >
                  {rfData?.type === proto.Xbox360RfModuleType.Xbox360RfSlim
                    ? t('guides.xbox360-rf.steps.rf-test.moduleConfiguredSlim')
                    : t('guides.xbox360-rf.steps.rf-test.moduleConfiguredFat')}
                </Badge>
                <Text size="xs" c="dimmed">
                  Data: GP{rfData?.dataPin ?? -1} | Clock: GP{rfData?.clockPin ?? -1}
                </Text>
              </Group>

              <Button
                size="sm"
                color="indigo"
                leftSection={<IconRefresh size={16} />}
                loading={scanningBluetooth}
                disabled={!connected || scanningBluetooth}
                onClick={scanBluetooth}
              >
                {t('xbox360Rf.sync')}
              </Button>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                {t('guides.xbox360-rf.steps.rf-test.addDevicePrompt')}
              </Text>
              <Button
                size="xs"
                color={isFat ? 'green' : 'teal'}
                leftSection={<IconCpu size={14} />}
                onClick={handleAddDevice}
                disabled={!connected}
              >
                {isFat
                  ? t('guides.xbox360-rf.steps.rf-test.addFatBtn')
                  : t('guides.xbox360-rf.steps.rf-test.addSlimBtn')}
              </Button>
            </Stack>
          )}

          <Group gap="xs" mt="xs">
            <Badge
              size="md"
              color={connected ? 'teal' : 'gray'}
              variant="light"
              leftSection={<IconPlugConnected size={14} />}
            >
              {connected
                ? t('guides.xbox360-rf.steps.rf-test.picoConnected')
                : t('guides.xbox360-rf.steps.rf-test.picoDisconnected')}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.xbox360-rf.steps.rf-test.title')}
      badge={t('guides.xbox360-rf.steps.rf-test.badge')}
      badgeColor="green"
      description={t('guides.xbox360-rf.steps.rf-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.xbox360-rf.steps.rf-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
