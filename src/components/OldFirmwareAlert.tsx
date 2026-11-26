import { IconAlertTriangle, IconArrowRight, IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button, Group, Space, Text } from '@mantine/core';
import { migrateSupported } from './Migrate/backend';
import { useConfigStore } from './SettingsContext/SettingsContext';

// Santroller 1 and blank boards never show up as a device, so tell people how to get them
// running before they go looking for one. Only shown while nothing is connected, and on the
// Connect page only where the configurator can't set up Picos itself (Firefox, Safari).
export function OldFirmwareAlert({ guide = false, mb }: { guide?: boolean; mb?: string }) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const connect = useConfigStore((state) => state.connect);
  const updating = useConfigStore((state) => state.updating);
  // Where Picos can be set up from the configurator, the Connect page offers that instead
  if (connected || (!guide && migrateSupported())) {
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
      {guide && (
        <Text size="sm" mt="xs">
          {t('connect.oldFirmwareGuideSetup')}
        </Text>
      )}
      <Space h="xs" />
      <Group gap="xs">
        {/* Guides have no connect button of their own while greyed out */}
        {guide && typeof navigator !== 'undefined' && 'hid' in navigator && (
          <Button
            size="xs"
            color="red"
            leftSection={<IconUsb size={14} />}
            onClick={connect}
            loading={updating}
          >
            {t('guides.connectPico')}
          </Button>
        )}
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
      </Group>
    </Alert>
  );
}
