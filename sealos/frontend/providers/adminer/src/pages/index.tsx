import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import styles from './index.module.scss';

type ServiceEnv = {
  site: string;
};

export default function Index(props: ServiceEnv) {
  const { setSession, isUserLogin } = useSessionStore();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return createSealosApp();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getSession();
        setSession(result);
      } catch (error) {}
    };
    initApp();
  }, [setSession]);

  useQuery(['applyApp'], () => request.post('/api/apply'), {
    onSuccess: (res) => {
      if (res?.data?.code === 200 && res?.data?.data) {
        const url = res?.data?.data;
        if (process.env.NODE_ENV === 'development') {
          setIsLoading(false);
          setUrl(url);
        }
        fetch(url, { mode: 'cors' })
          .then((res) => {
            if (res.status === 200) {
              setIsLoading(false);
              setUrl(url);
            }
          })
          .catch((err) => {});
      }
    },
    refetchInterval: url === '' ? 500 : false,
    enabled: url === ''
  });

  if (isLoading) {
    return <div className={clsx(styles.loading, styles.err)}>loading</div>;
  }

  if (!isUserLogin && process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.err}>
        please go to &nbsp;<a href={props.site}>{props.site}</a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!!url && (
        <iframe
          src={url}
          allow="camera;microphone;clipboard-write;"
          className={styles.iframeWrap}
        />
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      site: process.env.SITE
    }
  };
}
