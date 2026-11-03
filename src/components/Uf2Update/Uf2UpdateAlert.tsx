import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Group, Space } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Some updates can't go over OTA and need the device reflashed from a UF2. Explains why, with the downloads
export function Uf2UpdateAlert() {
  const { t } = useTranslation();
  const bootloaderOutdated = useConfigStore((state) => state.bootloaderOutdated);
  const slowBootStage = useConfigStore((state) => state.slowBootStage);
  const firmwareVerificationMissing = useConfigStore((state) => state.firmwareVerificationMissing);
  // Either bootloader reason covers the dongle firmware too, as the UF2 carries both
  const key = bootloaderOutdated
    ? 'bootloaderOutdated'
    : slowBootStage
      ? 'slowBootStage'
      : firmwareVerificationMissing
        ? 'firmwareVerification'
        : 'missingDongleFirmware';
  return (
    <Alert
      variant="light"
      color="yellow"
      title={t(`connect.${key}Title`)}
      icon={<IconExclamationCircle />}
    >
      {t(`connect.${key}`)}
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
