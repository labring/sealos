import { restartPodByName, switchPodMs } from '@/api/db';
import MyIcon from '@/components/Icon';
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
  Spinner,
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
import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import styles from '../index.module.scss';
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
      color="#219BF4"
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

const Pods = ({ dbName, dbType }: { dbName: string; dbType: string }) => {
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

  const [switchTarget, setSwitchTarget] = useState<string>('');
  const finishedRef = useRef<boolean>(true);

  function handelSwitchMs(item: PodDetailType) {
    setSwitchTarget(item.podName);
    finishedRef.current = false;
    const labels = item?.metadata?.labels;
    if (
      labels !== undefined &&
      labels['app.kubernetes.io/component'] !== undefined &&
      labels['app.kubernetes.io/instance'] !== undefined &&
      labels['apps.kubeblocks.io/cluster-uid'] !== undefined
    ) {
      switchPodMs({
        dbName: labels['app.kubernetes.io/instance'],
        componentName: labels['app.kubernetes.io/component'] as DBType,
        podName: item.podName,
        namespace: item.metadata!.namespace!,
        uid: labels['apps.kubeblocks.io/cluster-uid']
      });
      toast({
        title: t('node_is_switching'),
        status: 'success'
      });
    }
  }

  useEffect(() => {
    for (const item of dbPods) {
      if (item.podName === switchTarget) {
        const { isMaster } = getPodRoleName(item);
        if (isMaster) {
          finishedRef.current = true;
          break;
        }
      }
    }
  }, [dbPods, switchTarget]);

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

  if (
    [DBTypeEnum.postgresql, DBTypeEnum.mongodb, DBTypeEnum.mysql, DBTypeEnum.redis].includes(
      dbType as DBTypeEnum
    )
  ) {
    columns.splice(2, 0, {
      title: 'ms_node',
      key: 'ms_node',
      render: (item: PodDetailType) => {
        const { role, isMaster, isCreating: isAccessible } = getPodRoleName(item);
        if (!isAccessible && isMaster) {
          return (
            <Box>
              <Tag color="#F0FBFF">{language === 'zh' ? '主节点' : role}</Tag>
            </Box>
          );
        } else if (!isAccessible && !isMaster) {
          const canClick = switchTarget !== item.podName && finishedRef.current;
          return (
            <Box display="flex" alignItems={'center'}>
              <Tag color="#F7F8FA">{language === 'zh' ? '从节点' : role}</Tag>
              {dbType !== DBTypeEnum.redis && (
                <MyTooltip offset={[0, 10]} label={t('switch_to_M')}>
                  <Button
                    variant={'square'}
                    onClick={() => {
                      if (canClick) handelSwitchMs(item);
                    }}
                    {...(!canClick && {
                      cursor: 'not-allowed',
                      _hover: { bg: 'transparent', color: 'red.600' }
                    })}
                  >
                    {switchTarget === item.podName ? (
                      <MyIcon className={styles.load} name="loading" w={'16px'} h={'16px'} />
                    ) : (
                      <MyIcon
                        name="change"
                        w={'16px'}
                        h={'16px'}
                        {...(!canClick && {
                          color: 'grayModern.500'
                        })}
                      />
                    )}
                  </Button>
                </MyTooltip>
              )}
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
                  color={'grayModern.600'}
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
