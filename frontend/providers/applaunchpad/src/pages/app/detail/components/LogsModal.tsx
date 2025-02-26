import { getPodLogs } from '@/api/app';
import { useLoading } from '@/hooks/useLoading';
import { AppEditType } from '@/types/app';
import { downLoadBold } from '@/utils/tools';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  MenuButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { SealosMenu } from '@sealos/ui';
import { default as AnsiUp } from 'ansi_up';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../index.module.scss';
import { getUserKubeConfig } from '@/utils/user';

const LogsModal = ({
  namespace,
  appName,
  podName,
  pods = [],
  podAlias,
  setLogsPodName,
  closeFn,
  containerName,
  contaienrs = []
}: {
  namespace: string;
  appName: string;
  podName: string;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setLogsPodName: (podName: string, containerName: string) => void;
  closeFn: () => void;
  contaienrs: AppEditType['containers'];
  containerName: string;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { Loading } = useLoading();
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const LogBox = useRef<HTMLDivElement>(null);
  const ansi_up = useRef(new AnsiUp());

  const watchLogs = async () => {
    const controller = new AbortController();
    // podName is empty. pod may  has been deleted
    if (!podName) {
      return closeFn();
    }
    const data = {
      appName,
      podName,
      stream: true,
      containerName
    };

    const res = await fetch(`/api/getPodLogs?namespace=${namespace}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          Authorization: encodeURIComponent(getUserKubeConfig())
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();

    const read = async () => {
      const { done, value } = await reader?.read();
      if (done) {
        return;
      }
      const text = decoder.decode(value).replace(/<br\/>/g, '\n');
      if (res.status === 200) {
        setIsLoading(false);
        setLogs((state) => {
          return state + ansi_up.current.ansi_to_html(text);
        });
        setTimeout(() => {
          if (!LogBox.current) return;
          const isBottom =
            LogBox.current.scrollTop === 0 ||
            LogBox.current.scrollTop + LogBox.current.clientHeight + 200 >=
              LogBox.current.scrollHeight;

          isBottom &&
            LogBox.current.scrollTo({
              top: LogBox.current.scrollHeight
            });
        }, 100);
      }
      read();
    };

    read();

    const cancelRequest = () => {
      reader.cancel();
      controller.abort('cancel');
    };

    return cancelRequest;
  };

  useEffect(() => {
    let cancelFn: any;
    const fetchData = async () => {
      setLogs('');
      cancelFn = await watchLogs();
    };
    fetchData();

    return () => {
      if (cancelFn) {
        cancelFn();
      }
    };
  }, [containerName]);

  const exportLogs = useCallback(async () => {
    const allLogs = await getPodLogs(namespace, {
      appName,
      podName,
      stream: false,
      containerName
    });
    downLoadBold(allLogs, 'text/plain', 'log.txt');
  }, [appName, containerName, namespace, podName]);

  return (
    <Modal
      isOpen={true}
      onClose={() => {
        closeFn();
      }}
      isCentered={true}
    >
      <ModalOverlay />
      <ModalContent className={styles.logs} display={'flex'} maxW={'90vw'} h={'90vh'} m={0}>
        <Flex p={4} alignItems={'center'}>
          <Box fontSize={'xl'} fontWeight={'bold'}>
            Pod {t('Log')}
          </Box>
          <Box px={3}>
            <SealosMenu
              width={240}
              Button={
                <MenuButton
                  minW={'240px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'grayModern.100'}
                  border={theme.borders.base}
                  borderRadius={'md'}
                >
                  <Flex px={4} alignItems={'center'}>
                    <Box flex={1}>{podAlias}</Box>
                    <ChevronDownIcon ml={2} />
                  </Flex>
                </MenuButton>
              }
              menuList={pods.map((item) => ({
                isActive: item.podName === podName,
                child: <Box>{item.alias}</Box>,
                onClick: () => setLogsPodName(item.podName, containerName)
              }))}
            />
          </Box>
          <Box fontSize={'xl'} fontWeight={'bold'}>
            Container {t('Log')}
          </Box>
          <Box px={3}>
            <SealosMenu
              width={240}
              Button={
                <MenuButton
                  minW={'240px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'grayModern.100'}
                  border={theme.borders.base}
                  borderRadius={'md'}
                >
                  <Flex px={4} alignItems={'center'}>
                    <Box flex={1}>{containerName}</Box>
                    <ChevronDownIcon ml={2} />
                  </Flex>
                </MenuButton>
              }
              menuList={contaienrs.map((item) => ({
                isActive: item.name === containerName,
                child: <Box>{item.name}</Box>,
                onClick: () => setLogsPodName(podName, item.name)
              }))}
            />
          </Box>
          <Button size={'sm'} onClick={exportLogs}>
            {t('Export')}
          </Button>
        </Flex>
        <ModalCloseButton color={'grayModern.900'} />
        <Box flex={'1 0 0'} h={0} position={'relative'}>
          <Box
            ref={LogBox}
            h={'100%'}
            whiteSpace={'pre'}
            px={4}
            pb={2}
            overflow={'auto'}
            fontWeight={400}
            fontFamily={'SFMono-Regular,Menlo,Monaco,Consolas,monospace'}
            dangerouslySetInnerHTML={{ __html: logs }}
          ></Box>
          <Loading loading={isLoading} fixed={false} />
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default LogsModal;
