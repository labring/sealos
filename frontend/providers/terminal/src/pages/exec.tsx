import { getEnv } from '@/api/terminal';
import useSessionStore from '@/store/session';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import styles from './exec.module.scss';

const ExecTerminal = dynamic(() => import('@/components/exec-terminal'), { ssr: false });

type ServiceEnv = {
  site: string;
};

type ExecParams = {
  ns: string;
  pod: string;
  container?: string;
  command?: string[];
};

export default function ExecPage(props: ServiceEnv) {
  const router = useRouter();
  const { isUserLogin, session } = useSessionStore();

  const execParams = useMemo<ExecParams | null>(() => {
    if (!router.isReady) return null;
    const q = router.query;
    const getFirst = (v: string | string[] | undefined) => (typeof v === 'string' ? v : v?.[0]);
    const ns = getFirst((q.ns as any) ?? (q.namespace as any));
    const pod = getFirst(q.pod as any);
    const container = getFirst(q.container as any);
    if (!ns || !pod) return null;

    const commandRaw = (q.command ?? q.cmd) as any;
    let command: string[] | undefined;
    if (Array.isArray(commandRaw)) {
      command = commandRaw.map((x) => decodeURIComponent(String(x)));
    } else if (typeof commandRaw === 'string' && commandRaw.length > 0) {
      const decoded = decodeURIComponent(commandRaw);
      if (decoded.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
            command = parsed;
          }
        } catch {}
      }
      if (!command) command = [decoded];
    }

    // Only support ns/pod/container/command for now.
    return { ns, pod, container, command };
  }, [router.isReady, router.query]);

  const { data: envData, isLoading: envLoading } = useQuery({
    queryFn: () => getEnv(),
    queryKey: ['env']
  });

  if (!isUserLogin() && process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.err}>
        please go to &nbsp;<a href={props.site}>{props.site}</a>
      </div>
    );
  }

  if (!execParams) {
    return (
      <div className={styles.root}>
        <div className={styles.err}>missing query: `ns` and `pod`</div>
      </div>
    );
  }

  if (!session?.kubeconfig || envLoading) {
    return (
      <Flex w="100%" h="100%" color="white" bg="#2b2b2b" overflow={'hidden'} position={'relative'}>
        <Box w="100%" backgroundColor={'#2b2b2b'} position={'relative'}>
          <Box position={'absolute'} top="50%" left={'50%'} transform={'translate(-50%, -50%)'}>
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.600"
              color="gray.200"
              size="xl"
            />
          </Box>
        </Box>
      </Flex>
    );
  }

  const agentBaseUrl = envData?.data?.data?.TTY_AGENT_BASE_URL || undefined;

  return (
    <div className={styles.root}>
      <ExecTerminal
        key={[
          execParams.ns,
          execParams.pod,
          execParams.container ?? '',
          (execParams.command ?? []).join('\u0000')
        ].join('|')}
        kubeconfig={session.kubeconfig}
        namespace={execParams.ns}
        pod={execParams.pod}
        container={execParams.container}
        agentBaseUrl={agentBaseUrl}
        command={execParams.command}
      />
    </div>
  );
}

export async function getServerSideProps() {
  const postMessageSite = 'https://' + process.env?.SITE;
  return {
    props: {
      site: postMessageSite
    }
  };
}
