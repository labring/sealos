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

const LogsModal = dynamic(() => import('./LogsModal'));
const DetailModel = dynamic(() => import('./PodDetailModal'), { ssr: false });

const Pods = ({
  pods = [],
  loading,
  appName
}: {
  pods: PodDetailType[];
  loading: boolean;
  appName: string;
}) => {
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: '请确认重启 Pod？'
  });

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
      render: (_: PodDetailType, i: number) => (
        <Box>
          {appName}-{i + 1}
        </Box>
      )
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
      title: 'Cpu',
      key: 'cpu',
      render: (item: PodDetailType) => (
        <Box h={'35px'} w={'120px'}>
          <PodLineChart type="green" cpu={item.cpu} data={item.usedCpu.slice(-8)} />
        </Box>
      )
    },
    {
      title: 'Memory',
      key: 'memory',
      render: (item: PodDetailType) => (
        <Box h={'45px'} w={'120px'}>
          <PodLineChart type="deepBlue" data={item.usedMemory.slice(-8)} />
        </Box>
      )
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
                    <MyIcon name={'change'} w={'14px'} />
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
        </Flex>
      )
    }
  ];

  return (
    <Box h={'100%'} py={7}>
      <Flex px={6} alignItems={'center'}>
        <MyIcon name="podList" w={'14px'} color={'myGray.500'} />
        <Box ml={3} flex={1} color={'myGray.600'}>
          Pods List
        </Box>
        <Box color={'myGray.500'}>{pods.length} Items</Box>
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
                  {item.title}
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
          podName={pods[logsPodIndex].podName}
          pods={pods
            .filter((pod) => pod.status.value === PodStatusEnum.Running)
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

export default Pods;
