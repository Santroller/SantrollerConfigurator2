import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, FileInput, Progress, Space, Text } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore, buildUf2FromJson } from '@/components/SettingsContext/SettingsContext';

export function ConnectPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const bootloader = useConfigStore((state) => state.bootloader);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const firmwareUpdate = useConfigStore((state) => state.firmwareUpdate);
  const connected = useConfigStore((state) => state.connected);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const latest = useConfigStore((state) => state.latest);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const { t } = useTranslation();
  return (
    <>
      <Layout>
        {!navigator.hid && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.browserNotSupported')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.webHidNotSupported')}
          </Alert>
        )}
        {navigator.hid && connected && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={disconnect}>
            {t('connect.disconnect')}
            </Button>
          </>
        )}
        {navigator.hid && connected && !simpleMode && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={bootloader}>
            {t('connect.bootloader')}
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={exportConfig}>{t('connect.export')}</Button>
            <Space h="md" />
            <FileButton disabled={updating} onChange={loadConfig} accept="application/json">
              {(props) => <Button disabled={updating}  {...props}>{t('connect.load')}</Button>}
            </FileButton>
          </>
        )}
        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            {t('connect.connect')}
          </Button>
        )}

        {!latest && connected && (
          <Alert
            variant="light"
            color="red"
            title="Controller firmware out of date"
            icon={<IconExclamationCircle />}
          >
            {t('connect.outdated')}
            <Space h="md" />
            <Button disabled={updating} onClick={firmwareUpdate}>{t('connect.startUpdate')}</Button>
            <Progress size="xl" value={updatePercentage}></Progress>
          </Alert>
        )}
      </Layout>
    </>
  );
}
