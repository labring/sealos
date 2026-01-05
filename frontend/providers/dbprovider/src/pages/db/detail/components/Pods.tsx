import { restartPodByName } from '@/api/db';
import PodStatus from '@/components/PodStatus';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import type { DBType, PodDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { getPodRoleName } from '@/utils/tools';
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
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { DBTypeEnum } from '@/constants/db';

const LogsModal = dynamic(() => import('./LogsModal'), { ssr: false });
const DetailModel = dynamic(() => import('./PodDetailModal'), { ssr: false });

function Tag({
  children,
  color,
  fontSize = 'xs'
}: PropsWithChildren<{ color?: string; fontSize?: string }>) {
  return (
    <Box
      borderRadius="sm"
      bg={color}
      color="black"
      px={2}
      fontSize={fontSize}
      fontWeight="bold"
      textTransform="capitalize"
      letterSpacing="wide"
      mr={1}
      width="fit-content"
      height="fit-content"
      lineHeight={'24px'}
    >
      {children}
    </Box>
  );
}

const Pods = ({
  dbName,
  dbType,
  onPodCountChange
}: {
  dbName: string;
  dbType: DBType;
  onPodCountChange?: (count: number) => void;
}) => {
  const {
    t,
    i18n: { language }
  } = useTranslation();
  const { message: toast } = useMessage();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: t('confirm_restart_pod')
  });
  const { intervalLoadPods, dbPods } = useDBStore();
  const closeFn = useCallback(() => setLogsPodIndex(undefined), [setLogsPodIndex]);

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
        <Flex alignItems={'center'} gap={'10px'}>
          <Button
            variant={'outline'}
            size={'sm'}
            width={'71px'}
            onClick={() => setDetailPodIndex(i)}
          >
            {t('details')}
          </Button>

          <Button variant={'outline'} size={'sm'} width={'56px'} onClick={() => setLogsPodIndex(i)}>
            {t('Logs')}
          </Button>

          <Button
            size={'sm'}
            variant={'outline'}
            width={'73px'}
            onClick={openConfirmRestart(() => handleRestartPod(item.podName))}
          >
            {t('Restart')}
          </Button>
        </Flex>
      )
    }
  ];

  if (
    [
      DBTypeEnum.postgresql,
      DBTypeEnum.mongodb,
      DBTypeEnum.mysql,
      DBTypeEnum.notapemysql,
      DBTypeEnum.redis
    ].includes(dbType as DBTypeEnum)
  ) {
    columns.splice(2, 0, {
      title: 'ms_node',
      key: 'ms_node',
      render: (item: PodDetailType) => {
        const { role, isMaster, isCreating: isAccessible } = getPodRoleName(item);
        if (!isAccessible && isMaster) {
          return (
            <Box>
              <Tag color="gray.100">{language === 'zh' ? '主节点' : role}</Tag>
            </Box>
          );
        } else if (!isAccessible && !isMaster) {
          return (
            <Box display="flex" alignItems={'center'}>
              <Tag color="gray.100">{language === 'zh' ? '从节点' : role}</Tag>
            </Box>
          );
        } else {
          return <Box display="flex" alignItems={'center'}></Box>;
        }
      }
    });
  }

  const { isInitialLoading } = useQuery(['intervalLoadPods'], () => intervalLoadPods(dbName), {
    refetchInterval: 3000
  });

  useEffect(() => {
    if (onPodCountChange) {
      onPodCountChange(dbPods.length);
    }
  }, [dbPods.length]); // dbPods 长度变了就触发

  return (
    <Box h={'100%'} position={'relative'}>
      <TableContainer overflowY={'auto'}>
        <Table variant={'simple'} backgroundColor={'white'} fontSize={'base'}>
          <Thead position={'sticky'} top={'0'}>
            <Tr>
              {columns.map((item) => (
                <Th
                  fontSize={'12px'}
                  py={4}
                  key={item.key}
                  border={'none'}
                  backgroundColor={'grayModern.50'}
                  fontWeight={'500'}
                  color={'#71717A'}
                  _first={{
                    borderLeftRadius: '6px'
                  }}
                  _last={{
                    borderRightRadius: '6px'
                  }}
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
          closeFn={closeFn}
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
