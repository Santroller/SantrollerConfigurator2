import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, Group, Progress, Space } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function ConnectPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const bootloader = useConfigStore((state) => state.bootloader);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const firmwareUpdate = useConfigStore((state) => state.firmwareUpdate);
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const latest = useConfigStore((state) => state.latest);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const needsUf2Update = useConfigStore((state) => state.needsUf2Update);
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
            <Button disabled={updating || hung} onClick={bootloader}>
              {t('connect.bootloader')}
            </Button>
            <Space h="md" />
            <Button disabled={updating || hung} onClick={exportConfig}>
              {t('connect.export')}
            </Button>
            <Space h="md" />
            <FileButton disabled={updating || hung} onChange={loadConfig} accept="application/json">
              {(props) => (
                <Button disabled={updating || hung} {...props}>
                  {t('connect.load')}
                </Button>
              )}
            </FileButton>
          </>
        )}
        {hung && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.hungTitle')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.hung')}
          </Alert>
        )}
        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            {t('connect.connect')}
          </Button>
        )}

        {!latest && connected && !hung && (
          <Alert
            variant="light"
            color="red"
            title="Controller firmware out of date"
            icon={<IconExclamationCircle />}
          >
            {t('connect.outdated')}
            <Space h="md" />
            <Button disabled={updating} onClick={firmwareUpdate}>
              {t('connect.startUpdate')}
            </Button>
            <Progress size="xl" value={updatePercentage} />
          </Alert>
        )}

        {needsUf2Update && connected && !hung && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="yellow"
              title={t('connect.missingDongleFirmwareTitle')}
              icon={<IconExclamationCircle />}
            >
              {t('connect.missingDongleFirmware')}
              <Space h="md" />
              <Group>
                <Button
                  component="a"
                  download="santroller_pico1.uf2"
                  href="santroller_pico1.uf2"
                  target="_blank"
                >
                  {t('connect.downloadPico1')}
                </Button>
                <Button
                  component="a"
                  download="santroller_pico2.uf2"
                  href="santroller_pico2.uf2"
                  target="_blank"
                >
                  {t('connect.downloadPico2')}
                </Button>
              </Group>
            </Alert>
          </>
        )}
      </Layout>
    </>
  );
}
