import { restartPodByName } from '@/api/app';
import MyIcon from '@/components/Icon';
import PodLineChart from '@/components/PodLineChart';
import { PodStatusEnum } from '@/constants/app';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import type { PodDetailType } from '@/types/app';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { MyTooltip } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useCallback, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

const DetailModel = dynamic(() => import('./PodDetailModal'));
const LogsModal = dynamic(() => import('./LogsModal'));

const Pods = ({
  namespace,
  pods = [],
  loading,
  appName
}: {
  namespace: string;
  pods: PodDetailType[];
  loading: boolean;
  appName: string;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [logsContainerIndex, setLogsContainerIndex] = useState<number>(0);
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Please confirm to restart the Pod?'
  });
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();

  const handleRestartPod = useCallback(
    async (podName: string) => {
      try {
        await restartPodByName(namespace, podName);
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
        <Box fontSize={'12px'} color={'grayModern.900'} fontWeight={500}>
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
              label={`${
                item.status?.lastStateReason ? `LastReason: ${item.status?.lastStateReason}\n` : ''
              }Reason: ${item.status.reason}${
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
      render: (item: PodDetailType) => (
        <Box fontSize={'12px'} color={'grayModern.900'} fontWeight={500}>
          {item.restarts}
        </Box>
      )
    },
    {
      title: 'Age',
      key: 'age',
      render: (item: PodDetailType) => (
        <Box fontSize={'12px'} color={'grayModern.900'} fontWeight={500}>
          {item.age}
        </Box>
      )
    },
    {
      title: 'Cpu',
      key: 'cpu',
      render: (item: PodDetailType) => (
        <Box h={'45px'} w={'120px'}>
          <PodLineChart type="green" data={item.usedCpu} />
        </Box>
      )
    },
    {
      title: 'Memory',
      key: 'memory',
      render: (item: PodDetailType) => (
        <Box h={'45px'} w={'120px'}>
          <PodLineChart type="deepBlue" data={item.usedMemory} />
        </Box>
      )
    },
    {
      title: 'Operation',
      key: 'control',
      render: (item: PodDetailType, i: number) => (
        <Flex alignItems={'center'}>
          <MyTooltip label={t('Log')} offset={[0, 10]}>
            <Button variant={'square'} onClick={() => setLogsPodIndex(i)}>
              <MyIcon name="log" w="18px" h="18px" fill={'#485264'} />
            </Button>
          </MyTooltip>
          {/* <MyTooltip offset={[0, 10]} label={t('Terminal')}>
            <Button
              variant={'square'}
              onClick={() => {
                const defaultCommand = `kubectl exec -it ${item.podName} -c ${appName} -- sh -c "clear; (bash || ash || sh)"`;
                sealosApp.runEvents('openDesktopApp', {
                  appKey: 'system-terminal',
                  query: {
                    defaultCommand
                  },
                  messageData: { type: 'new terminal', command: defaultCommand }
                });
              }}
            >
              <MyIcon
                className="driver-detail-terminal"
                name={'terminal'}
                w="18px"
                h="18px"
                fill={'#485264'}
              />
            </Button>
          </MyTooltip> */}
          <MyTooltip offset={[0, 10]} label={t('Details')}>
            <Button variant={'square'} onClick={() => setDetailPodIndex(i)}>
              <MyIcon name={'detail'} w="18px" h="18px" fill={'#485264'} />
            </Button>
          </MyTooltip>
          <MyTooltip offset={[0, 10]} label={t('Restart')}>
            <Button
              variant={'square'}
              onClick={openConfirmRestart(() => handleRestartPod(item.podName))}
            >
              <MyIcon name={'restart'} w="18px" h="18px" fill={'#485264'} />
            </Button>
          </MyTooltip>
        </Flex>
      )
    }
  ];
  // console.log(controller, controller.signal.aborted, 'controller');

  return (
    <Box h={'100%'} py={5} position={'relative'}>
      <Flex px={6} alignItems={'center'} fontSize={'12px'} fontWeight={'bold'}>
        <MyIcon name="podList" w={'14px'} fill={'grayModern.600'} />
        <Box ml={3} flex={1} color={'grayModern.600'}>
          {t('Pods List')}
        </Box>
        <Box color={'grayModern.500'}>
          {pods.length} {t('Items')}
        </Box>
      </Flex>
      <TableContainer mt={5} overflow={'auto'}>
        <Table variant={'simple'} backgroundColor={'white'}>
          <Thead backgroundColor={'grayModern.50'}>
            <Tr>
              {columns.map((item) => (
                <Th
                  py={4}
                  key={item.key}
                  border={'none'}
                  fontSize={'12px'}
                  fontWeight={'500'}
                  color={'grayModern.600'}
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

      {logsPodIndex !== undefined && logsContainerIndex !== undefined && (
        <LogsModal
          contaienrs={appDetail.containers || []}
          containerName={appDetail.containers[logsContainerIndex]?.name || ''}
          namespace={namespace}
          appName={appName}
          podName={pods[logsPodIndex]?.podName || ''}
          pods={pods
            .filter((pod) => pod.status.value === PodStatusEnum.running)
            .map((item, i) => ({
              alias: `${appName}-${i + 1}`,
              podName: item.podName
            }))}
          podAlias={`${appName}-${logsPodIndex + 1}`}
          setLogsPodName={(podName: string, containerName: string) => {
            setLogsPodIndex(pods.findIndex((item) => item.podName === podName));
            setLogsContainerIndex(
              appDetail.containers?.findIndex((item) => item.name === containerName)
            );
          }}
          closeFn={() => {
            setLogsPodIndex(undefined);
            setLogsContainerIndex(0);
          }}
        />
      )}

      {detailPodIndex !== undefined && (
        <DetailModel
          namespace={namespace}
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
