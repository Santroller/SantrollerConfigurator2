import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Progress, Space, Text } from '@mantine/core';
import { radioFirmwareStatus } from '@/components/SettingsContext/radioFirmware';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Offers to write the radio firmware area (Xbox wireless adapter, Pico W radio) when the controller's is
// missing or older than the one this tool ships. Firmware that can't have it written over OTA gets the
// UF2 alert instead. Waits for an outdated app to be updated first, as that's what reads it.
export function RadioFirmwareAlert() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const latest = useConfigStore((state) => state.latest);
  const firmwareNewer = useConfigStore((state) => state.firmwareNewer);
  const needsUf2Update = useConfigStore((state) => state.needsUf2Update);
  const deviceVersion = useConfigStore((state) => state.radioFirmwareVersion);
  const bundledVersion = useConfigStore((state) => state.bundledRadioFirmwareVersion);
  const missing = useConfigStore((state) => state.missingStaticFirmware);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const updateError = useConfigStore((state) => state.updateError);
  const radioFirmwareUpdate = useConfigStore((state) => state.radioFirmwareUpdate);

  const status = radioFirmwareStatus(deviceVersion, bundledVersion, missing);
  if (
    !connected ||
    hung ||
    needsUf2Update ||
    (!latest && !firmwareNewer) ||
    (status !== 'missing' && status !== 'outdated')
  ) {
    return null;
  }
  return (
    <Alert
      variant="light"
      color="yellow"
      title={t(`connect.radioFirmware.${status}Title`)}
      icon={<IconExclamationCircle />}
    >
      {t(`connect.radioFirmware.${status}`)}
      <Space h="md" />
      <Button disabled={updating} onClick={radioFirmwareUpdate}>
        {t('connect.radioFirmware.install')}
      </Button>
      <Space h="xs" />
      <Progress size="xl" value={updating ? updatePercentage : 0} />
      {updateError === 'radioFirmware' && (
        <>
          <Space h="xs" />
          <Text size="sm">{t('connect.radioFirmware.failed')}</Text>
        </>
      )}
    </Alert>
  );
}
