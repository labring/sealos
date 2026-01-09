import PodLineChart from '@/components/PodLineChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import { Popover, PopoverContent, PopoverTrigger } from '@sealos/shadcn-ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import MonitorModal from './MonitorModal';
import { useQuery } from '@tanstack/react-query';
import { checkReady } from '@/api/platform';
import { useGuideStore } from '@/store/guide';
import { startDriver, detailDriverObj } from '@/hooks/driver';
import ICPStatus from './ICPStatus';
import { CircleHelpIcon, Copy } from 'lucide-react';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [isOpen, setIsOpen] = useState(false);

  const { detailCompleted } = useGuideStore();

  useEffect(() => {
    if (!detailCompleted) {
      const checkAndStartGuide = () => {
        const guideListElement = document.getElementById('driver-detail-network');
        console.log(guideListElement, 'guideListElement');

        if (guideListElement) {
          startDriver(detailDriverObj(t));
          return true;
        }
        return false;
      };

      if (!checkAndStartGuide()) return;
      const observer = new MutationObserver((mutations, obs) => {
        if (checkAndStartGuide()) {
          obs.disconnect();
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      return () => {
        observer.disconnect();
      };
    }
  }, [detailCompleted, t]);

  const networks = useMemo(
    () =>
      app.networks.map((network) => {
        const protocol = ProtocolList.find((item) => item.value === network.protocol);
        const appProtocol = ProtocolList.find((item) => item.value === network.appProtocol);

        if (network.openNodePort) {
          return {
            inline: `${protocol?.inline}${
              network?.serviceName ? network.serviceName : app.appName
            }.${getUserNamespace()}.svc.cluster.local:${network.port}`,
            public: `${protocol?.label}${protocol?.value.toLowerCase()}.${network.domain}${
              network?.nodePort ? `:${network.nodePort}` : ''
            }`,
            customDomain: null,
            showReadyStatus: false,
            port: network.port
          };
        }

        return {
          inline: `${appProtocol?.inline}${
            network?.serviceName ? network.serviceName : app.appName
          }.${getUserNamespace()}.svc.cluster.local:${network.port}`,
          public: network.openPublicDomain
            ? `${appProtocol?.label}${
                network.customDomain
                  ? network.customDomain
                  : `${network.publicDomain}.${network.domain}${DOMAIN_PORT}`
              }`
            : '',
          customDomain: network.openPublicDomain ? network.customDomain : null,
          showReadyStatus: true,
          port: network.port
        };
      }),
    [app]
  );

  const retryCount = useRef(0);
  const { data: networkStatus, refetch } = useQuery({
    queryKey: ['networkStatus', app.appName],
    queryFn: () => checkReady(app.appName),
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    onSuccess: (data) => {
      const hasUnready = data.some((item) => !item.ready);
      if (!hasUnready) {
        retryCount.current = 0;
        return;
      }
      if (retryCount.current < 14) {
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 32000);
        retryCount.current += 1;
        setTimeout(() => {
          refetch();
        }, delay);
      }
    },
    refetchIntervalInBackground: false,
    staleTime: 1000 * 60 * 5
  });

  const statusMap = useMemo(
    () =>
      networkStatus
        ? networkStatus.reduce((acc, item) => {
            if (item?.url) {
              acc[item.url] = item;
            }
            return acc;
          }, {} as Record<string, { ready: boolean; url: string }>)
        : {},
    [networkStatus]
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* Real-time Monitoring Card */}
      <div className="p-6 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-zinc-900 text-lg font-medium">{t('Real-time Monitoring')}</div>
          <div className="text-neutral-400 text-sm font-normal">
            {t('Update Time')}&ensp;{dayjs().format('HH:mm')}
          </div>
        </div>
        <div className="w-full grid grid-cols-2 gap-4 text-sm text-zinc-700 relative driver-detail-monitor">
          <div>
            <div className="mb-1">
              CPU&ensp;({app.usedCpu.yData[app.usedCpu.yData.length - 1]}%)
            </div>
            <div className="h-15">
              <PodLineChart type={'blue'} data={app.usedCpu} />
            </div>
          </div>
          <div>
            <div className="mb-1">
              {t('Memory')}&ensp;({app.usedMemory.yData[app.usedMemory.yData.length - 1]}%)
            </div>
            <div className="h-15">
              <PodLineChart type={'purple'} data={app.usedMemory} />
            </div>
          </div>
        </div>
      </div>

      {/* Network Configuration Card */}
      <div
        id="driver-detail-network"
        className="min-h-[200px] max-h-[238px] pt-6 px-6 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="text-zinc-900 text-lg font-medium flex items-center gap-2">
            {t('Network Configuration')}
            <span className="text-base font-medium leading-none text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 border-[0.5px] border-zinc-200">
              {networks.length}
            </span>
          </div>
        </div>
        <div className="overflow-auto pb-6">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50">
                <th className="w-[85px] h-10 text-sm font-normal text-zinc-500 px-4 py-3 rounded-l-lg text-left">
                  {t('Port')}
                </th>
                <th className="h-10 text-sm font-normal text-zinc-500 px-4 py-3 text-left">
                  {t('Private Address')}
                </th>
                <th className="h-10 text-sm font-normal text-zinc-500 px-4 py-3 rounded-r-lg text-left">
                  {t('Public Address')}
                </th>
              </tr>
            </thead>
            <tbody>
              {networks.map((network, index) => {
                return (
                  <tr
                    key={network.inline + index}
                    className={`${index !== networks.length - 1 ? 'border-b border-zinc-100' : ''}`}
                  >
                    <td className="w-[85px] px-4 py-2">
                      <div className="text-sm text-zinc-700">{network.port}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="text-sm w-fit text-zinc-700 cursor-pointer"
                            onClick={() => copyData(network.inline)}
                          >
                            {network.inline.replace('.svc.cluster.local', '')}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('Copy')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {network.public && network.showReadyStatus && (
                          <div className="min-w-[70px]">
                            {statusMap[network.public]?.ready ? (
                              <div className="w-fit relative top-[1px] h-5 flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 border-[0.5px] border-emerald-200">
                                <div className="w-1.5 h-1.5 rounded-xs bg-emerald-500"></div>
                                {t('Accessible')}
                              </div>
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="w-fit relative top-[1px] h-5 flex items-center gap-1 text-xs font-medium bg-zinc-50 text-zinc-500 border-[0.5px] border-zinc-200 rounded-full px-2 py-0.5 cursor-pointer">
                                    <CircleHelpIcon className="w-3 h-3 text-zinc-400" />
                                    {t('Ready')}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 rounded-xl" side="top">
                                  <div className="p-2.5">
                                    <p className="text-zinc-900 text-xs font-normal leading-4">
                                      {network.customDomain
                                        ? t('network_not_ready_icp_reg')
                                        : t('network_not_ready')}
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-sm ${
                                  network.public ? 'text-zinc-700 cursor-pointer' : 'text-zinc-500'
                                }`}
                                {...(network.public
                                  ? {
                                      onClick: () => window.open(network.public, '_blank')
                                    }
                                  : {})}
                              >
                                {network.public || '-'}
                              </div>
                            </TooltipTrigger>
                            {network.public && (
                              <TooltipContent>
                                <p>{t('Open Link')}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          {!!network.public && (
                            <div
                              className="relative top-[1px] flex-shrink-0 w-6 h-6 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center"
                              onClick={() => copyData(network.public)}
                            >
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* ICP reg status*/}
                        {network.customDomain !== null &&
                          network.showReadyStatus === true &&
                          network.public &&
                          !statusMap[network.public]?.ready && (
                            <ICPStatus
                              customDomain={network.customDomain}
                              enabled={
                                !!networkStatus &&
                                !!network.customDomain &&
                                network.showReadyStatus === true &&
                                !!network.public &&
                                !statusMap[network.public]?.ready
                              }
                            />
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MonitorModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default AppMainInfo;
