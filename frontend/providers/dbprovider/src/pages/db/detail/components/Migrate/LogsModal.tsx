import { getLogByNameAndContainerName } from '@/api/migrate';
import MyIcon from '@/components/Icon';
import { useLoading } from '@/hooks/useLoading';
import styles from '@/pages/db/detail/index.module.scss';
import { downLoadBold } from '@/utils/tools';
import { getUserKubeConfig } from '@/utils/user';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  MenuButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { SealosMenu } from '@sealos/ui';
import { default as AnsiUp } from 'ansi_up';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';

const LogsModal = ({
  containerName,
  podName,
  podAlias,
  pods = [],
  setLogsPodName,
  closeFn
}: {
  containerName: string;
  podName: string;
  podAlias: string;
  pods: { alias: string; podName: string }[];
  setLogsPodName: (name: string) => void;
  closeFn: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { Loading } = useLoading();
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const LogBox = useRef<HTMLDivElement>(null);
  const ansi_up = useRef(new AnsiUp());
  const controller = new AbortController();

  const LogStreamFetch = async () => {
    const data = {
      podName,
      containerName,
      stream: true
    };
    try {
      const res = await fetch('/api/migrate/getLogByName', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: encodeURIComponent(getUserKubeConfig())
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      setIsLoading(false);
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let isFirstExecution = true;
      await reader.read().then(async function process({ done, value }) {
        if (done) {
          console.log('Stream finished');
          return;
        }
        const text = decoder.decode(value).replace(/<br\/>/g, '\n');

        if (isFirstExecution) {
          setTimeout(() => {
            if (!LogBox.current) return;
            LogBox.current.scrollTo({
              top: LogBox.current.scrollHeight
            });
          }, 500);

          isFirstExecution = false;
        }

        setTimeout(() => {
          if (!LogBox.current) return;
          const isBottom =
            LogBox.current.scrollTop === 0 ||
            LogBox.current.scrollTop + LogBox.current.clientHeight + 100 >=
              LogBox.current.scrollHeight;
          isBottom &&
            LogBox.current.scrollTo({
              top: LogBox.current.scrollHeight
            });
        }, 100);

        setLogs((state) => {
          return state + ansi_up.current.ansi_to_html(text);
        });

        await reader.read().then(process);
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    LogStreamFetch();
    return () => {
      console.log(controller);
      controller?.abort('uninstall');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podName]);

  const exportLogs = useCallback(async () => {
    const allLogs = await getLogByNameAndContainerName({
      containerName,
      podName,
      stream: false
    });
    downLoadBold(allLogs, 'text/plain', 'log.txt');
  }, [containerName, podName]);

  return (
    <Modal isOpen={true} onClose={closeFn} isCentered={true} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent className={styles.logs} display={'flex'} maxW={'90vw'} h={'90vh'} m={0}>
        <ModalHeader py={'8px'}>
          <Flex alignItems={'center'}>
            <Box fontSize={'xl'} fontWeight={'bold'}>
              Pod {t('Logs')}
            </Box>
            <Box px={3}>
              <SealosMenu
                width={240}
                Button={
                  <MenuButton
                    as={Button}
                    variant={'outline'}
                    leftIcon={<MyIcon name="pods" width={'16px'} height={'16px'} />}
                    minW={'240px'}
                    h={'32px'}
                    textAlign={'start'}
                    bg={'grayModern.100'}
                    border={theme.borders.base}
                    borderRadius={'md'}
                  >
                    <Flex alignItems={'center'}>
                      <Box flex={1}>{podAlias}</Box>
                      <ChevronDownIcon ml={2} />
                    </Flex>
                  </MenuButton>
                }
                menuList={pods.map((item) => ({
                  isActive: item.podName === podName,
                  child: <Box>{item.alias}</Box>,
                  onClick: () => setLogsPodName(item.podName)
                }))}
              />
            </Box>
            <Button
              height={'32px'}
              variant={'outline'}
              onClick={exportLogs}
              leftIcon={<MyIcon name={'export'} w={'16px'} />}
            >
              {t('Export')}
            </Button>
          </Flex>
          <ModalCloseButton top={'10px'} right={'10px'} />
        </ModalHeader>
        <Box flex={'1 0 0'} h={0} position={'relative'} pl={'36px'} pr={'10px'} mt={'24px'}>
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
