import { IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Paper, Text } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Asks for the controller to be connected, for the actions that need it
export function ConnectPrompt({
  promptKey = 'guides.setup.actions.connectPrompt',
}: {
  promptKey?: string;
}) {
  const { t } = useTranslation();
  const connect = useConfigStore((state) => state.connect);
  const updating = useConfigStore((state) => state.updating);
  return (
    <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-default-hover)">
      <Group justify="space-between" gap="sm">
        <Text size="sm" c="dimmed">
          {t(promptKey)}
        </Text>
        {typeof navigator !== 'undefined' && 'hid' in navigator && (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconUsb size={14} />}
            onClick={connect}
            loading={updating}
          >
            {t('guides.setup.actions.connect')}
          </Button>
        )}
      </Group>
    </Paper>
  );
}

// A step's actions, placed right after the instructions they go with. Without a controller they
// ask for one, unless another set of actions on the step already did.
export function StepActions({
  children,
  prompt = true,
}: {
  children: React.ReactNode;
  prompt?: boolean;
}) {
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  if (!connected) {
    return prompt ? <ConnectPrompt /> : null;
  }
  return hung ? null : <>{children}</>;
}
