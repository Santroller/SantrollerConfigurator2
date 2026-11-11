import React from 'react';
import { IconActivity, IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Card, Image, List, Stack, Table, Text, Title } from '@mantine/core';
import { InputTestRow } from '@/guides/components/InputTestRow';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { YdRp2040VrefNote } from '@/guides/components/YdRp2040VrefNote';
import { GuideStepProps } from '@/guides/types';
import { adcChannel, gpPin, IMAGE_ALT } from '../../wiringText';
import { GUITAR_TARGETS, useTargetPin } from '../guitarMappingUtils';

const P = 'guides.direct-pico-guitar.steps.pickup';
const PICKUP_PIN = 27;

// Resistor-divider readings for a 4-pin 5-way switch (pin1 = 0V, pin2 = 1.65V, pin3 = 3.3V,
// each through 10k). Bridged notches read the average of their two neighbours.
const PICKUP_SWITCH_STEPS = [
  { position: 1, pins: '1', voltage: '0 V', value: '~0' },
  { position: 2, pins: '1 + 2', voltage: '0.83 V', value: '~16384' },
  { position: 3, pins: '2', voltage: '1.65 V', value: '~32768' },
  { position: 4, pins: '2 + 3', voltage: '2.48 V', value: '~49152' },
  { position: 5, pins: '3', voltage: '3.3 V', value: '~65520' },
];

export function PickupStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pickupPin = useTargetPin(GUITAR_TARGETS.PICKUP_SELECTOR, PICKUP_PIN);
  const pins = { pin: gpPin(pickupPin), gp: `GP${pickupPin}`, adc: adcChannel(pickupPin) };

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.intro`, pins)}</Text>

      <Title order={4}>{t(`${P}.potTitle`)}</Title>
      <Card withBorder radius="md" p="sm">
        <List spacing="xs" size="sm">
          <List.Item>{t(`${P}.potCenter`, pins)}</List.Item>
          <List.Item>{t(`${P}.potOuter1`)}</List.Item>
          <List.Item>{t(`${P}.potOuter2`)}</List.Item>
        </List>
      </Card>

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.pot2WireWarning`)}
      >
        <Text size="xs">{t(`${P}.pot2WireDesc`, pins)}</Text>
      </Alert>

      <YdRp2040VrefNote />

      <Title order={4}>{t(`${P}.switchTitle`)}</Title>
      <Text size="sm">{t(`${P}.switchIntro`)}</Text>
      <Image
        src="/guides/guitar/pickup-switch-pins.jpg"
        radius="sm"
        alt={t(`${IMAGE_ALT}.pickupSwitchPins`)}
      />
      <Text size="xs" c="dimmed" ta="center">
        {t(`${P}.switchPinsCaption`)}
      </Text>

      <Card withBorder radius="md" p="sm">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.switchPinsTitle`)}
          </Text>
          <Text size="sm">{t(`${P}.switchPinsDesc`)}</Text>
          <Text fw={700} size="sm">
            {t(`${P}.switchWiringTitle`)}
          </Text>
          <List spacing="xs" size="sm">
            <List.Item>{t(`${P}.switchCommon`, pins)}</List.Item>
            <List.Item>{t(`${P}.switchPin1`)}</List.Item>
            <List.Item>{t(`${P}.switchPin2`)}</List.Item>
            <List.Item>{t(`${P}.switchPin3`)}</List.Item>
          </List>
          <Image
            src="/guides/guitar/pickup-switch-wiring.svg"
            radius="sm"
            alt={t(`${IMAGE_ALT}.pickupSwitchWiring`)}
          />
          <Text size="xs" c="dimmed" ta="center">
            {t(`${P}.switchDiagramCaption`, pins)}
          </Text>
        </Stack>
      </Card>

      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t(`${P}.switchThPosition`)}</Table.Th>
            <Table.Th>{t(`${P}.switchThPins`)}</Table.Th>
            <Table.Th>{t(`${P}.switchThVoltage`)}</Table.Th>
            <Table.Th>{t(`${P}.switchThValue`)}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {PICKUP_SWITCH_STEPS.map((row) => (
            <Table.Tr key={row.position}>
              <Table.Td>{row.position}</Table.Td>
              <Table.Td>{row.pins}</Table.Td>
              <Table.Td>{row.voltage}</Table.Td>
              <Table.Td>{row.value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed">
        {t(`${P}.switchWhy`)}
      </Text>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t(`${P}.benchHint`)}
      </Text>

      <InputTestRow
        label={t(`${P}.pickupLabel`, pins)}
        target={GUITAR_TARGETS.PICKUP_SELECTOR}
        color="orange"
        recommendedPin={PICKUP_PIN}
        isAnalog
      />

      <Alert
        color="teal"
        icon={<IconActivity size={14} />}
        title={t(`${P}.verificationTitle`)}
        mt="xs"
      >
        <Text size="xs">{t(`${P}.verificationDesc`)}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.title`)}
      badge={t(`${P}.badge`, pins)}
      badgeColor="orange"
      description={t(`${P}.description`, pins)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
