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

const LogsModal = dynamic(() => import('./LogsModal'), { ssr: false });
const DetailModel = dynamic(() => import('./PodDetailModal'), { ssr: false });

const Pods = ({ dbName, dbType }: { dbName: string; dbType: string }) => {
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: '请确认重启 Pod？'
  });
  const { intervalLoadPods, dbPods } = useDBStore();

  const handleRestartPod = useCallback(
    async (podName: string) => {
      try {
        await restartPodByName(podName);
        toast({
          title: `重启 ${podName} 成功`,
          status: 'success'
        });
      } catch (err) {
        toast({
          title: `重启 ${podName} 出现异常`,
          status: 'warning'
        });
        console.log(err);
      }
    },
    [toast]
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
      title: 'status',
      key: 'status',
      render: (item: PodDetailType) => <Box color={item.status.color}>{item.status.label}</Box>
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
      title: 'control',
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
            详情
          </Button>
          {item.status.value === PodStatusEnum.Running && (
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
                      <Box ml={2}>日志</Box>
                    </>
                  ),
                  onClick: () => setLogsPodIndex(i)
                },
                {
                  child: (
                    <>
                      <MyIcon name={'restart'} />
                      <Box ml={2}>重启</Box>
                    </>
                  ),
                  onClick: openConfirmRestart(() => handleRestartPod(item.podName))
                }
              ]}
            />
          )}
        </Flex>
      )
    }
  ];

  const { isInitialLoading } = useQuery(
    ['intervalLoadPods'],
    () => {
      intervalLoadPods(dbName);
      return null;
    },
    {
      refetchInterval: 3000
    }
  );

  return (
    <Box h={'100%'}>
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
                  {item.title}
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
          pods={dbPods
            .filter((pod) => pod.status.value === PodStatusEnum.Running)
            .map((item, i) => ({
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

export default Pods;
