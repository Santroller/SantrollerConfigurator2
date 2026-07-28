import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Alert,
  Button,
  FileButton,
  FileInput,
  Progress,
  Space,
  Text,
  TextInput,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { buildUf2FromJson, useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function TestingPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const bootloader = useConfigStore((state) => state.bootloader);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const setSellerToolName = useConfigStore((state) => state.setSellerToolName);
  const setSellerToolLogo = useConfigStore((state) => state.setSellerToolLogo);
  const buildUf2 = useConfigStore((state) => state.buildUf2);
  const connected = useConfigStore((state) => state.connected);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const latest = useConfigStore((state) => state.latest);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const enableAdvancedMode = useConfigStore((state) => state.enableAdvancedMode);
  const { t } = useTranslation();
  console.log(toolInfo?.name)
  return (
    <>
      <Layout>
        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            Connect to a Santroller powered device
          </Button>
        )}
        {navigator.hid && connected && (
          <>
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
            <Image w={200} src={toolInfo?.logo ? URL.createObjectURL(new Blob([new Uint8Array(toolInfo.logo)], { type: 'image/png' })) : ''}></Image>
          </>
        )}
        <Space h="md" />
        <FileButton
          disabled={updating}
          onChange={(f) => buildUf2FromJson(f, false)}
          accept="application/json"
        >
          {(props) => (
            <Button disabled={updating} {...props}>
              Build UF2 from config file (Pico 1 / RP2040)
            </Button>
          )}
        </FileButton>
        <Space h="md" />
        <FileButton
          disabled={updating}
          onChange={(f) => buildUf2FromJson(f, true)}
          accept="application/json"
        >
          {(props) => (
            <Button disabled={updating} {...props}>
              Build UF2 from config file (Pico 2 / RP2350)
            </Button>
          )}
        </FileButton>
        <Button disabled={updating} onClick={() => enableAdvancedMode()}>
          Enable Advanced mode
        </Button>
      </Layout>
    </>
  );
}
