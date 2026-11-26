import { createContext, useContext } from 'react';
import { IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Paper, Text } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Set by the build guide page. There the steps stay readable without a controller, but everything
// that needs one is greyed out and the page itself asks for a connection. The setup guide leaves
// it off, since its flashing steps run before there is a controller to connect.
export const GuideDeviceGateContext = createContext(false);

// Whether this step's controls should be greyed out for want of a controller
export function useGuideDeviceGated() {
  const gate = useContext(GuideDeviceGateContext);
  const connected = useConfigStore((state) => state.connected);
  return gate && !connected;
}

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
  const gated = useGuideDeviceGated();
  if (!connected) {
    // A gated page asks for the controller once, above the step
    return prompt && !gated ? <ConnectPrompt /> : null;
  }
  return hung ? null : <>{children}</>;
}
