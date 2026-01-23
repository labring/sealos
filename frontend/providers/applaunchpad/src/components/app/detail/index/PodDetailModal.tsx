import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { PodDetailType, PodEvent } from '@/types/app';
import PodLineChart from '@/components/PodLineChart';
import { MOCK_PODS } from '@/mock/apps';
import { getPodEvents, getPodLogs } from '@/api/app';
import { useQuery } from '@tanstack/react-query';
import { useLoading } from '@/hooks/useLoading';
import { streamFetch } from '@/services/streamFetch';
import { useToast } from '@/hooks/useToast';
import { downLoadBold } from '@/utils/tools';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sealos/shadcn-ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { Sparkles, CircleAlert, CircleHelp, Download, LineChart, FileClock } from 'lucide-react';
import { default as AnsiUp } from 'ansi_up';
import Empty from './empty';

import styles from '@/components/app/detail/index/index.module.scss';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { SHOW_EVENT_ANALYZE } from '@/store/static';

interface SinceItem {
  key: 'streaming_logs' | 'within_5_minute' | 'within_1_hour' | 'within_1_day' | 'terminated_logs';
  since: number;
  previous: boolean;
}

const newSinceItems = (baseTimestamp: number): SinceItem[] => {
  return [
    { key: 'streaming_logs', since: 0, previous: false },
    { key: 'within_5_minute', since: baseTimestamp - 5 * 60 * 1000, previous: false },
    { key: 'within_1_hour', since: baseTimestamp - 60 * 60 * 1000, previous: false },
    { key: 'within_1_day', since: baseTimestamp - 24 * 60 * 60 * 1000, previous: false },
    { key: 'terminated_logs', since: 0, previous: true }
  ];
};

const PodDetailModal = ({
  appName,
  pod = MOCK_PODS[0],
  pods = [],
  podAlias,
  setPodDetail,
  closeFn
}: {
  appName: string;
  pod: PodDetailType;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setPodDetail: (name: string) => void;
  closeFn: () => void;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const controller = useRef(new AbortController());
  const logsController = useRef<AbortController | null>(null);
  const { Loading } = useLoading();
  const { toast } = useToast();
  const [events, setEvents] = useState<PodEvent[]>([]);
  const [eventAnalysesText, setEventAnalysesText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOpenAnalyses, setIsOpenAnalyses] = useState(false);

  // Logs state
  const [logs, setLogs] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const LogBox = useRef<HTMLDivElement>(null);
  const ansi_up = useRef(new AnsiUp());
  const [sinceKey, setSinceKey] = useState<SinceItem['key']>('streaming_logs');
  const [sinceTime, setSinceTime] = useState(0);
  const [previous, setPrevious] = useState(false);
  const sinceItems = useMemo(() => newSinceItems(Date.now()), []);

  const RenderItem = useCallback(
    ({ label, children }: { label: string; children: React.ReactNode }) => {
      return (
        <div className="w-full flex items-center">
          <div className="flex-[0_0_100px] w-0 text-zinc-500">{label}</div>
          <div
            className="flex-[1_0_0] w-0 text-zinc-900"
            style={{ userSelect: typeof children === 'string' ? 'all' : 'auto' }}
          >
            {children}
          </div>
        </div>
      );
    },
    []
  );
  const RenderItemWithTags = useCallback(
    ({ label, children }: { label: string; children: React.ReactNode }) => {
      return (
        <div className="w-full flex flex-col gap-2">
          <div className="text-zinc-500">{label}</div>
          <div className="text-zinc-900">{children}</div>
        </div>
      );
    },
    []
  );
  const RenderTag = useCallback(({ children }: { children: string }) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-fit py-1 px-3 bg-zinc-50 whitespace-nowrap overflow-hidden text-ellipsis text-zinc-700 cursor-default border-[0.5px] border-zinc-200 rounded-lg">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{children}</p>
        </TooltipContent>
      </Tooltip>
    );
  }, []);

  const { isLoading } = useQuery(['initPodEvents'], () => getPodEvents(pod.podName), {
    refetchInterval: 3000,
    onSuccess(res) {
      setEvents(res);
    }
  });

  // Logs functions
  const switchSince = useCallback((item: SinceItem) => {
    setSinceKey(item.key);
    setPrevious(item.previous);
    setSinceTime(item.since);
  }, []);

  const watchLogs = useCallback(() => {
    if (!pod.podName) return null;
    setIsLoadingLogs(true);

    const abortController = new AbortController();
    logsController.current = abortController;

    streamFetch({
      url: '/api/getPodLogs',
      data: {
        appName,
        podName: pod.podName,
        stream: true,
        sinceTime,
        previous
      },
      abortSignal: abortController,
      firstResponse() {
        setLogs('');
        setIsLoadingLogs(false);
        setTimeout(() => {
          if (!LogBox.current) return;
          LogBox.current.scrollTo({ top: LogBox.current.scrollHeight });
        }, 500);
      },
      onMessage(text) {
        setLogs((state) => state + ansi_up.current.ansi_to_html(text));
        setTimeout(() => {
          if (!LogBox.current) return;
          const isBottom =
            LogBox.current.scrollTop === 0 ||
            LogBox.current.scrollTop + LogBox.current.clientHeight + 200 >=
              LogBox.current.scrollHeight;
          isBottom && LogBox.current.scrollTo({ top: LogBox.current.scrollHeight });
        }, 100);
      }
    });
    return abortController;
  }, [appName, pod.podName, sinceTime, previous]);

  const exportLogs = useCallback(async () => {
    try {
      const allLogs = await getPodLogs({
        appName,
        podName: pod.podName,
        stream: false,
        sinceTime,
        previous
      });
      downLoadBold(allLogs, 'text/plain', 'log.txt');
    } catch (e) {
      console.log('download log error:', e);
    }
  }, [appName, pod.podName, sinceTime, previous]);

  useEffect(() => {
    controller.current = new AbortController();
    return () => {
      controller.current?.abort();
    };
  }, []);

  // Watch logs effect
  useEffect(() => {
    const logsAbortController = watchLogs();
    return () => {
      logsAbortController?.abort();
    };
  }, [watchLogs]);

  const onCloseAnalysesModel = useCallback(() => {
    setEventAnalysesText('');
    setIsOpenAnalyses(false);
    controller.current?.abort();
    controller.current = new AbortController();
  }, []);

  const onclickAnalyses = useCallback(async () => {
    try {
      setIsOpenAnalyses(true);
      setIsAnalyzing(true);
      await streamFetch({
        url: '/api/getPodEventsAnalyses',
        data: events.map((item) => ({
          reason: item.reason,
          message: item.message,
          count: item.count,
          type: item.type,
          firstTimestamp: item.firstTime,
          lastTimestamp: item.lastTime
        })),
        abortSignal: controller.current,
        onMessage: (text: string) => {
          setEventAnalysesText((state) => (state += text));
        }
      });
    } catch (err: any) {
      toast({
        title: typeof err === 'string' ? err : err?.message || t('analysis_error'),
        status: 'warning'
      });
      onCloseAnalysesModel();
    }
    setIsAnalyzing(false);
  }, [events, onCloseAnalysesModel, t, toast]);

  return (
    <>
      <Drawer open onOpenChange={(open) => !open && closeFn()}>
        <DrawerContent direction="right" className="min-w-[1265px]">
          <DrawerHeader className="px-6 py-3">
            <div className="flex items-center gap-4">
              <DrawerTitle className="text-lg font-semibold">Pod {t('Details')}</DrawerTitle>
              <Select value={pod.podName} onValueChange={setPodDetail}>
                <SelectTrigger className="min-w-[300px] !h-9 border-zinc-200 rounded-lg text-sm font-normal">
                  <SelectValue placeholder={podAlias} />
                </SelectTrigger>
                <SelectContent className="border-[0.5px] border-zinc-200 rounded-xl p-1">
                  {pods.map((item) => (
                    <SelectItem
                      className="h-9 rounded-lg py-[10px] hover:bg-zinc-50 cursor-pointer"
                      key={item.podName}
                      value={item.podName}
                    >
                      {item.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 grid grid-cols-8 grid-rows-[430px_auto] gap-2 ">
            {/* CPU & Memory Charts */}
            {/* <div className="grid grid-cols-2 gap-2 py-2">
              <div>
                <div className="mb-3 text-sm font-medium">CPU ({pod.usedCpu.yData[pod.usedCpu.yData.length - 1]}%)</div>
                <div className="h-20 w-full">
                  <PodLineChart type={'blue'} data={pod.usedCpu} />
                </div>
              </div>
              <div>
                <div className="mb-3 text-sm font-medium">
                  {t('Memory')} ({pod.usedMemory.yData[pod.usedMemory.yData.length - 1]}%)
                </div>
                <div className="h-20 w-full">
                  <PodLineChart type={'purple'} data={pod.usedMemory} />
                </div>
              </div>
            </div> */}

            {/* Details Section */}
            <div className="flex flex-col max-h-[430px] bg-white rounded-2xl p-6 col-span-3 border-[0.5px] border-zinc-200 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-base text-zinc-900 font-semibold h-9 flex items-center">
                  {t('Details')}
                </div>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg hover:bg-zinc-50 flex items-center"
                  onClick={() =>
                    router.push(
                      `/app/detail/monitor?name=${encodeURIComponent(
                        appName
                      )}&pod=${encodeURIComponent(pod.podName)}`
                    )
                  }
                >
                  <LineChart className="w-4 h-4 text-zinc-500" />
                  {t('monitor')}
                </Button>
              </div>
              <div className="overflow-y-auto flex flex-col gap-3 text-sm">
                <RenderItem label={t('Status')}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      {pod.containerStatuses.map((container) => (
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
                      ))}
                    </div>
                    <span
                      className="text-sm text-zinc-900 font-medium"
                      style={{ color: pod.status.color }}
                    >
                      {pod.status.label}
                    </span>
                    {!!pod.status.reason && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CircleHelp className="inline-block w-3 h-3 cursor-pointer text-zinc-400" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="rounded-xl max-w-[300px] whitespace-pre-wrap break-all"
                        >
                          <p className="text-sm text-zinc-900 font-normal p-2">
                            {t('Reason')}: {pod.status.reason}
                            {pod.status.message ? `\n${t('Message')}: ${pod.status.message}` : ''}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </RenderItem>
                <RenderItem label={t('Restarts')}>{pod.restarts}</RenderItem>
                <RenderItem label={t('Age')}>{pod.age}</RenderItem>
                <RenderItem label={t('Pod Name')}>{pod.podName}</RenderItem>
                <RenderItem label={t('Controlled By')}>
                  {`${pod.metadata?.ownerReferences?.[0].kind}/${pod.metadata?.ownerReferences?.[0].name}`}
                </RenderItem>
                <RenderItemWithTags label={t('Labels')}>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(pod.metadata?.labels || {}).map(
                      ([key, value]: [string, string]) => (
                        <RenderTag key={key}>{`${key}=${value}`}</RenderTag>
                      )
                    )}
                  </div>
                </RenderItemWithTags>
                <RenderItemWithTags label={t('Annotations')}>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(pod.metadata?.annotations || {}).map(
                      ([key, value]: [string, string]) => (
                        <RenderTag key={key}>{`${key}=${value}`}</RenderTag>
                      )
                    )}
                  </div>
                </RenderItemWithTags>
              </div>
            </div>

            {/* Events Section */}
            <div className="relative flex flex-col max-h-[430px] bg-white rounded-2xl px-6 py-6 h-full col-span-5 border-[0.5px] border-zinc-200 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold text-base h-9 flex items-center">{t('Events')}</span>
                {events.length > 0 && SHOW_EVENT_ANALYZE && (
                  <Button
                    variant="outline"
                    className="ml-3 h-9 hover:bg-zinc-50 flex items-center"
                    onClick={onclickAnalyses}
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('Intelligent Analysis')}
                  </Button>
                )}
              </div>
              <div className="flex-1 h-0 overflow-y-auto flex flex-col gap-3">
                {events.map((event, i) => (
                  <div key={event.id} className={`flex gap-4 text-sm`}>
                    <div
                      className={`w-[2px] flex-shrink-0 self-stretch rounded-full ${
                        event.type === 'Warning' ? 'bg-red-400' : 'bg-emerald-400'
                      }`}
                    ></div>
                    <div className="flex gap-1 flex-col">
                      <div className="flex items-center leading-none flex-wrap gap-4">
                        <span className="font-medium text-zinc-900">
                          {event.reason},&ensp;{t('Last Occur')}: {event.lastTime}
                        </span>
                        <span className="text-zinc-500">
                          {t('First Seen')}: {event.firstTime}
                        </span>
                        <span className="text-zinc-500">
                          {t('Count')}: {event.count}
                        </span>
                      </div>
                      <div className="text-zinc-500">{event.message}</div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && !isLoading && (
                  <div className="flex items-center justify-center flex-col h-full gap-3">
                    <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                      <CircleAlert className="w-6 h-6 text-zinc-400" />
                    </div>

                    <div className="text-zinc-900 text-sm font-semibold">{t('No events yet')}</div>
                  </div>
                )}
              </div>
              <Loading loading={isLoading} fixed={false} />
            </div>

            {/* Logs Section */}
            <div className="max-h-[calc(100vh-124px)] flex flex-col gap-4 bg-white rounded-2xl p-6 col-span-8 border-[0.5px] border-zinc-200 shadow-sm h-full self-stretch">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-base text-zinc-900 font-semibold h-9 flex items-center">
                    {t('Log')}
                  </div>
                  <Select
                    value={sinceKey}
                    onValueChange={(value: string) => {
                      const item = sinceItems.find((i) => i.key === value);
                      if (item) switchSince(item);
                    }}
                  >
                    <SelectTrigger className="min-w-[160px] !h-9 border-zinc-200 rounded-lg text-sm font-normal">
                      <SelectValue placeholder={t(sinceKey)} />
                    </SelectTrigger>
                    <SelectContent className="border-[0.5px] border-zinc-200 rounded-xl p-1">
                      {sinceItems.map((item) => (
                        <SelectItem
                          className="h-9 rounded-lg py-[10px] hover:bg-zinc-50 cursor-pointer"
                          key={item.key}
                          value={item.key}
                        >
                          {t(item.key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-9 hover:bg-zinc-50 flex items-center rounded-lg"
                    onClick={() =>
                      router.push(
                        `/app/detail/logs?name=${encodeURIComponent(
                          appName
                        )}&pod=${encodeURIComponent(pod.podName)}`
                      )
                    }
                  >
                    <FileClock className="w-4 h-4 text-zinc-500" />
                    {t('More Logs')}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 hover:bg-zinc-50 flex items-center"
                    onClick={exportLogs}
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                    {t('Export')}
                  </Button>
                </div>
              </div>
              <div className="flex-1 relative min-h-0">
                {logs === '' ? (
                  <Empty />
                ) : (
                  <div
                    ref={LogBox}
                    className="h-full whitespace-pre pb-2 overflow-auto scrollbar-default font-mono text-sm rounded-lg"
                    dangerouslySetInnerHTML={{ __html: logs }}
                  />
                )}
                <Loading loading={isLoadingLogs} fixed={false} />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Analyses Dialog */}
      <Dialog
        open={isOpenAnalyses}
        onOpenChange={(open: boolean) => !open && onCloseAnalysesModel()}
      >
        <DialogContent className="max-w-[50vw] h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pod {t('Intelligent Analysis')}</DialogTitle>
          </DialogHeader>
          <div
            className={`flex-1 overflow-y-auto whitespace-pre-wrap relative pb-2 ${
              isAnalyzing ? styles.analysesAnimation : ''
            }`}
          >
            {eventAnalysesText}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PodDetailModal;
