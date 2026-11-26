import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button, Space, Text } from '@mantine/core';
import { useConfigStore } from './SettingsContext/SettingsContext';

// Santroller 1 and blank boards never show up as a device, so tell people how to get them
// running before they go looking for one. Only shown while nothing is connected.
export function OldFirmwareAlert({ guide = false, mb }: { guide?: boolean; mb?: string }) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  if (connected) {
    return null;
  }
  return (
    <Alert
      variant="light"
      color="red"
      mb={mb}
      title={t(guide ? 'connect.oldFirmwareGuideTitle' : 'connect.oldFirmwareTitle')}
      icon={<IconAlertTriangle />}
    >
      <Text size="sm">{t(guide ? 'connect.oldFirmwareGuide' : 'connect.oldFirmware')}</Text>
      <Space h="xs" />
      <Button
        size="xs"
        color="red"
        variant="light"
        component={Link}
        to="/setup"
        rightSection={<IconArrowRight size={14} />}
      >
        {t('connect.setup')}
      </Button>
    </Alert>
  );
}
