import React from 'react';
import { IconBulb, IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Group, Image, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';

// Step 1: Supplies & Intro
export function LedIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('guides.rgb-leds.steps.led-intro.intro')}</Text>

      <Group grow align="start">
        <Stack gap={4}>
          <Image src="/guides/leds/inline-led.jpg" radius="md" alt="Inline fret LEDs" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.rgb-leds.steps.led-intro.inlineCaption')}
          </Text>
        </Stack>
        <Stack gap={4}>
          <Image src="/guides/leds/led.png" radius="md" alt="LED schematic" />
          <Text size="xs" c="dimmed" ta="center">
            {t('guides.rgb-leds.steps.led-intro.schematicCaption')}
          </Text>
        </Stack>
      </Group>

      <Title order={4}>{t('guides.rgb-leds.steps.led-intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="pink"
        items={t('guides.rgb-leds.steps.led-intro.supplies', { returnObjects: true })}
      />
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
            {t('guides.rgb-leds.steps.led-intro.pinoutDesc')}
          </Text>

          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('guides.rgb-leds.steps.led-intro.thLedPin')}</Table.Th>
                <Table.Th>{t('guides.rgb-leds.steps.led-intro.thPicoPin')}</Table.Th>
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
                <Table.Td>Pin 40 (VBUS)</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descPower')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="gray" size="xs">
                    GND
                  </Badge>
                </Table.Td>
                <Table.Td>Pin 38 (GND)</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descGround')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    Data In (DI)
                  </Badge>
                </Table.Td>
                <Table.Td>GP3 (Pin 5)</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descData')}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Badge color="yellow" size="xs">
                    Clock In (CI)
                  </Badge>
                </Table.Td>
                <Table.Td>GP6 (Pin 9)</Table.Td>
                <Table.Td>{t('guides.rgb-leds.steps.led-intro.descClock')}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
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

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('guides.rgb-leds.steps.led-wiring.wiringTitle')}</Title>
      <GuideList
        type="ordered"
        items={t('guides.rgb-leds.steps.led-wiring.wiringSteps', { returnObjects: true })}
      />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
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
      <Text size="sm">{t('guides.rgb-leds.steps.led-test.configuredText')}</Text>

      <Title order={4}>{t('guides.rgb-leds.steps.led-test.syncTitle')}</Title>
      <Text size="sm">{t('guides.rgb-leds.steps.led-test.syncText')}</Text>

      <Button
        size="md"
        color="teal"
        disabled={!connected}
        loading={saving}
        leftSection={<IconDeviceFloppy size={18} />}
        onClick={handleSave}
      >
        {saved
          ? t('guides.rgb-leds.steps.led-test.btnSaved')
          : t('guides.rgb-leds.steps.led-test.btnSave')}
      </Button>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            {t('guides.rgb-leds.steps.led-test.driverStatusTitle')}
          </Text>
          <Badge size="lg" color="pink" variant="light" leftSection={<IconBulb size={16} />}>
            {t('guides.rgb-leds.steps.led-test.driverActiveBadge')}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('guides.rgb-leds.steps.led-test.verifyPrompt')}
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
      nextLabel={t('guides.rgb-leds.steps.led-test.finish')}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
