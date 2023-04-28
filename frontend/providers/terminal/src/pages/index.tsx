import Terminal from '@/components/terminal';
import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import styles from './index.module.scss';

export default function Index() {
  const { setSession, isUserLogin } = useSessionStore();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return createSealosApp();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getUserInfo();
        setSession(result);
      } catch (error) {}
    };
    initApp();
  }, [setSession]);

  useQuery(['applyApp'], () => request.post('/api/apply'), {
    onSuccess: (res) => {
      if (res?.data?.code === 200 && res?.data?.data) {
        const url = res?.data?.data;
        // setIsLoading(false)
        // setUrl(url)
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
    onError: (err) => {
      console.log(err, 'err');
    },
    refetchInterval: url === '' ? 500 : false,
    enabled: url === ''
  });

  if (isLoading) {
    return (
      <Flex w="100%" h="100%" color="white" bg="#2b2b2b" overflow={'hidden'}>
        <Box w="200px" backgroundColor={'#2C3035'}></Box>
        <Box w="100%" backgroundColor={'#2b2b2b'}></Box>
      </Flex>
    );
  }

  if (!isUserLogin() && process.env.NODE_ENV === 'production') {
    const tempUrl = process.env.NEXT_PUBLIC_SITE;

    return (
      <div className={styles.err}>
        please go to &nbsp;<a href={tempUrl}>{tempUrl}</a>
      </div>
    );
  }

  return <div className={styles.container}>{!!url && <Terminal url={url} />}</div>;
}
