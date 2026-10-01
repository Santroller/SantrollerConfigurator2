import React from 'react';
import { IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
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
import { GuideList } from '@/guides/components/GuideList';
import { StepWorkbench } from '@/guides/components/StepWorkbench';
import { GuideStepProps } from '@/guides/types';
import {
  applyRecommendedPinout,
  getGuitarFamily,
  GuitarFamily,
  RECOMMENDED_PICO_PINOUT_GH,
  RECOMMENDED_PICO_PINOUT_RB,
  setGuitarFamily,
} from '../guitarMappingUtils';

export function IntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const [applied, setApplied] = React.useState(false);
  const [family, setFamilyState] = React.useState<GuitarFamily>(() =>
    getGuitarFamily(useConfigStore.getState())
  );

  const handleFamilyChange = (val: GuitarFamily) => {
    setFamilyState(val);
    setGuitarFamily(val);
  };

  const handleApplyRecommended = () => {
    applyRecommendedPinout(family);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  const currentPinout = family === 'rb' ? RECOMMENDED_PICO_PINOUT_RB : RECOMMENDED_PICO_PINOUT_GH;

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          {t('guides.direct-pico-guitar.steps.intro.guitarFamilyLabel')}
        </Text>
        <SegmentedControl
          size="sm"
          value={family}
          onChange={(v) => handleFamilyChange(v as GuitarFamily)}
          data={[
            {
              label: t('guides.direct-pico-guitar.steps.intro.familyGh'),
              value: 'gh',
            },
            {
              label: t('guides.direct-pico-guitar.steps.intro.familyRb'),
              value: 'rb',
            },
          ]}
        />
      </Stack>

      <Text size="sm">{t('guides.direct-pico-guitar.steps.intro.welcome')}</Text>

      <Image src="/guides/guitar/direct.jpg" radius="md" alt="Finished guitar rewire" />
      <Text size="xs" c="dimmed" ta="center">
        {t('guides.direct-pico-guitar.steps.intro.directRewireCaption')}
      </Text>

      <Title order={4}>{t('guides.direct-pico-guitar.steps.intro.suppliesTitle')}</Title>
      <GuideList
        iconColor="blue"
        items={t('guides.direct-pico-guitar.steps.intro.supplies', { returnObjects: true })}
      />

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t('guides.direct-pico-guitar.steps.intro.wiringRuleTitle')}
      >
        <Text size="sm" mb="xs">
          {t('guides.direct-pico-guitar.steps.intro.wiringRuleSubtitle')}
        </Text>
        <GuideList
          type="ordered"
          items={t('guides.direct-pico-guitar.steps.intro.rules', { returnObjects: true })}
        />
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <Paper withBorder p="sm" radius="sm">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              {t('guides.direct-pico-guitar.steps.intro.standardPinout')}
            </Text>
            <Badge color={family === 'rb' ? 'violet' : 'blue'} variant="light" size="xs">
              {family === 'rb' ? 'Rock Band' : 'Guitar Hero'}
            </Badge>
          </Group>

          <Text size="xs" c="dimmed">
            {t('guides.direct-pico-guitar.steps.intro.pinoutDesc')}
          </Text>

          <Button
            size="xs"
            variant={applied ? 'filled' : 'default'}
            color={applied ? 'teal' : undefined}
            leftSection={applied ? <IconCheck size={14} /> : undefined}
            onClick={handleApplyRecommended}
          >
            {applied
              ? t('guides.direct-pico-guitar.steps.intro.pinoutApplied')
              : t('guides.direct-pico-guitar.steps.intro.applyStandardPinout')}
          </Button>
        </Stack>
      </Paper>

      <Text fw={600} size="sm" mt="xs">
        {t('guides.direct-pico-guitar.steps.intro.standardRef')}
      </Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('guides.direct-pico-guitar.steps.intro.thInput')}</Table.Th>
            <Table.Th>{t('guides.direct-pico-guitar.steps.intro.thGp')}</Table.Th>
            <Table.Th>{t('guides.direct-pico-guitar.steps.intro.thPhysical')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {currentPinout.map((item) => (
            <Table.Tr key={item.label}>
              <Table.Td>
                <Group gap={6}>
                  <Badge
                    size="xs"
                    color={item.color}
                    variant="filled"
                    circle
                    style={{ width: 10, height: 10 }}
                  />
                  <Text size="xs" fw={500}>
                    {item.label}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge size="xs" variant="outline">
                  GP{item.pin}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">
                  {t('guides.direct-pico-guitar.steps.intro.pinNum', {
                    pin: item.physicalPin,
                  })}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t('guides.direct-pico-guitar.steps.intro.title')}
      badge={family === 'rb' ? 'Rock Band' : t('guides.direct-pico-guitar.steps.intro.badge')}
      badgeColor={family === 'rb' ? 'violet' : 'blue'}
      description={t('guides.direct-pico-guitar.steps.intro.description')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}
