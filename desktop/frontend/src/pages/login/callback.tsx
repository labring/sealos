import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchGet, fetchPost } from '../../lib/client_api';
import { setSession } from '../../stores/session';
import { KubeConfig, OAuthToken, Session, UserInfo } from '../../interfaces/session';

const Callback: NextPage = () => {
  const [otoken, setOToken] = useState<any>(null);
  const [uinfo, setUInfo] = useState<any>(null);
  const [kconfig, setKConfig] = useState<any>(null);
  const [redirect, setRedirect] = useState('');

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { code, state } = router.query;
    if (code === undefined || code === '' || state === undefined || state === '') return;

    fetchPost('auth/token', { code: code, state: state })
      .then((token) => {
        console.log('token', token);
        const oauth_token = token as OAuthToken;
        if (oauth_token.access_token === '') return;

        fetchGet('auth/userinfo', undefined, {
          authorization: 'Bearer ' + oauth_token.access_token
        })
          .then((userinfo) => {
            console.log('userinfo', userinfo);

            const user_info = userinfo as UserInfo;
            if (user_info.id === '') return;

            fetchGet('auth/kubeconfig', undefined, {
              authorization: 'Bearer ' + oauth_token.access_token
            })
              .then((kubeconfig) => {
                console.log('kubeconfig', kubeconfig);

                const kube_config = kubeconfig as string;
                if (kube_config === '') return;

                setOToken(JSON.stringify(oauth_token));
                setUInfo(JSON.stringify(user_info));
                setKConfig(kube_config);

                const session: Session = {
                  token: oauth_token,
                  user: user_info,
                  kubeconfig: kube_config
                };
                setSession(session);

                setRedirect('/dashboard');
              })
              .catch((err) => console.log(err));
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  }, [router.isReady]);

  useEffect(() => {
    if (redirect === '') return;

    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);
    return () => clearTimeout(timer);
  }, [redirect]);

  return (
    <>
      <pre>{uinfo}</pre>
      <pre>{otoken}</pre>
      <Link href={redirect}>dashboard</Link>
    </>
  );
};

export default Callback;
