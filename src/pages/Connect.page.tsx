import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, FileInput, Progress, Space, Text } from '@mantine/core';
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
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const latest = useConfigStore((state) => state.latest);
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
            <li>USB Host - Partial support is there, but its not finished</li>
            <li>Bluetooth</li>
            <li>Wii Extension Emulation (as in, plugging the pico into a wii remote)</li>
            <li>
              PS2 Emulation (as in, plugging the pico into the PS2 controller port on your console)
            </li>
          </ul>
        </Alert>
        <Alert
          variant="light"
          color="red"
          title="Santroller 2 is not finished"
          icon={<IconExclamationCircle />}
        >
          Make sure your bootsel button is easily accessible! Santroller 2 isn't 100% stable, and
          sometimes it may not load correctly after programming.
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
            <Button disabled={updating} onClick={disconnect}>
              Disconnect from Santroller
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={bootloader}>
              Jump to bootloader
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={exportConfig}>Export current config</Button>
            <Space h="md" />
            <FileButton disabled={updating} onChange={loadConfig} accept="application/json">
              {(props) => <Button disabled={updating}  {...props}>Load config from file</Button>}
            </FileButton>
          </>
        )}
        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            Connect to Santroller
          </Button>
        )}

        {!latest && connected && (
          <Alert
            variant="light"
            color="red"
            title="Controller firmware out of date"
            icon={<IconExclamationCircle />}
          >
            Firmware outdated! Click the button below to update
            <Space h="md" />
            <Button disabled={updating} onClick={firmwareUpdate}>Start update</Button>
            <Progress size="xl" value={updatePercentage}></Progress>
          </Alert>
        )}

        <Space h="md" />
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
