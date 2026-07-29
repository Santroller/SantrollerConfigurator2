import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FileButton, FileInput, Progress, Space, Text } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore, buildUf2FromJson } from '@/components/SettingsContext/SettingsContext';
import { useSearchParams } from 'react-router-dom';

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
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
  console.log(code, state);
  const auth = localStorage.getItem('login');
  if (auth) {
    const login = JSON.parse(auth);
    if (state == login.state) {
        console.log(login)
      const url = new URL('https://worker.tangentmc.net/github-auth-exchange-endpoint');
      url.searchParams.set('code_verifier', login.code_challenge);
      url.searchParams.set('code', code!);
      fetch(url.href);
    }
  }
  return (
    <>
      <Layout>
        <></>
      </Layout>
    </>
  );
}
