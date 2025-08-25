import Terminal from '@/components/terminal';
import request from '@/service/request';
import useSessionStore from '@/store/session';
import { Box, Flex, Spinner, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
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
  const toast = useToast();

  useEffect(() => {
    return createSealosApp();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getSession();
        setSession(result);
      } catch (error) {
        console.log('App is not running in desktop');
      }
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
    onError(err: any) {
      if (err?.data?.code === 500 && err?.data?.data) {
        const reason = err?.data?.data?.body?.reason;
        if (reason && reason?.startsWith('40001')) {
          toast({
            position: 'top',
            description: 'Insufficient balance',
            status: 'error',
            duration: 8000,
            isClosable: true
          });
          setIsLoading(false);
          setUrl('/error');
        }
      }
    },
    refetchInterval: url === '' ? 500 : false,
    enabled: url === ''
  });

  if (isLoading) {
    return (
      <Flex w="100%" h="100%" color="white" bg="#2b2b2b" overflow={'hidden'} position={'relative'}>
        <Box w="100%" backgroundColor={'#2b2b2b'} position={'relative'}>
          <Box position={'absolute'} top="50%" left={'50%'} transform={'translate(-50%, -50%)'}>
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.600"
              color="gray.800"
              size="xl"
            />
          </Box>
        </Box>
      </Flex>
    );
  }

  if (!isUserLogin() && process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.err}>
        please go to &nbsp;<a href={props.site}>{props.site}</a>
      </div>
    );
  }

  return (
    <div className={styles.container}>{!!url && <Terminal url={url} site={props.site} />}</div>
  );
}

export async function getServerSideProps() {
  // cloud domain postmessage white list
  const postMessageSite = 'https://' + process.env?.SITE;

  return {
    props: {
      site: postMessageSite
    }
  };
}
