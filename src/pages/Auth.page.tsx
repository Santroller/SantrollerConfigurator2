import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';

export function AuthPage() {
  const [searchParams, _] = useSearchParams();
  const [done, setDone] = useState(false);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  useEffect(() => {
    const t = async () => {
      const auth = localStorage.getItem('login');
      if (auth) {
        const login = JSON.parse(auth);
        if (state === login.state) {
          const url = new URL('https://worker.tangentmc.net/github-auth-exchange-endpoint');
          url.searchParams.set('code_verifier', login.code_challenge);
          url.searchParams.set('code', code!);
          const data = await fetch(url.href);
          const json = await data.json();
          json.expires_at = Date.now() + json.expires_in * 1000;
          localStorage.removeItem('login');
          localStorage.setItem('auth', JSON.stringify(json));
          setDone(true);
        }
      }
    };
    t().catch(console.error);
  });
  if (done) {
    return <Navigate to="/" />;
  }
  return (
    <>
      <Layout>
        <></>
      </Layout>
    </>
  );
}
