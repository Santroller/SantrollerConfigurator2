import { Inputs } from '@/components/Inputs/Inputs';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';

export function InputsPage() {
  return (
    <>
      <Layout>
        <RequireDevice>
          <Inputs />
        </RequireDevice>
      </Layout>
    </>
  );
}
