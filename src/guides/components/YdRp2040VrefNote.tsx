import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Stack, Text } from '@mantine/core';
import { IMAGE_ALT } from '../wiringText';

const N = 'guides.common.ydRp2040Vref';

// Some YD-RP2040 clones ship with the jumper that feeds 3V3 to the ADC reference left open, so
// analog pins read garbage while everything digital works. Shown wherever a step wires something
// straight to the Pico's ADC pins.
export function YdRp2040VrefNote() {
  const { t } = useTranslation();
  return (
    <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} title={t(`${N}.title`)}>
      <Stack gap="xs">
        <Text size="sm">{t(`${N}.body`)}</Text>
        <Image
          src="/guides/boards/yd-rp2040-vref.jpg"
          radius="md"
          maw={200}
          mx="auto"
          alt={t(`${IMAGE_ALT}.ydRp2040Vref`)}
        />
        <Text size="xs" c="dimmed" ta="center">
          {t(`${N}.caption`)}
        </Text>
      </Stack>
    </Alert>
  );
}
