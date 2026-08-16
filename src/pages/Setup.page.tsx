import { IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Space, Text } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';

export function SetupPage() {
  const { t } = useTranslation();
  return (
    <>
      <Layout>
        <Alert variant="light" color="red" title="Note" icon={<IconExclamationCircle />}>
          {t('connect.sellerWarning')}
        </Alert>
        <Space h="md" />
        <Alert
          variant="light"
          color="red"
          title="Santroller 2 is incomplete!"
          icon={<IconExclamationCircle />}
        >
          Santroller 2 is currently not finished. Right now, several features are missing in
          comparison to the normal tool
          <Space h="md" />
          Notable missing features:
          <ul>
            <li>
              Bluetooth - You can emulate a gamepad, but connecting devices to a receiver is not
              supported yet.
            </li>
            <li>
              A bunch of device types aren't emulated yet
            </li>
            <li>
              Buttons for creating default inputs aren't hooked up yet in some places
            </li>
            <li>
              Mouse and keyboard isn't emulated yet
            </li>
          </ul>
        </Alert>

        <Space h="md" />
        <Space h="md" />
        <Text size="h1">{t('getting_started.title')}</Text>
        <Text size="sm">{t('getting_started.text')}</Text>
        <Space h="md" />
        <Button
          component="a"
          download="santroller_pico1.uf2"
          href="santroller_pico1.uf2"
          target="_blank"
        >
          {t('connect.downloadPico1')}
        </Button>
        <Space h="md" />
        <Button
          component="a"
          download="santroller_pico2.uf2"
          href="santroller_pico2.uf2"
          target="_blank"
        >
          {t('connect.downloadPico2')}
        </Button>
      </Layout>
    </>
  );
}
