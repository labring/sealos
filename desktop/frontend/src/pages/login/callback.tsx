import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { OAuthToken, Session, UserInfo } from '../../interfaces/session';
import request from '../../services/request';
import useSessionStore from '../../stores/session';

const Callback: NextPage = () => {
  const [redirect, setRedirect] = useState('');
  const router = useRouter();
  const setSessionProp = useSessionStore((s) => s.setSessionProp);

  useEffect(() => {
    if (!router.isReady) return;

    const { code, state } = router.query;
    if (code === undefined || code === '' || state === undefined || state === '') return;

    request
      .post('auth/token', { code: code, state: state })
      .then((token) => {
        // console.log('token', token);
        const oauth_token = token.data as OAuthToken;
        if (oauth_token.access_token === '') return;
        setSessionProp('token', oauth_token);

        request
          .get('auth/userinfo')
          .then((userinfo) => {
            // console.log('userinfo', userinfo);
            const user_info = userinfo.data as UserInfo;
            if (user_info.id === '') return;
            setSessionProp('user', user_info);

            request
              .get('auth/kubeconfig')
              .then((kubeconfig) => {
                // console.log('kubeconfig', kubeconfig);
                const kube_config = kubeconfig.data as string;
                if (kube_config === '') return;

                setSessionProp('kubeconfig', kube_config);

                setRedirect('/');
              })
              .catch((err) => console.log(err));
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  }, [router, setSessionProp]);

  useEffect(() => {
    if (redirect === '') return;

    const timer = setTimeout(() => {
      router.replace(redirect);
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirect, router]);

  return <></>;
};

export default Callback;
