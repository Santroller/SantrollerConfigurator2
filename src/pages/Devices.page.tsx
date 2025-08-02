import { Devices } from '@/components/Devices/Devices';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';

export function DevicesPage() {
  return (
    <>
      <Layout>
        <RequireDevice>
          <Devices />
        </RequireDevice>
      </Layout>
    </>
  );
}
