import Terminal from '@/components/terminal';
import request from '@/service/request';
import useSessionStore from '@/store/session';
import { Box, Flex, Spinner, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { use, useEffect, useMemo, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import styles from './index.module.scss';
import { getEnv } from '@/api/terminal';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';

type ServiceEnv = {
  site: string;
};

export default function Index(props: ServiceEnv) {
  const { setSession, isUserLogin, session } = useSessionStore();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceQuota, setWorkspaceQuota] = useState<WorkspaceQuotaItem[] | null>(null);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  const toast = useToast();

  const loadWorkspaceQuota = async () => {
    const res = await sealosApp.getWorkspaceQuota();
    setWorkspaceQuota(res.quota);
  };

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
    loadWorkspaceQuota();
  }, [setSession]);

  const { data: envData, isSuccess: envQuerySuccess } = useQuery({
    queryFn: () => getEnv(),
    queryKey: ['env']
  });

  const exceededQuotas = useMemo(() => {
    if (!workspaceQuota || !envQuerySuccess) return null;

    const quotaRequest = {
      cpu: envData.data.data.CPU_REQUIREMENT,
      memory: envData.data.data.MEMORY_REQUIREMENT,
      traffic: session.subscription.type === 'PAYG' ? 0 : 1
    };

    const exceededItems = workspaceQuota.filter((item) => {
      if (!(item.type in quotaRequest)) return false;

      if (item.limit - item.used < quotaRequest[item.type as keyof typeof quotaRequest]!) {
        return true;
      }
    });

    return exceededItems;
  }, [workspaceQuota, envData, envQuerySuccess, session]);

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
    enabled: workspaceQuota !== null && exceededQuotas?.length === 0
  });

  useEffect(() => {
    if (exceededQuotas && exceededQuotas.length > 0) {
      setExceededDialogOpen(true);
    }
  }, [exceededQuotas]);

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

        <InsufficientQuotaDialog
          items={exceededQuotas ?? []}
          open={exceededDialogOpen}
          showControls={false}
          onOpenChange={(open) => {
            // Refresh quota on open change
            loadWorkspaceQuota();
            setExceededDialogOpen(open);
          }}
          onConfirm={() => {}}
        />
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
