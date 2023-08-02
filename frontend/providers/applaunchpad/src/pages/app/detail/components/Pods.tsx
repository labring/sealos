import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  MenuButton
} from '@chakra-ui/react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { restartPodByName } from '@/api/app';
import type { PodDetailType } from '@/types/app';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import PodLineChart from '@/components/PodLineChart';
import dynamic from 'next/dynamic';
import MyIcon from '@/components/Icon';
import { PodStatusEnum } from '@/constants/app';
import { useConfirm } from '@/hooks/useConfirm';
import MyMenu from '@/components/Menu';
import { useTranslation } from 'next-i18next';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import MyTooltip from '@/components/MyTooltip';

const LogsModal = dynamic(() => import('./LogsModal'));
const DetailModel = dynamic(() => import('./PodDetailModal'));

const Pods = ({
  pods = [],
  loading,
  appName
}: {
  pods: PodDetailType[];
  loading: boolean;
  appName: string;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Please confirm to restart the Pod?'
  });

  const handleRestartPod = useCallback(
    async (podName: string) => {
      try {
        await restartPodByName(podName);
        toast({
          title: `${t('Restart')}  ${podName} ${t('success')}`,
          status: 'success'
        });
      } catch (err) {
        toast({
          title: `${t('Restart')}  ${podName} 出现异常`,
          status: 'warning'
        });
        console.log(err);
      }
    },
    [t, toast]
  );

  const columns: {
    title: string;
    dataIndex?: keyof PodDetailType;
    key: string;
    render?: (item: PodDetailType, i: number) => JSX.Element | string;
  }[] = [
    {
      title: 'Pod Name',
      key: 'podName',
      render: (_: PodDetailType, i: number) => (
        <Box>
          {appName}-{i + 1}
        </Box>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (item: PodDetailType) => (
        <Box color={item.status.color}>
          {item.status.label}
          {!!item.status.reason && (
            <MyTooltip
              label={`Reason: ${item.status.reason}${
                item.status.message ? `\nMessage: ${item.status.message}` : ''
              }`}
              whiteSpace={'pre-wrap'}
              wordBreak={'break-all'}
              maxW={'400px'}
            >
              <QuestionOutlineIcon ml={1} />
            </MyTooltip>
          )}
        </Box>
      )
    },
    {
      title: 'Restarts Num',
      key: 'restarts',
      dataIndex: 'restarts'
    },
    {
      title: 'Age',
      key: 'age',
      dataIndex: 'age'
    },
    {
      title: 'Cpu',
      key: 'cpu',
      render: (item: PodDetailType) => (
        <Box h={'45px'} w={'120px'}>
          <PodLineChart type="green" limit={item.cpu} data={item.usedCpu.slice(-8)} />
        </Box>
      )
    },
    {
      title: 'Memory',
      key: 'memory',
      render: (item: PodDetailType) => (
        <Box h={'45px'} w={'120px'}>
          <PodLineChart type="deepBlue" limit={item.memory} data={item.usedMemory.slice(-8)} />
        </Box>
      )
    },
    {
      title: 'Operation',
      key: 'control',
      render: (item: PodDetailType, i: number) => (
        <Flex>
          <Button
            mr={3}
            leftIcon={<MyIcon name="detail" />}
            variant={'base'}
            px={3}
            onClick={() => setDetailPodIndex(i)}
          >
            {t('Details')}
          </Button>
          <MyMenu
            width={100}
            Button={
              <MenuButton
                w={'32px'}
                h={'32px'}
                borderRadius={'sm'}
                _hover={{
                  bg: 'myWhite.400',
                  color: 'hover.iconBlue'
                }}
              >
                <MyIcon name={'more'} px={3} />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'terminal'} w={'14px'} />
                    <Box ml={2}>{t('Terminal')}</Box>
                  </>
                ),
                onClick: () => {
                  const defaultCommand = `kubectl exec -it ${item.podName} -c ${appName} -- sh -c "clear; (bash || ash || sh)"`;
                  sealosApp.runEvents('openDesktopApp', {
                    appKey: 'system-terminal',
                    query: {
                      defaultCommand
                    },
                    messageData: { type: 'new terminal', command: defaultCommand }
                  });
                }
              },
              {
                child: (
                  <>
                    <MyIcon name={'log'} w={'14px'} />
                    <Box ml={2}>{t('Log')}</Box>
                  </>
                ),
                onClick: () => setLogsPodIndex(i)
              },
              {
                child: (
                  <>
                    <MyIcon name={'restart'} />
                    <Box ml={2}>{t('Restart')} </Box>
                  </>
                ),
                onClick: openConfirmRestart(() => handleRestartPod(item.podName))
              }
            ]}
          />
        </Flex>
      )
    }
  ];

  return (
    <Box h={'100%'} py={5} position={'relative'}>
      <Flex px={6} alignItems={'center'}>
        <MyIcon name="podList" w={'14px'} color={'myGray.500'} />
        <Box ml={3} flex={1} color={'myGray.600'}>
          {t('Pods List')}
        </Box>
        <Box color={'myGray.500'}>
          {pods.length} {t('Items')}
        </Box>
      </Flex>
      <TableContainer mt={5} overflow={'auto'}>
        <Table variant={'simple'} backgroundColor={'white'}>
          <Thead>
            <Tr>
              {columns.map((item) => (
                <Th
                  py={4}
                  key={item.key}
                  border={'none'}
                  backgroundColor={'#F8F8FA'}
                  fontWeight={'500'}
                >
                  {t(item.title)}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {pods.map((app, i) => (
              <Tr key={app.podName}>
                {columns.map((col) => (
                  <Td key={col.key}>
                    {col.render
                      ? col.render(app, i)
                      : col.dataIndex
                      ? `${app[col.dataIndex]}`
                      : '-'}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Loading loading={loading} fixed={false} />
      {logsPodIndex !== undefined && (
        <LogsModal
          appName={appName}
          podName={pods[logsPodIndex]?.podName || ''}
          pods={pods
            .filter((pod) => pod.status.value === PodStatusEnum.running)
            .map((item, i) => ({
              alias: `${appName}-${i + 1}`,
              podName: item.podName
            }))}
          podAlias={`${appName}-${logsPodIndex + 1}`}
          setLogsPodName={(name: string) =>
            setLogsPodIndex(pods.findIndex((item) => item.podName === name))
          }
          closeFn={() => setLogsPodIndex(undefined)}
        />
      )}
      {detailPodIndex !== undefined && (
        <DetailModel
          pod={pods[detailPodIndex]}
          podAlias={`${appName}-${detailPodIndex + 1}`}
          pods={pods.map((item, i) => ({
            alias: `${appName}-${i + 1}`,
            podName: item.podName
          }))}
          setPodDetail={(e: string) =>
            setDetailPodIndex(pods.findIndex((item) => item.podName === e))
          }
          closeFn={() => setDetailPodIndex(undefined)}
        />
      )}
      <RestartConfirmChild />
    </Box>
  );
};

export default React.memo(Pods);
