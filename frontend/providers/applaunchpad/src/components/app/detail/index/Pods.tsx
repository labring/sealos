import { restartPodByName } from '@/api/app';
import PodLineChart from '@/components/PodLineChart';
import { PodStatusEnum } from '@/constants/app';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import type { PodDetailType } from '@/types/app';
import { CircleHelp, ScrollText, Terminal, FolderOpen } from 'lucide-react';
import { Button } from '@sealos/shadcn-ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@sealos/shadcn-ui/table';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useCallback, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { track } from '@sealos/gtm';

const LogsModal = dynamic(() => import('./LogsModal'));
const DetailModel = dynamic(() => import('./PodDetailModal'));
const PodFileModal = dynamic(() => import('./PodFileModal'));

const Pods = ({ pods = [], appName }: { pods: PodDetailType[]; appName: string }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logsPodIndex, setLogsPodIndex] = useState<number>();
  const [detailPodIndex, setDetailPodIndex] = useState<number>();
  const [detailFilePodIndex, setDetailFilePodIndex] = useState<number>();

  const closeFn = useCallback(() => setLogsPodIndex(undefined), [setLogsPodIndex]);

  const { Loading } = useLoading();
  const { openConfirm: openConfirmRestart, ConfirmChild: RestartConfirmChild } = useConfirm({
    content: 'Please confirm to restart the Pod?'
  });
  const { appDetail = MOCK_APP_DETAIL, appDetailPods } = useAppStore();
  const [isOpenPodFile, setIsOpenPodFile] = useState(false);

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
        <div className="text-sm text-zinc-900 font-medium">{_?.podName}</div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (item: PodDetailType) => (
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {item.containerStatuses.map((container) => {
              return (
                <Tooltip key={container.name}>
                  <TooltipTrigger asChild>
                    <div
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: container.state.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="rounded-xl">
                    <div className="text-sm text-zinc-900 font-normal p-2 space-y-1">
                      <div>{container.name}</div>
                      <div style={{ color: container.state.color }}>
                        {container.state.label}{' '}
                        {container.state.reason && <>({container.state.reason})</>}
                      </div>
                      <div className="flex gap-2">
                        {container.cpuLimit && (
                          <span>
                            {t('CPU')}: {container.cpuLimit}
                          </span>
                        )}{' '}
                        {container.memoryLimit && (
                          <span>
                            {t('Memory')}: {container.memoryLimit}
                          </span>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div style={{ color: item.status.color }}>
            {item.status.label}
            {!!item.status.reason && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="inline-block ml-1 w-3 h-3 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="rounded-xl max-w-[300px] whitespace-pre-wrap break-all"
                >
                  <p className="text-sm text-zinc-900 font-normal p-2">
                    Reason: {item.status.reason}
                    {item.status.message ? `\nMessage: ${item.status.message}` : ''}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Restarts Num',
      key: 'restarts',
      render: (item: PodDetailType) => (
        <div className="flex items-center text-sm text-zinc-700 font-normal gap-2">
          {item.restarts}
          {!!item.containerStatuses[0]?.state.reason && (
            <div
              className="flex items-center"
              style={{ color: item.containerStatuses[0]?.state.color }}
            >
              (<span>{item.containerStatuses[0].state.reason}</span>)
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Age',
      key: 'age',
      render: (item: PodDetailType) => (
        <div className="text-sm text-zinc-700 font-normal">{item.age}</div>
      )
    },
    {
      title: 'Cpu',
      key: 'cpu',
      render: (item: PodDetailType) => (
        <div className="h-[45px] w-[120px] relative">
          <div className="h-[45px] w-[120px] absolute">
            <PodLineChart type="blue" data={item.usedCpu} />
          </div>
        </div>
      )
    },
    {
      title: 'Memory',
      key: 'memory',
      render: (item: PodDetailType) => (
        <div className="h-[45px] w-[120px] relative">
          <div className="h-[45px] w-[120px] absolute">
            <PodLineChart type="purple" data={item.usedMemory} />
          </div>
        </div>
      )
    },
    {
      title: '',
      key: 'control',
      render: (item: PodDetailType, i: number) => (
        <div className="flex items-center gap-2 driver-detail-operate justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-2 h-9 rounded-lg text-sm border-zinc-200 hover:bg-zinc-50"
                onClick={() => setDetailPodIndex(i)}
              >
                {t('Details')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-xl">
              <p className="text-sm text-zinc-900 font-normal p-2">{t('Details')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-2 h-9 rounded-lg text-sm border-zinc-200 hover:bg-zinc-50"
                onClick={openConfirmRestart(() => handleRestartPod(item.podName))}
              >
                {t('Restart')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-xl">
              <p className="text-sm text-zinc-900 font-normal p-2">{t('Restart')}</p>
            </TooltipContent>
          </Tooltip>

          {/* logs has been moved to detail modal */}
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg border-zinc-200 hover:bg-zinc-50"
                onClick={() => setLogsPodIndex(i)}
              >
                <ScrollText className="w-4 h-4 text-zinc-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-xl">
              <p className="text-sm text-zinc-900 font-normal p-2">{t('Log')}</p>
            </TooltipContent>
          </Tooltip> */}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-9 h-9 rounded-lg border-zinc-200 hover:bg-zinc-50 driver-detail-terminal"
                onClick={() => {
                  track('deployment_action', {
                    event_type: 'terminal_open',
                    module: 'applaunchpad'
                  });
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
                <Terminal className="w-4 h-4 text-zinc-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-xl">
              <p className="text-sm text-zinc-900 font-normal p-2">{t('Terminal')}</p>
            </TooltipContent>
          </Tooltip>

          {appDetail.storeList?.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-9 h-9 rounded-lg text-sm border-zinc-200 hover:bg-zinc-50"
                  onClick={() => {
                    setDetailFilePodIndex(i);
                    setIsOpenPodFile(true);
                  }}
                >
                  <FolderOpen className="w-4 h-4 text-zinc-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="rounded-xl">
                <p className="text-sm text-zinc-900 font-normal p-2">{t('File Management')}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="h-full p-6 relative bg-white rounded-lg shadow-xs border-[0.5px] border-zinc-200">
      <div className="text-zinc-900 text-lg font-medium flex items-center gap-2">
        {t('Pods List')}
        <span className="text-base font-medium leading-none text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 border-[0.5px] border-zinc-200">
          {pods.length}
        </span>
      </div>

      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              {columns.map((item, index) => (
                <TableHead
                  key={item.key}
                  className={`h-10 px-4 py-3 text-sm font-normal text-zinc-500 text-left ${
                    index === 0
                      ? 'rounded-l-lg'
                      : index === columns.length - 1
                      ? 'rounded-r-lg'
                      : ''
                  }`}
                >
                  {t(item.title)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pods.map((app, i) => (
              <TableRow key={app.podName} className="!border-b border-zinc-100">
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-4 py-2">
                    {col.render
                      ? col.render(app, i)
                      : col.dataIndex
                      ? `${app[col.dataIndex]}`
                      : '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {logsPodIndex !== undefined && (
        <LogsModal
          appName={appName}
          podName={pods[logsPodIndex]?.podName || ''}
          pods={pods
            .filter((pod) => pod.status.value === PodStatusEnum.running)
            .map((item, i) => ({
              alias: item.podName,
              podName: item.podName
            }))}
          podAlias={pods[logsPodIndex]?.podName || ''}
          setLogsPodName={(name: string) =>
            setLogsPodIndex(pods.findIndex((item) => item.podName === name))
          }
          closeFn={closeFn}
        />
      )}
      {detailPodIndex !== undefined && (
        <DetailModel
          appName={appName}
          pod={pods[detailPodIndex]}
          podAlias={pods[detailPodIndex]?.podName || ''}
          pods={pods.map((item, i) => ({
            alias: item.podName,
            podName: item.podName
          }))}
          setPodDetail={(e: string) =>
            setDetailPodIndex(pods.findIndex((item) => item.podName === e))
          }
          closeFn={() => setDetailPodIndex(undefined)}
        />
      )}

      {isOpenPodFile && appDetail.storeList?.length > 0 && detailFilePodIndex !== undefined && (
        <PodFileModal
          isOpen={isOpenPodFile}
          onClose={() => setIsOpenPodFile(false)}
          pod={pods[detailFilePodIndex]}
          podAlias={pods[detailFilePodIndex]?.podName || ''}
          pods={pods.map((item, i) => ({
            alias: item.podName,
            podName: item.podName
          }))}
          setPodDetail={(e: string) =>
            setDetailFilePodIndex(pods.findIndex((item) => item.podName === e))
          }
        />
      )}
      <RestartConfirmChild />
    </div>
  );
};

export default React.memo(Pods);
