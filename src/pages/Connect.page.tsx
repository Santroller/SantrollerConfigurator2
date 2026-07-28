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
            title="Browser Unsupported"
            icon={<IconExclamationCircle />}
          >
            This browser does not support WebHID, therefore it will not work.
            <Space h="md" />
            You need to use a Chromium based browser, Firefox based browsers don't support WebHID.
          </Alert>
        )}
        {navigator.hid && connected && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={disconnect}>
              Disconnect from Santroller
            </Button>
          </>
        )}
        {navigator.hid && connected && !simpleMode && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={bootloader}>
              Jump to Bootloader
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={exportConfig}>Export Current Config</Button>
            <Space h="md" />
            <FileButton disabled={updating} onChange={loadConfig} accept="application/json">
              {(props) => <Button disabled={updating}  {...props}>Load Config from File</Button>}
            </FileButton>
          </>
        )}
        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            Connect to a Santroller powered device
          </Button>
        )}

        {!latest && connected && (
          <Alert
            variant="light"
            color="red"
            title="Controller firmware out of date"
            icon={<IconExclamationCircle />}
          >
            Firmware outdated! Click the button below to update!
            <Space h="md" />
            <Button disabled={updating} onClick={firmwareUpdate}>Start update</Button>
            <Progress size="xl" value={updatePercentage}></Progress>
          </Alert>
        )}
      </Layout>
    </>
  );
}
