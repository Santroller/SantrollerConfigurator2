import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  FileButton,
  Image,
  Space,
  TextInput,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function CommercialToolPage() {
  const connect = useConfigStore((state) => state.connect);
  const setSellerToolName = useConfigStore((state) => state.setSellerToolName);
  const setSellerToolLogo = useConfigStore((state) => state.setSellerToolLogo);
  const buildUf2 = useConfigStore((state) => state.buildUf2);
  const connected = useConfigStore((state) => state.connected);
  const updating = useConfigStore((state) => state.updating);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const setSimpleMode = useConfigStore((state) => state.setSimpleMode);
  const { t } = useTranslation();
  const login = useConfigStore((state) => state.login);
  const seller = useConfigStore((state) => state.seller);
  const sellerCheck = useConfigStore((state) => state.sellerCheck);
  const loggedIn = localStorage.getItem('auth') !== null;
  if (!seller) {
    if (sellerCheck) {
      return (
        <>
          <Layout>
            <Alert
              variant="light"
              color="red"
              title={t('commercial.invalid')}
              icon={<IconExclamationCircle />}
            >
              {t('commercial.incorrectAccount')}
            </Alert>
            <Space h="md" />
            <Button onClick={login}>{t('commercial.login')}</Button>
          </Layout>
        </>
      );
    }
    if (!loggedIn) {
      return (
        <Layout>
          <Alert
            variant="light"
            color="red"
              title={t('commercial.invalid')}
            icon={<IconExclamationCircle />}
          >
            {t('commercial.notLoggedIn')}
          </Alert>
          <Space h="md" />
          <Button onClick={login}>{t('commercial.login')}</Button>
        </Layout>
      );
    }
    return <></>;
  }
  return (
    <>
      <Layout>
        {!connected && (
          <Alert
            variant="light"
            color="red"
            title={t('commercial.requiredDevice.title')}
            icon={<IconExclamationCircle />}
          >
            {t('commercial.requiredDevice.description')}
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
              <Button onClick={() => setSimpleMode(false)}>{t('commercial.showFull')}</Button>
            ) : (
              <Button onClick={() => setSimpleMode(true)}>{t('commercial.showCustomer')}</Button>
            )}
            <Space h="md" />
            <Button disabled={updating} onClick={() => buildUf2(false)}>
             {t('commercial.buildUf2Pico')}
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={() => buildUf2(true)}>
             {t('commercial.buildUf2Pico2')}
            </Button>
            <Space h="md" />
            <TextInput
              label={t('commercial.toolName')}
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
                  {t('commercial.toolLogo')}
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
             />
          </>
        )}
      </Layout>
    </>
  );
}
