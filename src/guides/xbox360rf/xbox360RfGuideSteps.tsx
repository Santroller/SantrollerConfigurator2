import React, { useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconInfoCircle,
  IconPlugConnected,
  IconRefresh,
  IconUsb,
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
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { ensureUsbHostDevice, usbHostPins } from '../usb/usbHostUtils';
import {
  gpPin,
  picoGpPinExample,
  picoPinWithLabel,
  picoUsbHostPin,
  pinNum,
  wireColour,
  wireColours,
  WIRING,
} from '../wiringText';
import {
  addXbox360Rf,
  findXbox360RfDevice,
  getXbox360RfModel,
  setXbox360RfModel,
  Xbox360RfModel,
} from './xbox360RfUtils';

// Step 1: Model Selection & Supplies Overview
// The RF module's pins and the USB host port's: the drivers' own once they're added, which can be
// changed on the wiring step, or the ones they're added with
function useRfPins() {
  const rf = useConfigStore(findXbox360RfDevice)?.xbox360Rf;
  const usb = usbHostPins(
    useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost
  );
  const pin = (value: number | null | undefined, fallback: number) =>
    value != null && value >= 0 ? value : fallback;
  return {
    ...usb,
    data: pin(rf?.dataPin, 4),
    clock: pin(rf?.clockPin, 5),
    sync: pin(rf?.syncPin, 6),
    dpPin: gpPin(usb.dp),
    dmPin: gpPin(usb.dm),
  };
}

// The drivers' pins, which can be changed once they're added
function RfDeviceEditors() {
  return (
    <>
      <GuideDeviceEditor kind="xbox360Rf" />
      <GuideDeviceEditor kind="usbHost" />
    </>
  );
}

export function Xbox360RfIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useRfPins();
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
            src="/guides/xbox360rf/fat-pinout.jpg"
            radius="md"
            alt={t('guides.common.imageAlt.rfFatPinout')}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-intro.fatPreviewCaption')}
          </Text>
        </Stack>
      ) : (
        <Stack gap={4}>
          <Image
            src="/guides/xbox360rf/slim-scheme.jpg"
            radius="md"
            alt={t('guides.common.imageAlt.rfSlimScheme')}
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

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList
        iconColor="green"
        items={t('guides.xbox360-rf.steps.rf-intro.supplies', { returnObjects: true })}
      />

      <Title order={4}>{t('guides.xbox360-rf.steps.rf-intro.twoInterfacesTitle')}</Title>
      <Text size="sm">{t('guides.xbox360-rf.steps.rf-intro.twoInterfacesText')}</Text>
      <GuideList
        iconColor="blue"
        items={t('guides.xbox360-rf.steps.rf-intro.twoInterfacesList', {
          returnObjects: true,
          ...pins,
        })}
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
                <Table.Th>{t('guides.common.thSignal')}</Table.Th>
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
                <Table.Td>{picoPinWithLabel(36, '3V3 OUT')}</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>{picoPinWithLabel(38, 'GND')}</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descGnd')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="green" size="xs">
                    USB D+ / D-
                  </Badge>
                </Table.Td>
                <Table.Td>
                  Pico GP{pins.dp} (D+) / GP{pins.dm} (D-)
                </Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descUsb')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    {t(`${WIRING}.serialData`)}
                  </Badge>
                </Table.Td>
                <Table.Td>{picoGpPinExample(`GP${pins.data}`)}</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descSerialData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="cyan" size="xs">
                    {t(`${WIRING}.serialClock`)}
                  </Badge>
                </Table.Td>
                <Table.Td>{picoGpPinExample(`GP${pins.clock}`)}</Table.Td>
                <Table.Td>{t('guides.xbox360-rf.steps.rf-intro.descSerialClock')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    {t('guides.xbox360-rf.pinout.syncButtonOpt')}
                  </Badge>
                </Table.Td>
                <Table.Td>{picoGpPinExample(`GP${pins.sync}`)}</Table.Td>
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
  const pins = useRfPins();
  const [model, setModelState] = useState<Xbox360RfModel>(() => getXbox360RfModel());

  const handleModelChange = (val: Xbox360RfModel) => {
    setModelState(val);
    setXbox360RfModel(val);
  };

  const isFat = model === 'fat';
  const connected = useConfigStore((state) => state.connected);
  const rfDevice = useConfigStore(findXbox360RfDevice);
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const added = !!rfDevice && !!usbHost;

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
            src="/guides/xbox360rf/fat-pinout.jpg"
            radius="md"
            alt={t('guides.common.imageAlt.rfFatPinout')}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-fat.connectorCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-fat.testPointsTitle')}</Title>
          <Text size="sm">{t('guides.xbox360-rf.steps.rf-fat.testPointsDesc')}</Text>

          <Image
            src="/guides/xbox360rf/fat-test-points.jpg"
            radius="md"
            alt={t('guides.common.imageAlt.rfFatTestPoints')}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-fat.testPointsCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-fat.wiringStepsTitle')}</Title>
          <GuideList
            type="ordered"
            iconColor="green"
            items={t('guides.xbox360-rf.steps.rf-fat.wiringSteps', {
              returnObjects: true,
              ...pins,
            })}
          />
        </>
      ) : (
        <>
          <Text size="sm">{t('guides.xbox360-rf.steps.rf-slim.intro')}</Text>

          <Image
            src="/guides/xbox360rf/slim-scheme.jpg"
            radius="md"
            alt={t('guides.common.imageAlt.rfSlimScheme')}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.xbox360-rf.steps.rf-slim.schemeCaption')}
          </Text>

          <Title order={4}>{t('guides.xbox360-rf.steps.rf-slim.wiringStepsTitle')}</Title>
          <GuideList
            type="ordered"
            iconColor="teal"
            items={t('guides.xbox360-rf.steps.rf-slim.wiringSteps', {
              returnObjects: true,
              ...pins,
            })}
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

      <Alert
        color="teal"
        icon={<IconUsb size={16} />}
        title={t('guides.xbox360-rf.steps.rf-wiring.usbNoteTitle')}
      >
        {t('guides.xbox360-rf.steps.rf-wiring.usbNoteText', pins)}
      </Alert>
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
              {isFat
                ? t('guides.xbox360-rf.pinout.modelFatShort')
                : t('guides.xbox360-rf.pinout.modelSlimShort')}
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
                  <Table.Td>{t(`${WIRING}.topPin`, { n: 1 })}</Table.Td>
                  <Table.Td>TP18</Table.Td>
                  <Table.Td>
                    <Badge color="red" size="xs">
                      +3.3V VCC
                    </Badge>
                  </Table.Td>
                  <Table.Td>{picoPinWithLabel(36, '3V3')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.topPin`, { n: 2 })}</Table.Td>
                  <Table.Td>TP13</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      USB D-
                    </Badge>
                  </Table.Td>
                  <Table.Td>{picoUsbHostPin(`GP${pins.dm}`, 'D-')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.topPin`, { n: 3 })}</Table.Td>
                  <Table.Td>TP14</Table.Td>
                  <Table.Td>
                    <Badge color="green" size="xs">
                      USB D+
                    </Badge>
                  </Table.Td>
                  <Table.Td>{picoUsbHostPin(`GP${pins.dp}`, 'D+')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.topPin`, { n: 4 })}</Table.Td>
                  <Table.Td>TP9 / TP10</Table.Td>
                  <Table.Td>
                    <Badge color="gray" size="xs">
                      GND
                    </Badge>
                  </Table.Td>
                  <Table.Td>{picoPinWithLabel(38, 'GND')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.bottomPin`, { n: 1 })}</Table.Td>
                  <Table.Td>{t('guides.xbox360-rf.pinout.buttonContact')}</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      {t('guides.xbox360-rf.pinout.syncPower')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.picoGpPinOptional`)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.bottomPin`, { n: 2 })}</Table.Td>
                  <Table.Td>TP16</Table.Td>
                  <Table.Td>
                    <Badge color="blue" size="xs">
                      {t(`${WIRING}.serialData`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GP{pins.data}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.bottomPin`, { n: 3 })}</Table.Td>
                  <Table.Td>TP15</Table.Td>
                  <Table.Td>
                    <Badge color="cyan" size="xs">
                      {t(`${WIRING}.serialClock`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>Pico GP{pins.clock}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t(`${WIRING}.bottomPin`, { n: 4 })}</Table.Td>
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
                  <Table.Td>{pinNum(2)}</Table.Td>
                  <Table.Td>
                    <Badge color="pink" size="xs">
                      {wireColour('pink')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.serialData`)}</Table.Td>
                  <Table.Td>Pico GP{pins.data}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{pinNum(3)}</Table.Td>
                  <Table.Td>
                    <Badge color="blue" size="xs">
                      {wireColours('cyan', 'blue')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.serialClock`)}</Table.Td>
                  <Table.Td>Pico GP{pins.clock}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{pinNum(5)}</Table.Td>
                  <Table.Td>
                    <Badge color="gray" size="xs">
                      {wireColours('grey', 'white')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.usbDataMinus`)}</Table.Td>
                  <Table.Td>{picoUsbHostPin(`GP${pins.dm}`, 'D-')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{pinNum(6)}</Table.Td>
                  <Table.Td>
                    <Badge color="green" size="xs">
                      {wireColour('green')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.usbDataPlus`)}</Table.Td>
                  <Table.Td>{picoUsbHostPin(`GP${pins.dp}`, 'D+')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{pinNum(12)}</Table.Td>
                  <Table.Td>
                    <Badge color="orange" size="xs">
                      {wireColour('orange')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.power3v3`)}</Table.Td>
                  <Table.Td>{picoPinWithLabel(36, '3V3 OUT')}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{pinNum(13)}</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" size="xs">
                      {wireColour('yellow')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t('guides.xbox360-rf.pinout.syncPowerButton')}</Table.Td>
                  <Table.Td>{picoGpPinExample(`GP${pins.sync}`)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t('guides.xbox360-rf.pinout.mountingPad')}</Table.Td>
                  <Table.Td>
                    <Badge color="dark" size="xs">
                      {wireColour('black')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t(`${WIRING}.groundGnd`)}</Table.Td>
                  <Table.Td>{picoPinWithLabel(38, 'GND')}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.xbox360-rf.steps.rf-wiring.driverTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.xbox360-rf.steps.rf-wiring.driverDesc', pins)}
          </Text>
          {added ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.xbox360-rf.steps.rf-wiring.driverAdded')}
            </Badge>
          ) : (
            <Button
              size="sm"
              color={isFat ? 'green' : 'teal'}
              leftSection={<IconCpu size={16} />}
              onClick={() => addXbox360Rf(model)}
              disabled={!connected}
            >
              {isFat
                ? t('guides.xbox360-rf.steps.rf-sync.addFatBtn')
                : t('guides.xbox360-rf.steps.rf-sync.addSlimBtn')}
            </Button>
          )}
        </Stack>
      </Card>
      {/* Their pins, which can be changed here once they're added, and the wiring follows them */}
      <RfDeviceEditors />
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
      // Moving on adds the module and its USB port too, so they aren't missed by not pressing the button
      onNext={() => {
        if (connected && !added) {
          addXbox360Rf(model);
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 3: Live Configuration, Sync & Save
// Step 3: Adding the module and syncing controllers to it. Their profiles are made in the next step.
export function Xbox360RfSyncStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const existingRfEntry = useConfigStore(findXbox360RfDevice);
  const pins = useRfPins();
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost;
  const usbReady = usbHost != null;
  const usbPins = usbHostPins(usbHost);
  const scanBluetooth = useConfigStore((state) => state.scanBluetooth);
  const scanningBluetooth = useConfigStore((state) => state.scanningBluetooth);

  const [model, setModelState] = useState<Xbox360RfModel>(() => getXbox360RfModel());

  const handleModelChange = (val: Xbox360RfModel) => {
    setModelState(val);
    setXbox360RfModel(val);
  };

  const isFat = model === 'fat';

  const hasRfDevice = existingRfEntry !== undefined;
  const rfData = existingRfEntry?.xbox360Rf;

  const handleAddDevice = () => addXbox360Rf(model);

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

      <Text size="sm">{t('guides.xbox360-rf.steps.rf-sync.intro')}</Text>

      <Title order={4}>{t('guides.xbox360-rf.steps.rf-sync.syncInstructionsTitle')}</Title>
      <GuideList
        type="ordered"
        iconColor="green"
        items={t('guides.xbox360-rf.steps.rf-sync.syncSteps', { returnObjects: true, ...pins })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="xs" fw={600} c="dimmed">
              {t('guides.xbox360-rf.steps.rf-sync.deviceControlTitle')}
            </Text>
            <Badge color={isFat ? 'green' : 'teal'} size="xs" variant="light">
              {isFat
                ? t('guides.xbox360-rf.pinout.modelFatShort')
                : t('guides.xbox360-rf.pinout.modelSlimShort')}
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
                    ? t('guides.xbox360-rf.steps.rf-sync.moduleConfiguredSlim')
                    : t('guides.xbox360-rf.steps.rf-sync.moduleConfiguredFat')}
                </Badge>
                <Text size="xs" c="dimmed">
                  {t('guides.xbox360-rf.pinout.dataClockPins', {
                    data: rfData?.dataPin ?? -1,
                    clock: rfData?.clockPin ?? -1,
                  })}
                </Text>
              </Group>

              {usbReady ? (
                <Badge size="md" color="teal" variant="light" leftSection={<IconUsb size={14} />}>
                  {t('guides.xbox360-rf.steps.rf-sync.usbHostReady', usbPins)}
                </Badge>
              ) : (
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    {t('guides.xbox360-rf.steps.rf-sync.usbHostMissing', pins)}
                  </Text>
                  <Button
                    size="xs"
                    color="teal"
                    variant="light"
                    leftSection={<IconUsb size={14} />}
                    onClick={ensureUsbHostDevice}
                    disabled={!connected}
                  >
                    {t('guides.xbox360-rf.steps.rf-sync.addUsbHostBtn')}
                  </Button>
                </Stack>
              )}

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
                {t('guides.xbox360-rf.steps.rf-sync.addDevicePrompt')}
              </Text>
              <Button
                size="xs"
                color={isFat ? 'green' : 'teal'}
                leftSection={<IconCpu size={14} />}
                onClick={handleAddDevice}
                disabled={!connected}
              >
                {isFat
                  ? t('guides.xbox360-rf.steps.rf-sync.addFatBtn')
                  : t('guides.xbox360-rf.steps.rf-sync.addSlimBtn')}
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
                ? t('guides.xbox360-rf.steps.rf-sync.picoConnected')
                : t('guides.xbox360-rf.steps.rf-sync.picoDisconnected')}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.xbox360-rf.steps.rf-sync.title')}
      badge={t('guides.xbox360-rf.steps.rf-sync.badge')}
      badgeColor="green"
      description={t('guides.xbox360-rf.steps.rf-sync.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on adds the module and its USB port too, so they aren't missed by not pressing the button
      onNext={() => {
        if (connected && (!hasRfDevice || !usbReady)) {
          handleAddDevice();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

// Whether the module and its receiver are set up, and how many controllers are connected through it,
// shown alongside the test step
export function Xbox360RfCheck() {
  const { t } = useTranslation();
  const C = 'guides.xbox360-rf.check';
  const connected = useConfigStore((state) => state.connected);
  const rf = useConfigStore(findXbox360RfDevice);
  const usbHostStatus = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const count = Object.keys(usbHostStatus?.usbDevices ?? {}).length;
  const status = !connected
    ? t('guides.common.picoNotConnected')
    : !rf || !usbHostStatus
      ? t(`${C}.notAdded`)
      : count > 0
        ? t(`${C}.detected`, { count })
        : t(`${C}.waiting`);
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Badge
        size="lg"
        color={count > 0 ? 'teal' : rf ? 'yellow' : 'gray'}
        variant="light"
        leftSection={<IconUsb size={16} />}
        tt="none"
      >
        {status}
      </Badge>
      <Text size="xs" c="dimmed">
        {t(`${C}.prompt`)}
      </Text>
    </Stack>
  );
}
