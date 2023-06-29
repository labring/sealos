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
import { restartPodByName } from '@/api/db';
import type { PodDetailType } from '@/types/db';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import dynamic from 'next/dynamic';
import { PodStatusEnum } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import MyMenu from '@/components/Menu';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import PodStatus from '@/components/PodStatus';

const LogsModal = dynamic(() => import('./LogsModal'), { ssr: false });
const DetailModel = dynamic(() => import('./PodDetailModal'), { ssr: false });

const Pods = ({ dbName, dbType }: { dbName: string; dbType: string }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: t('Confirm Restart Pod') || 'Confirm Restart Pod'
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
          title: `${t('Restart')} ${podName} ${t('Have Error')}`,
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
      dataIndex: 'podName'
    },
    {
      title: 'Containers',
      key: 'containers',
      render: (item: PodDetailType) => <PodStatus containerStatuses={item.status} />
    },
    {
      title: 'Restarts',
      key: 'restarts',
      dataIndex: 'restarts'
    },
    {
      title: 'Age',
      key: 'age',
      dataIndex: 'age'
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
                    <MyIcon name={'log'} w={'14px'} />
                    <Box ml={2}>{t('Logs')}</Box>
                  </>
                ),
                onClick: () => setLogsPodIndex(i)
              },
              {
                child: (
                  <>
                    <MyIcon name={'restart'} />
                    <Box ml={2}>{t('Restart')}</Box>
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

  const { isInitialLoading } = useQuery(['intervalLoadPods'], () => intervalLoadPods(dbName), {
    refetchInterval: 3000
  });

  return (
    <Box h={'100%'} position={'relative'}>
      <TableContainer overflow={'overlay'}>
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
