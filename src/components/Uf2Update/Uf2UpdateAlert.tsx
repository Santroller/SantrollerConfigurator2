import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Group, Space } from '@mantine/core';

// Firmware too old to update over OTA (see needsUf2BeforeOta) has to be reflashed from a UF2 once, with
// the downloads. The UF2 carries the bootloader and the radio firmware too.
export function Uf2UpdateAlert() {
  const { t } = useTranslation();
  return (
    <Alert
      variant="light"
      color="yellow"
      title={t('connect.uf2RequiredTitle')}
      icon={<IconExclamationCircle />}
    >
      {t('connect.uf2Required')}
      <Space h="md" />
      <Group>
        <Button
          component="a"
          download="santroller_pico1.uf2"
          href={`santroller_pico1.uf2?v=${__CONFIGURATOR_COMMIT__}`}
          target="_blank"
        >
          {t('connect.downloadPico1')}
        </Button>
        <Button
          component="a"
          download="santroller_pico2.uf2"
          href={`santroller_pico2.uf2?v=${__CONFIGURATOR_COMMIT__}`}
          target="_blank"
        >
          {t('connect.downloadPico2')}
        </Button>
      </Group>
    </Alert>
  );
}
