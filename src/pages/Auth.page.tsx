import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, FileInput, Progress, Space, Text } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore, buildUf2FromJson } from '@/components/SettingsContext/SettingsContext';
import { useParams } from 'react-router-dom';

export function AuthPage() {
  let { code } = useParams();
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
  console.log(code);
  return (
    <>
      <Layout>
        <></>
      </Layout>
    </>
  );
}
