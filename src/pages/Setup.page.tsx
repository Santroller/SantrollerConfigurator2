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
