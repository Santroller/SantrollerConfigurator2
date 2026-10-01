import { useTranslation } from 'react-i18next';
import { Button, Group, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group justify="center" mt="xl">
      <Button onClick={() => setColorScheme('light')}>Light</Button>
      <Button onClick={() => setColorScheme('dark')}>Dark</Button>
      <Button onClick={() => setColorScheme('auto')}>Auto</Button>
      <Button onClick={() => setColorScheme('light')}>{t('colorScheme.light', 'Light')}</Button>
      <Button onClick={() => setColorScheme('dark')}>{t('colorScheme.dark', 'Dark')}</Button>
      <Button onClick={() => setColorScheme('auto')}>{t('colorScheme.auto', 'Auto')}</Button>
    </Group>
  );
}
