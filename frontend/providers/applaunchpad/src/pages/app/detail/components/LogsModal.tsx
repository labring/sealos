import React, { useState } from 'react';
import { getPodLogs } from '@/api/app';
import { useQuery } from '@tanstack/react-query';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  Box,
  useTheme,
  Flex,
  Button,
  MenuButton
} from '@chakra-ui/react';
import { useLoading } from '@/hooks/useLoading';
import { downLoadBold } from '@/utils/tools';
import styles from '../index.module.scss';
import MyMenu from '@/components/Menu';
import { ChevronDownIcon } from '@chakra-ui/icons';

const LogsModal = ({
  podName,
  pods = [],
  podAlias,
  setLogsPodName,
  closeFn
}: {
  podName: string;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setLogsPodName: (name: string) => void;
  closeFn: () => void;
}) => {
  const theme = useTheme();
  const { Loading } = useLoading();
  const [logs, setLogs] = useState('');

  const { isLoading } = useQuery(
    [podName],
    () =>
      getPodLogs({
        podName,
        pageNum: 1,
        pageSize: 20
      }),
    {
      onSuccess(res) {
        console.log(res);
        res && setLogs(res);
      }
    }
  );

  return (
    <Modal isOpen={true} onClose={closeFn} isCentered={true}>
      <ModalOverlay />
      <ModalContent className={styles.logs} display={'flex'} maxW={'90vw'} h={'90vh'} m={0}>
        <Flex p={4} alignItems={'center'}>
          <Box fontSize={'xl'} fontWeight={'bold'}>
            Pod 日志
          </Box>
          <Box px={3}>
            <MyMenu
              width={240}
              Button={
                <MenuButton
                  minW={'240px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'myWhite.400'}
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
                onClick: () => setLogsPodName(item.podName)
              }))}
            />
          </Box>
          <Button size={'sm'} onClick={() => logs && downLoadBold(logs, 'text/plain', 'log.txt')}>
            导出
          </Button>
        </Flex>
        <ModalCloseButton />
        <Box flex={'1 0 0'} h={0} position={'relative'}>
          <Box h={'100%'} whiteSpace={'pre'} px={4} pb={2} overflow={'auto'}>
            {logs}
          </Box>
          <Loading loading={isLoading} fixed={false} />
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default LogsModal;
