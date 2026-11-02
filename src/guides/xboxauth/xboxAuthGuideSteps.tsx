import React, { useState } from 'react';
import {
  IconArrowRight,
  IconCheck,
  IconCpu,
  IconDeviceFloppy,
  IconPlugConnected,
  IconUsb,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideDeviceEditor } from '../components/GuideDeviceEditor';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { findDeviceStatus } from '../guideConfig';
import { GuideStepProps } from '../types';
import { ensureUsbHostDevice, usbHostPins } from '../usb/usbHostUtils';
import { gpPin, IMAGE_ALT, labelWithPin, pinWithLabel } from '../wiringText';
import {
  addAuthChip,
  authChipPinsSet,
  findAuthChip,
  getXboxAuthMethod,
  saveXboxAuthMethod,
  XBOX_AUTH_I2C,
  XboxAuthMethod,
} from './xboxAuthSetup';

const P = 'guides.xbox-auth.steps';

function useAuthMethod(): [XboxAuthMethod, (method: XboxAuthMethod) => void] {
  const [method, setMethod] = useState<XboxAuthMethod>(() => getXboxAuthMethod());
  return [
    method,
    (next) => {
      saveXboxAuthMethod(next);
      setMethod(next);
    },
  ];
}

function MethodPicker({
  method,
  onChange,
}: {
  method: XboxAuthMethod;
  onChange: (method: XboxAuthMethod) => void;
}) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      fullWidth
      value={method}
      onChange={(value) => onChange(value as XboxAuthMethod)}
      data={[
        { value: 'usb', label: t(`${P}.auth-wiring.methodUsb`) },
        { value: 'chip', label: t(`${P}.auth-wiring.methodChip`) },
      ]}
    />
  );
}

// Step 1: Overview
export function XboxAuthIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.auth-intro.intro`)}</Text>

      <Title order={4}>{t(`${P}.auth-intro.consolesTitle`)}</Title>
      <GuideList iconColor="green" items={t(`${P}.auth-intro.consoles`, { returnObjects: true })} />

      <Title order={4}>{t(`${P}.auth-intro.suppliesTitle`)}</Title>
      <GuideList iconColor="teal" items={t(`${P}.auth-intro.supplies`, { returnObjects: true })} />

      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          component={Link}
          to="/compatibility"
          rightSection={<IconArrowRight size={14} />}
        >
          {t(`${P}.auth-intro.compatibilityLink`)}
        </Button>
      </Group>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group gap="xs">
            <IconUsb size={18} />
            <Text fw={700} size="sm">
              {t(`${P}.auth-intro.usbTitle`)}
            </Text>
          </Group>
          <Text size="xs">{t(`${P}.auth-intro.usbBody`)}</Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.auth-intro.usbNote`)}
          </Text>
        </Stack>
      </Card>
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Group gap="xs">
            <IconCpu size={18} />
            <Text fw={700} size="sm">
              {t(`${P}.auth-intro.chipTitle`)}
            </Text>
          </Group>
          <Text size="xs">{t(`${P}.auth-intro.chipBody`)}</Text>
        </Stack>
      </Card>
      <Text size="xs" c="dimmed">
        {t(`${P}.auth-intro.priorityNote`)}
      </Text>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.auth-intro.title`)}
      badge={t(`${P}.auth-intro.badge`)}
      badgeColor="green"
      description={t(`${P}.auth-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// The pins for each way of authenticating: the drivers' own once they're added, which can be changed
// on the wiring step, or the ones they're added with
function useAuthPins() {
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost;
  const i2c = useConfigStore(findAuthChip)?.device.xboxOneAuth?.i2c;
  const usb = usbHostPins(usbHost);
  const sda = i2c?.sda != null && i2c.sda >= 0 ? i2c.sda : XBOX_AUTH_I2C.sda;
  const scl = i2c?.scl != null && i2c.scl >= 0 ? i2c.scl : XBOX_AUTH_I2C.scl;
  return {
    ...usb,
    sda,
    scl,
    dpPin: gpPin(usb.dp),
    dmPin: gpPin(usb.dm),
    sdaPin: gpPin(sda),
    sclPin: gpPin(scl),
  };
}

function UsbHostSetup() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const usbHost = useConfigStore((state) => findDeviceStatus(state, 'usbHost'))?.device.usbHost;
  const pins = usbHostPins(usbHost);

  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.auth-wiring.usbSetupTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.auth-wiring.usbSetupDesc`, pins)}
        </Text>
        <Table striped withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('guides.common.thSignal')}</Table.Th>
              <Table.Th>{t('guides.common.thPicoPin')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>VBUS (5V)</Table.Td>
              <Table.Td>{pinWithLabel(40, 'VBUS')}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>GND</Table.Td>
              <Table.Td>{pinWithLabel(38, 'GND')}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>D+</Table.Td>
              <Table.Td>GP{pins.dp}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>D-</Table.Td>
              <Table.Td>GP{pins.dm}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        {/* A donor answers the console as soon as it's plugged in, so no profile needs a slot for it */}
        {usbHost ? (
          <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${P}.auth-wiring.usbConfiguredBadge`, pins)}
          </Badge>
        ) : (
          <Button
            size="sm"
            color="teal"
            leftSection={<IconUsb size={16} />}
            onClick={ensureUsbHostDevice}
            disabled={!connected}
          >
            {t(`${P}.auth-wiring.usbEnableBtn`)}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

function AuthChipSetup() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const chip = useConfigStore(findAuthChip)?.device.xboxOneAuth;
  const configured = authChipPinsSet(chip);
  const resetPin = chip?.resetPin ?? -1;
  const pins = useAuthPins();

  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.auth-wiring.chipSetupTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.auth-wiring.chipSetupDesc`)}
        </Text>
        <Table striped withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('guides.common.thSignal')}</Table.Th>
              <Table.Th>{t('guides.common.thPicoPin')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>SDA</Table.Td>
              <Table.Td>{pins.sdaPin}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>SCL</Table.Td>
              <Table.Td>{pins.sclPin}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>3.3V</Table.Td>
              <Table.Td>{labelWithPin('3V3(OUT)', 36)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>GND</Table.Td>
              <Table.Td>{labelWithPin('GND', 38)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>{t(`${P}.auth-wiring.resetLabel`)}</Table.Td>
              <Table.Td>
                {resetPin >= 0 ? `GP${resetPin}` : t(`${P}.auth-wiring.resetNotSet`)}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        {configured ? (
          <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${P}.auth-wiring.chipConfiguredBadge`, {
              sda: chip?.i2c.sda,
              scl: chip?.i2c.scl,
            })}
          </Badge>
        ) : (
          <Button
            size="sm"
            color="grape"
            leftSection={<IconCpu size={16} />}
            onClick={() => addAuthChip()}
            disabled={!connected}
          >
            {t(`${P}.auth-wiring.chipAddBtn`)}
          </Button>
        )}
        <Button
          size="xs"
          variant="subtle"
          component={Link}
          to="/devices"
          rightSection={<IconArrowRight size={14} />}
        >
          {t(`${P}.auth-wiring.devicesLink`)}
        </Button>
      </Stack>
    </Card>
  );
}

// Step 2: Wiring
export function XboxAuthWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useAuthPins();
  const [method, setMethod] = useAuthMethod();

  const guideContent = (
    <Stack gap="md">
      <MethodPicker method={method} onChange={setMethod} />
      {method === 'usb' ? (
        <>
          <Text size="sm">{t(`${P}.auth-wiring.usbIntro`)}</Text>
          <Image src="/guides/usb/usb.svg" radius="md" alt={t(`${IMAGE_ALT}.usbHostCable`)} />
          <Text size="xs" c="dimmed" ta="center">
            {t(`${P}.auth-wiring.usbCaption`)}
          </Text>
          <Title order={4}>{t(`${P}.auth-wiring.stepsTitle`)}</Title>
          <GuideList
            type="ordered"
            items={t(`${P}.auth-wiring.usbSteps`, { returnObjects: true, ...pins })}
          />
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              component={Link}
              to="/guides/usb-host"
              rightSection={<IconArrowRight size={14} />}
            >
              {t(`${P}.auth-wiring.usbGuideLink`)}
            </Button>
          </Group>
        </>
      ) : (
        <>
          <Text size="sm">{t(`${P}.auth-wiring.chipIntro`)}</Text>
          <Image
            src="/guides/xoneauth/image.png"
            radius="md"
            maw={356}
            mx="auto"
            alt={t(`${IMAGE_ALT}.xboxOneAuthChip`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t(`${P}.auth-wiring.chipPinoutCaption`)}
          </Text>
          <Title order={4}>{t(`${P}.auth-wiring.stepsTitle`)}</Title>
          <GuideList
            type="ordered"
            items={t(`${P}.auth-wiring.chipSteps`, { returnObjects: true, ...pins })}
          />
          <Alert color="yellow" variant="light" title={t(`${P}.auth-wiring.chipWarningTitle`)}>
            <Text size="xs">{t(`${P}.auth-wiring.chipWarning`)}</Text>
          </Alert>
        </>
      )}
    </Stack>
  );

  // The driver's pins, which can be changed here once it's added, and the wiring follows them
  const workbenchContent =
    method === 'usb' ? (
      <Stack gap="sm">
        <UsbHostSetup />
        <GuideDeviceEditor kind="usbHost" />
      </Stack>
    ) : (
      <Stack gap="sm">
        <AuthChipSetup />
        <GuideDeviceEditor kind="xboxOneAuth" />
      </Stack>
    );

  return (
    <StepWorkbench
      title={t(`${P}.auth-wiring.title`)}
      badge={t(`${P}.auth-wiring.badge`)}
      badgeColor="blue"
      description={t(`${P}.auth-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

function UsbHostStatus() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const usbHostStatus = useConfigStore((state) => findDeviceStatus(state, 'usbHost'));
  const devices = Object.values(usbHostStatus?.usbDevices ?? {}) as { name?: string | null }[];

  return (
    <Stack gap="xs">
      {!usbHostStatus ? (
        <Badge size="lg" color="gray" variant="light" leftSection={<IconUsb size={16} />}>
          {t(`${P}.auth-test.usbNotConfigured`)}
        </Badge>
      ) : connected && devices.length > 0 ? (
        <Badge size="lg" color="teal" variant="light" leftSection={<IconPlugConnected size={16} />}>
          {t(`${P}.auth-test.usbDetected`, { count: devices.length })}
        </Badge>
      ) : (
        <Badge size="lg" color="yellow" variant="light" leftSection={<IconUsb size={16} />}>
          {t(`${P}.auth-test.usbWaiting`)}
        </Badge>
      )}
      {connected &&
        devices.map((device, idx) => (
          <Text key={idx} size="xs">
            {device.name || t(`${P}.auth-test.unnamedDevice`)}
          </Text>
        ))}
      <Text size="xs" c="dimmed">
        {!usbHostStatus
          ? t(`${P}.auth-test.usbNotConfiguredPrompt`)
          : connected
            ? t(`${P}.auth-test.usbVerifyPrompt`)
            : t(`${P}.auth-test.connectPrompt`)}
      </Text>
    </Stack>
  );
}

function AuthChipStatus() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const chip = useConfigStore(findAuthChip);
  const configured = authChipPinsSet(chip?.device.xboxOneAuth);

  return (
    <Stack gap="xs">
      {!chip || !configured ? (
        <Badge size="lg" color="gray" variant="light" leftSection={<IconCpu size={16} />}>
          {t(`${P}.auth-test.chipNotConfigured`)}
        </Badge>
      ) : connected && chip.connected ? (
        <Badge size="lg" color="teal" variant="light" leftSection={<IconCheck size={16} />}>
          {t(`${P}.auth-test.chipReady`)}
        </Badge>
      ) : (
        <Badge size="lg" color="yellow" variant="light" leftSection={<IconCpu size={16} />}>
          {t(`${P}.auth-test.chipNotDetected`)}
        </Badge>
      )}
      <Text size="xs" c="dimmed">
        {!chip || !configured
          ? t(`${P}.auth-test.chipNotConfiguredPrompt`)
          : !connected
            ? t(`${P}.auth-test.connectPrompt`)
            : chip.connected
              ? t(`${P}.auth-test.chipReadyPrompt`)
              : t(`${P}.auth-test.chipNotDetectedPrompt`)}
      </Text>
    </Stack>
  );
}

// Step 3: Test & Save
export function XboxAuthTestStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pins = useAuthPins();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);
  const [method, setMethod] = useAuthMethod();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <MethodPicker method={method} onChange={setMethod} />
      <Text size="sm">{t(`${P}.auth-test.saveText`)}</Text>
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
          {saved ? t('guides.common.btnSaved') : t(`${P}.auth-test.btnSave`)}
        </Button>
      )}

      <Title order={4}>{t(`${P}.auth-test.consoleTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.auth-test.${method === 'usb' ? 'consoleStepsUsb' : 'consoleStepsChip'}`, {
          returnObjects: true,
        })}
      />

      <Title order={4}>{t(`${P}.auth-test.troubleTitle`)}</Title>
      <GuideList
        iconColor="orange"
        items={t(`${P}.auth-test.${method === 'usb' ? 'troubleUsb' : 'troubleChip'}`, {
          returnObjects: true,
          ...pins,
        })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed">
          {t(`${P}.auth-test.${method === 'usb' ? 'usbStatusTitle' : 'chipStatusTitle'}`)}
        </Text>
        {method === 'usb' ? <UsbHostStatus /> : <AuthChipStatus />}
      </Stack>
    </Paper>
  );

  return (
    <StepWorkbench
      title={t(`${P}.auth-test.title`)}
      badge={t(`${P}.auth-test.badge`)}
      badgeColor="green"
      description={t(`${P}.auth-test.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
