import { restartPodByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import PodStatus from '@/components/PodStatus';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import type { PodDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
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
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useCallback, useState } from 'react';

const LogsModal = dynamic(() => import('./LogsModal'), { ssr: false });
const DetailModel = dynamic(() => import('./PodDetailModal'), { ssr: false });

const Pods = ({ dbName, dbType }: { dbName: string; dbType: string }) => {
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: t('confirm_restart_pod')
  });
  const { intervalLoadPods, dbPods } = useDBStore();

  const handleRestartPod = useCallback(
    async (podName: string) => {
      try {
        await restartPodByName(podName);
        toast({
          title: `${t('Restart')} ${podName} ${t('Success')}`,
          status: 'success'
        });
      } catch (err) {
        toast({
          title: `${t('Restart')} ${podName} ${t('have_error')}`,
          status: 'warning'
        });
      }
    },
    [t, toast]
  );
  // console.log(dbPods);

  const columns: {
    title: I18nCommonKey;
    dataIndex?: keyof PodDetailType;
    key: string;
    render?: (item: PodDetailType, i: number) => JSX.Element | string;
  }[] = [
    {
      title: 'Pod Name',
      key: 'podName',
      render: (item: PodDetailType) => <Box fontWeight={'bold'}>{item.podName}</Box>
    },
    {
      title: 'Containers',
      key: 'containers',
      render: (item: PodDetailType) => <PodStatus containerStatuses={item.status} />
    },
    {
      title: 'restarts',
      key: 'restarts',
      dataIndex: 'restarts'
    },
    {
      title: 'age',
      key: 'age',
      dataIndex: 'age'
    },
    {
      title: 'operation',
      key: 'control',
      render: (item: PodDetailType, i: number) => (
        <Flex alignItems={'center'} gap={'4px'}>
          <MyTooltip offset={[0, 10]} label={t('details')}>
            <Button variant={'square'} onClick={() => setDetailPodIndex(i)}>
              <MyIcon name={'detail'} w="18px" h="18px" fill={'#485264'} />
            </Button>
          </MyTooltip>
          <MyTooltip label={t('Logs')} offset={[0, 10]}>
            <Button variant={'square'} onClick={() => setLogsPodIndex(i)}>
              <MyIcon name="log" w="18px" h="18px" fill={'#485264'} />
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

  const { isInitialLoading } = useQuery(['intervalLoadPods'], () => intervalLoadPods(dbName), {
    refetchInterval: 3000
  });

  return (
    <Box h={'100%'} position={'relative'} overflowY={'auto'}>
      <TableContainer overflow={'overlay'}>
        <Table variant={'simple'} backgroundColor={'white'} fontSize={'base'}>
          <Thead>
            <Tr>
              {columns.map((item) => (
                <Th
                  fontSize={'12px'}
                  py={4}
                  key={item.key}
                  border={'none'}
                  backgroundColor={'grayModern.50'}
                  fontWeight={'500'}
                  color={'grayModern.600'}
                >
                  {t(item.title)}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {dbPods.map((app, i) => (
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
      <Loading loading={isInitialLoading} fixed={false} />

      {logsPodIndex !== undefined && (
        <LogsModal
          dbName={dbName}
          dbType={dbType}
          podName={dbPods[logsPodIndex]?.podName || ''}
          pods={dbPods.map((item, i) => ({
            alias: `${dbName}-${i + 1}`,
            podName: item.podName
          }))}
          podAlias={`${dbName}-${logsPodIndex + 1}`}
          setLogsPodName={(name: string) =>
            setLogsPodIndex(dbPods.findIndex((item) => item.podName === name))
          }
          closeFn={() => setLogsPodIndex(undefined)}
        />
      )}
      {detailPodIndex !== undefined && (
        <DetailModel
          pod={dbPods[detailPodIndex]}
          podAlias={`${dbName}-${detailPodIndex + 1}`}
          pods={dbPods.map((item, i) => ({
            alias: `${dbName}-${i + 1}`,
            podName: item.podName
          }))}
          setPodDetail={(e: string) =>
            setDetailPodIndex(dbPods.findIndex((item) => item.podName === e))
          }
          closeFn={() => setDetailPodIndex(undefined)}
        />
      )}
      <RestartConfirmChild />
    </Box>
  );
};

export default React.memo(Pods);
