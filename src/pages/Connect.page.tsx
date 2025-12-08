import { Button } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

export function ConnectPage() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const connected = useConfigStore((state) => state.connected);
  return (
    <>
      <Layout>
        {connected && <Button onClick={disconnect}>Disconnect from Santroller</Button>}
        {!connected && <Button onClick={connect}>Connect to Santroller</Button>}
      </Layout>
    </>
  );
}
