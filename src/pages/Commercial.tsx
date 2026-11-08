import { useState } from 'react';
import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Space, TextInput } from '@mantine/core';
import { DeviceIdentitySettings } from '@/components/Inputs/DeviceNameSetting';
import { Layout } from '@/components/Layout/Layout';
import { SellerImageUpload } from '@/components/SettingsContext/SellerImageUpload';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { Uf2BuildError, Uf2BuildErrorCode } from '@/components/SettingsContext/uf2Layout';

export function CommercialToolPage() {
  const connect = useConfigStore((state) => state.connect);
  const setSellerToolName = useConfigStore((state) => state.setSellerToolName);
  const setSellerToolLogo = useConfigStore((state) => state.setSellerToolLogo);
  const setSellerToolFavicon = useConfigStore((state) => state.setSellerToolFavicon);
  const buildUf2 = useConfigStore((state) => state.buildUf2);
  const connected = useConfigStore((state) => state.connected);
  const updating = useConfigStore((state) => state.updating);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const setSimpleMode = useConfigStore((state) => state.setSimpleMode);
  const { t } = useTranslation();
  const [uf2Error, setUf2Error] = useState<Uf2BuildErrorCode | 'unknown' | null>(null);
  const onBuildUf2 = async (pico2: boolean) => {
    setUf2Error(null);
    try {
      await buildUf2(pico2);
    } catch (e) {
      setUf2Error(e instanceof Uf2BuildError ? e.code : 'unknown');
    }
  };
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
              {t('connect.connect')}
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
            <Button disabled={updating} onClick={() => onBuildUf2(false)}>
              {t('commercial.buildUf2Pico')}
            </Button>
            <Space h="md" />
            <Button disabled={updating} onClick={() => onBuildUf2(true)}>
              {t('commercial.buildUf2Pico2')}
            </Button>
            {uf2Error && (
              <>
                <Space h="md" />
                <Alert
                  variant="light"
                  color="red"
                  title={t('commercial.buildUf2Error.title')}
                  icon={<IconExclamationCircle />}
                >
                  {t(`commercial.buildUf2Error.${uf2Error}`)}
                </Alert>
              </>
            )}
            <Space h="md" />
            <DeviceIdentitySettings commercial />
            <Space h="md" />
            <TextInput
              label={t('commercial.toolName')}
              value={toolInfo?.name ?? ''}
              onChange={(event) => setSellerToolName(event.currentTarget.value)}
            />
            <Space h="md" />
            <SellerImageUpload
              disabled={updating}
              image={toolInfo?.logo}
              label={t('commercial.toolLogo')}
              errorTitle={t('commercial.toolLogoError')}
              previewWidth={200}
              onUpload={setSellerToolLogo}
            />
            <Space h="md" />
            <SellerImageUpload
              disabled={updating}
              image={toolInfo?.favicon}
              label={t('commercial.toolFavicon')}
              errorTitle={t('commercial.toolFaviconError')}
              previewWidth={32}
              onUpload={setSellerToolFavicon}
            />
          </>
        )}
      </Layout>
    </>
  );
}
