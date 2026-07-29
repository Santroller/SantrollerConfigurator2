import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  FileButton,
  FileInput,
  Image,
  Progress,
  Space,
  Text,
  TextInput,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { buildUf2FromJson, useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function CommercialToolPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const bootloader = useConfigStore((state) => state.bootloader);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const setSellerToolName = useConfigStore((state) => state.setSellerToolName);
  const setSellerToolLogo = useConfigStore((state) => state.setSellerToolLogo);
  const buildUf2 = useConfigStore((state) => state.buildUf2);
  const connected = useConfigStore((state) => state.connected);
  const updating = useConfigStore((state) => state.updating);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const latest = useConfigStore((state) => state.latest);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const setSimpleMode = useConfigStore((state) => state.setSimpleMode);
  const { t } = useTranslation();
  const login = useConfigStore((state) => state.login);
  const seller = useConfigStore((state) => state.seller);
  if (!seller) {
    return (
      <>
        <Layout>
          <Space h="md" />
          <Button onClick={login}>Login with github</Button>
        </Layout>
      </>
    );
  }
  return (
    <>
      <Layout>
        {!connected && (
          <Alert
            variant="light"
            color="red"
            title="Device required"
            icon={<IconExclamationCircle />}
          >
            Configuring this tool requires a connected device.
          </Alert>
        )}
        {navigator.hid && !connected && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={connect}>
              Connect to a Santroller powered device
            </Button>
          </>
        )}
        {navigator.hid && connected && (
          <>
            <Space h="md" />
            {simpleMode ? (
              <Button onClick={() => setSimpleMode(false)}>Show full version of tool</Button>
            ) : (
              <Button onClick={() => setSimpleMode(true)}>Show customer version of tool</Button>
            )}
            <Space h="md" />
            <Button disabled={updating} onClick={() => buildUf2(false)}>
              Build UF2 from Current Config (Pico 1 / RP2040)
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={() => buildUf2(true)}>
              Build UF2 from Current Config (Pico 2 / RP2350)
            </Button>
            <Space h="md" />
            <TextInput
              label="Tool name"
              value={toolInfo?.name ?? ''}
              onChange={(event) => setSellerToolName(event.currentTarget.value)}
            />
            <Space h="md" />
            <FileButton
              disabled={updating}
              onChange={(f) => setSellerToolLogo(f!)}
              accept="image/png,image/jpeg"
            >
              {(props) => (
                <Button disabled={updating} {...props}>
                  Tool Logo
                </Button>
              )}
            </FileButton>
            <Image
              w={200}
              src={
                toolInfo?.logo
                  ? URL.createObjectURL(
                      new Blob([new Uint8Array(toolInfo.logo)], { type: 'image/png' })
                    )
                  : ''
              }
            ></Image>
          </>
        )}
      </Layout>
    </>
  );
}
