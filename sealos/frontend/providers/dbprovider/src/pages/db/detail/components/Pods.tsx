import { getOpsRequest, restartPodByName, switchPodMs } from '@/api/db';
import MyIcon from '@/components/Icon';
import PodStatus from '@/components/PodStatus';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import type { DBType, OpsRequestItemType, PodDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { getPodRoleName, RequiredByKeys } from '@/utils/tools';
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
import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import styles from '../index.module.scss';
import { DBSwitchRoleKey, DBTypeEnum } from '@/constants/db';

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

  const [switchTarget, setSwitchTarget] = useState<string>('');

  async function handelSwitchMs(item: PodDetailType) {
    setSwitchTarget(item.podName);
    setTimeout(() => {
      setSwitching(true);
    }, 3000);
    const labels = item?.metadata?.labels;
    if (
      labels !== undefined &&
      labels['app.kubernetes.io/component'] !== undefined &&
      labels['app.kubernetes.io/instance'] !== undefined &&
      labels['apps.kubeblocks.io/cluster-uid'] !== undefined
    ) {
      await switchPodMs({
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
      setTimeout(() => {
        // Re-request data to avoid exceptions caused by query data not being up to date
        refetchSwitching();
      }, 3000);
    }
  }

  const [switching, setSwitching] = useState<boolean>(true);
  const [animation, setAnimation] = useState<boolean>(false);
  const { refetch: refetchSwitching } = useQuery(
    ['getOperationList', dbName, dbType],
    async () => {
      const operationList = await getOpsRequest<'switchover'>({
        name: dbName,
        label: DBSwitchRoleKey,
        dbType: dbType
      });
      setSwitching(operationList.some((item) => item.status.value === 'Running'));
      if (operationList.some((item) => item.status.value === 'Running')) {
        setSwitchTarget(
          operationList.find((item) => item.status.value === 'Running')!.switchover.instanceName ??
            ''
        );
      }
      setAnimation(!animation);
      return operationList;
    },
    {
      enabled: switching,
      refetchInterval: 1500
    }
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
              <Tag color="gray.100">{language === 'zh' ? '主节点' : role}</Tag>
            </Box>
          );
        } else if (!isAccessible && !isMaster) {
          return (
            <Box display="flex" alignItems={'center'}>
              <Tag color="gray.100">{language === 'zh' ? '从节点' : role}</Tag>
              {(() => {
                if (dbType !== DBTypeEnum.redis) {
                  if (switchTarget === item.podName) {
                    return (
                      <MyIcon className={styles.load} name="loading" w={'16px'} h={'16px'} mx={1} />
                    );
                  }
                  return (
                    <MyTooltip offset={[0, 10]} label={t('switch_to_M')}>
                      <Button
                        variant={'square'}
                        onClick={() => {
                          if (!switching) handelSwitchMs(item);
                        }}
                        color="white"
                        className="btn-switch"
                        _hover={{ color: 'currentColor', bg: '#F3F3F4' }}
                        {...(switching && {
                          cursor: 'not-allowed',
                          _hover: { color: 'red' }
                        })}
                      >
                        <MyIcon
                          name="change"
                          w={'16px'}
                          h={'16px'}
                          className="onlyShowFirst"
                          transition={'all 0.45s ease-in-out'}
                        />
                      </Button>
                    </MyTooltip>
                  );
                }
              })()}
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
    const updateSvgStyles = () => {
      const svgs = document.querySelectorAll('.onlyShowFirst');
      const loading = document.querySelector('.loading');
      if (svgs.length > 0 && loading === null) {
        const firstSvg = svgs[0] as HTMLElement;
        firstSvg.style.color = '#111824';
      }
    };

    const handleMouseOver = () => {
      if (!switching) {
        const svgs = document.querySelectorAll('.onlyShowFirst');
        if (svgs.length > 0) {
          (svgs[0] as HTMLElement).style.color = '';
        }
      }
    };

    const handleMouseOut = () => {
      if (!switching) {
        const svgs = document.querySelectorAll('.onlyShowFirst');
        if (svgs.length > 0) {
          (svgs[0] as HTMLElement).style.color = '#111824';
        }
      }
    };

    // 使用 requestAnimationFrame 确保 DOM 已加载
    requestAnimationFrame(() => {
      updateSvgStyles();
      const btns = document.querySelectorAll('.btn-switch');
      btns.forEach((btn) => {
        btn.addEventListener('mouseover', handleMouseOver);
        btn.addEventListener('mouseout', handleMouseOut);
      });

      return () => {
        btns.forEach((btn) => {
          btn.removeEventListener('mouseover', handleMouseOver);
          btn.removeEventListener('mouseout', handleMouseOut);
        });
      };
    });
  }, [switching, switchTarget, animation]);

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
