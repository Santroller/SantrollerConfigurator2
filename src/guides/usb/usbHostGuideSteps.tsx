import React from 'react';
import { IconCheck, IconDeviceFloppy, IconPlugConnected, IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Image, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';

// Step 1: Supplies & Intro
export function UsbHostIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.usb-host.steps.usb-intro.intro')}</Text>

      <Image src="/guides/usb/usb.png" radius="md" alt="USB Host cable wiring" />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.usb-host.steps.usb-intro.cableCaption')}
      </Text>

      <Title order={4}>{t('guides.usb-host.steps.usb-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="teal"
        items={t('guides.usb-host.steps.usb-intro.supplies', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.usb-host.steps.usb-intro.pinoutTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.usb-host.steps.usb-intro.pinoutDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.usb-host.steps.usb-intro.thWireColor')}</Table.Th>
                <Table.Th>{t('guides.usb-host.steps.usb-intro.thUsbSignal')}</Table.Th>
                <Table.Th>{t('guides.usb-host.steps.usb-intro.thPicoPin')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Badge color="red" size="xs">
                    Red
                    {t('guides.usb-host.steps.usb-intro.colorRed')}
                  </Badge>
                </Table.Td>
                <Table.Td>VBUS (5V)</Table.Td>
                <Table.Td>Pin 40 (VBUS)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    Black
                    {t('guides.usb-host.steps.usb-intro.colorBlack')}
                  </Badge>
                </Table.Td>
                <Table.Td>GND</Table.Td>
                <Table.Td>Pin 38 (GND)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="green" size="xs">
                    Green
                    {t('guides.usb-host.steps.usb-intro.colorGreen')}
                  </Badge>
                </Table.Td>
                <Table.Td>D+ (Data Plus)</Table.Td>
                <Table.Td>{t('guides.usb-host.steps.usb-intro.signalDPlus')}</Table.Td>
                <Table.Td>GP2 (Pin 4)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    White
                    {t('guides.usb-host.steps.usb-intro.colorWhite')}
                  </Badge>
                </Table.Td>
                <Table.Td>D- (Data Minus)</Table.Td>
                <Table.Td>{t('guides.usb-host.steps.usb-intro.signalDMinus')}</Table.Td>
                <Table.Td>GP3 (Pin 5)</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.usb-host.steps.usb-intro.title')}
      badge={t('guides.usb-host.steps.usb-intro.badge')}
      badgeColor="teal"
      description={t('guides.usb-host.steps.usb-intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Wiring & Configuration
export function UsbHostWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const addDevice = useConfigStore((state) => state.addDevice);
  const devices = useConfigStore((state) => state.config.devices);
  const connected = useConfigStore((state) => state.connected);

  const hasUsbHost = devices?.some((d) => d.usbHost !== undefined && d.usbHost !== null);

  const handleConfigureUsbHost = () => {
    if (!hasUsbHost) {
      addDevice('usbHost');
    }
  };

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.usb-host.steps.usb-wiring.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.usb-host.steps.usb-wiring.wiringSteps', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t('guides.usb-host.steps.usb-wiring.driverConfigTitle')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('guides.usb-host.steps.usb-wiring.driverConfigDesc')}
          </Text>

          {hasUsbHost ? (
            <Badge color="teal" size="md" variant="filled" leftSection={<IconCheck size={14} />}>
              {t('guides.usb-host.steps.usb-wiring.driverConfiguredBadge')}
            </Badge>
          ) : (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconUsb size={16} />}
              onClick={handleConfigureUsbHost}
              disabled={!connected}
            >
              {t('guides.usb-host.steps.usb-wiring.enableDriverBtn')}
            </Button>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.usb-host.steps.usb-wiring.title')}
      badge={t('guides.usb-host.steps.usb-wiring.badge')}
      badgeColor="blue"
      description={t('guides.usb-host.steps.usb-wiring.description')}
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
export function UsbHostReviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const connected = useConfigStore((state) => state.connected);

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
      <Text size="sm">{t('guides.usb-host.steps.usb-test.activeText')}</Text>

      <Title order={4}>{t('guides.usb-host.steps.usb-test.plugInTitle')}</Title>
      <Text size="sm">{t('guides.usb-host.steps.usb-test.plugInText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.usb-host.steps.usb-test.btnSaved')
          : t('guides.usb-host.steps.usb-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.usb-host.steps.usb-test.telemetryTitle')}
          </Text>
          <Badge
            size="lg"
            color="teal"
            variant="light"
            leftSection={<IconPlugConnected size={16} />}
          >
            {t('guides.usb-host.steps.usb-test.portReadyBadge')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.usb-host.steps.usb-test.verifyPrompt')}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.usb-host.steps.usb-test.title')}
      badge={t('guides.usb-host.steps.usb-test.badge')}
      badgeColor="green"
      description={t('guides.usb-host.steps.usb-test.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      nextLabel={t('guides.usb-host.steps.usb-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
