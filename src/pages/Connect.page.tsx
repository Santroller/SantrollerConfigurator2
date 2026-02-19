import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, FileInput, Space, Text } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function ConnectPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const connected = useConfigStore((state) => state.connected);
  const { t } = useTranslation();
  return (
    <>
      <Layout>
        <Alert
          variant="light"
          color="red"
          title="Santroller 2 is not finished"
          icon={<IconExclamationCircle />}
        >
          Santroller 2 is currently not finished. Right now, several features are missing when
          compared to the normal tool, and there are likley a lot of crashes and unfinished features
          <Space h="md" />
          Note that there may be situations where your config wipes itself, and there isn't any
          documentation right now, this is mostly here for experimenting but its known that there
          are many bugs and issues with it currently.
          <Space h="md" />
          Notable missing features:
          <ul>
            <li>USB Host</li>
            <li>Bluetooth</li>
            <li>Wii Extension Emulation</li>
            <li>PS2 Emulation</li>
          </ul>
        </Alert>
        {!navigator.hid && (
          <Alert
            variant="light"
            color="red"
            title="Browser Unsupported"
            icon={<IconExclamationCircle />}
          >
            This browser is not supported as it does not support WebHID.
            <Space h="md" />
            You need to use a chromium based browser, firefox based browsers don't support WebHID.
          </Alert>
        )}
        {navigator.hid && connected && (
          <>
            <Space h="md" />
            <Button onClick={disconnect}>Disconnect from Santroller</Button>
            <Space h="md" />
            <Button onClick={exportConfig}>Export current config</Button>
            <Space h="md" />
            <FileButton onChange={loadConfig} accept="application/json">
              {(props) => <Button {...props}>Load config from file</Button>}
            </FileButton>
          </>
        )}
        {navigator.hid && !connected && <Button onClick={connect}>Connect to Santroller</Button>}
        <Space h="md" />
        <Text size="h1">{t('getting_started.title')}</Text>
        <Text size="sm">{t('getting_started.text')}</Text>
        <Space h="md" />
        <Button component="a" download="santroller.uf2" href="santroller.uf2" target="_blank">
          Download uf2
        </Button>
      </Layout>
    </>
  );
}
