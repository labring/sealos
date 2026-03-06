import PodLineChart from '@/components/PodLineChart';
import PodPieChart from '@/components/PodPieChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData, generatePvcNameRegex } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import MonitorModal from './MonitorModal';
import { useQuery } from '@tanstack/react-query';
import { checkReady } from '@/api/platform';
import { getAppMonitorData, getNetworkMonitorData } from '@/api/app';
import { useGuideStore } from '@/store/guide';
import { startDriver, detailDriverObj } from '@/hooks/driver';
import ICPStatus from './ICPStatus';
import { CircleHelpIcon, Copy, Settings2 } from 'lucide-react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button } from '@sealos/shadcn-ui/button';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { detailCompleted } = useGuideStore();

  const hasStorage = app.storeList && app.storeList.length > 0;
  const pvcNameRegex = generatePvcNameRegex(app);

  // Fetch storage usage data for all PVCs
  const { data: storageData } = useQuery({
    queryKey: ['storageUsage', app.appName, pvcNameRegex],
    queryFn: async () => {
      if (!pvcNameRegex) return null;
      const result = await getAppMonitorData({
        queryName: pvcNameRegex,
        queryKey: 'storage',
        step: '2m',
        pvcName: pvcNameRegex
      });
      return result;
    },
    enabled: hasStorage && !!pvcNameRegex,
    refetchInterval: 2 * 60 * 1000
  });

  // Calculate average storage usage across all PVCs
  const storageUsagePercent = useMemo(() => {
    if (!storageData?.length) return 0;

    let sum = 0;
    let count = 0;

    storageData.forEach((pvc) => {
      if (!pvc?.yData?.length) return;
      // Get the last non-null value
      for (let i = pvc.yData.length - 1; i >= 0; i--) {
        const val = pvc.yData[i];
        if (val !== null && val !== undefined) {
          sum += parseFloat(val);
          count++;
          break;
        }
      }
    });

    if (count === 0) return 0;
    const avg = sum / count;
    if (avg > 0 && avg < 0.1) return 0.1;
    return Math.round(avg * 10) / 10;
  }, [storageData]);

  // Get all available networks for error codes query (non-NodePort networks only)
  const availableNetworks = useMemo(() => {
    return app.networks?.filter((network) => !network.openNodePort) || [];
  }, [app.networks]);

  const hasNetwork = availableNetworks.length > 0;

  // Fetch error codes data for all networks (last 5 minutes)
  const { data: allNetworksErrorData } = useQuery({
    queryKey: [
      'errorCodes',
      app.appName,
      availableNetworks.map((n) => `${n.serviceName || app.appName}:${n.port}`).join(',')
    ],
    queryFn: async () => {
      if (!hasNetwork) return null;
      const end = Date.now();
      const start = end - 5 * 60 * 1000; // last 5 minutes

      // Query all networks in parallel
      const results = await Promise.all(
        availableNetworks.map((network) =>
          getNetworkMonitorData({
            serviceName: network.serviceName || app.appName,
            port: network.port,
            type: 'network_service_request_count',
            step: '1m',
            start,
            end
          })
        )
      );

      return results;
    },
    enabled: hasNetwork && !app.isPause,
    refetchInterval: 60 * 1000 // refresh every minute
  });

  // Calculate error codes counts (sum of all values across all networks)
  const errorCodesCounts = useMemo(() => {
    const counts = {
      '3xx': 0,
      '4xx': 0,
      '5xx': 0
    };

    if (!allNetworksErrorData) return counts;

    // Iterate through all network results
    allNetworksErrorData.forEach((networkData) => {
      if (!networkData) return;
      networkData.forEach((item) => {
        if (item.name && ['3xx', '4xx', '5xx'].includes(item.name)) {
          const total = item.yData.reduce((sum, val) => {
            return sum + (val ? parseInt(val, 10) : 0);
          }, 0);
          counts[item.name as keyof typeof counts] += total;
        }
      });
    });

    return counts;
  }, [allNetworksErrorData]);

  useEffect(() => {
    if (!detailCompleted) {
      const checkAndStartGuide = () => {
        const guideListElement = document.getElementById('driver-detail-network');

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
      {/* Real-time Monitoring Cards */}
      <div
        className={`w-full grid grid-cols-2 ${
          hasStorage && hasNetwork
            ? 'lg:grid-cols-4'
            : hasStorage || hasNetwork
            ? 'lg:grid-cols-3'
            : ''
        } gap-2 text-sm text-zinc-700 relative driver-detail-monitor`}
      >
        <div className="p-5 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-3">
          <div className="text-zinc-900 text-sm font-medium">
            CPU: {app.usedCpu.yData[app.usedCpu.yData.length - 1]}%
          </div>
          <div className="h-[84px]">
            <PodLineChart type={'blue'} data={app.usedCpu} />
          </div>
        </div>
        <div className="p-5 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-3">
          <div className="text-zinc-900 text-sm font-medium">
            {t('Memory')}: {app.usedMemory.yData[app.usedMemory.yData.length - 1]}%
          </div>
          <div className="h-[84px]">
            <PodLineChart type={'green'} data={app.usedMemory} />
          </div>
        </div>
        {hasStorage && (
          <div className="p-5 pb-3 min-h-0 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-3">
            <div className="text-zinc-900 text-sm font-medium">{t('storage_usage')}</div>
            <div className="flex flex-1 items-center justify-center">
              <PodPieChart type={'blue'} value={storageUsagePercent} />
            </div>
          </div>
        )}
        {/* Error Codes Card */}
        {hasNetwork && (
          <div className="p-5 pb-3 min-h-0 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-zinc-900 text-sm font-medium">{t('error_codes')}</div>
              <div className="text-xs text-zinc-400">{t('last_5_mins')}</div>
            </div>
            {errorCodesCounts['3xx'] === 0 &&
            errorCodesCounts['4xx'] === 0 &&
            errorCodesCounts['5xx'] === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2">
                <div className="pt-1">
                  <Image
                    src="/images/no_errors_found.svg"
                    alt="No errors"
                    width={72}
                    height={72}
                    className=""
                  />
                </div>
                <span className="text-xs text-zinc-500">{t('no_errors_found')}</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="py-1.5 flex items-center justify-between border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-sm text-zinc-900">300+</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-zinc-900">{errorCodesCounts['3xx']}</span>
                    <span className="text-xs text-zinc-500 ml-0.5">{t('counts')}</span>
                  </div>
                </div>
                <div className="py-1.5 flex items-center justify-between border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-sm text-zinc-900">400+</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-zinc-900">{errorCodesCounts['4xx']}</span>
                    <span className="text-xs text-zinc-500 ml-0.5">{t('counts')}</span>
                  </div>
                </div>
                <div className="py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-sm text-zinc-900">500+</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-zinc-900">{errorCodesCounts['5xx']}</span>
                    <span className="text-xs text-zinc-500 ml-0.5">{t('counts')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Network Configuration Card */}
      <div
        id="driver-detail-network"
        className="min-h-[200px] max-h-[238px] pt-5 px-5 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="text-zinc-900 text-base font-medium flex items-center gap-2">
            {t('Network Configuration')}
            <span className="text-base font-medium leading-none text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 border-[0.5px] border-zinc-200">
              {networks.length}
            </span>
          </div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center"
            onClick={() => router.push(`/app/edit?name=${app.appName}&scrollTo=network`)}
          >
            {t('Manage')}
          </Button>
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
                  <tr key={network.inline + index} className="!border-b border-zinc-100">
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-fit relative top-[1px] h-5 flex items-center gap-1 text-xs font-medium bg-zinc-50 text-zinc-500 border-[0.5px] border-zinc-200 rounded-full px-2 py-0.5 cursor-pointer">
                                    <CircleHelpIcon className="w-3 h-3 text-zinc-400" />
                                    {t('Ready')}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl">
                                  <div className="text-sm text-zinc-900 font-normal p-2">
                                    {network.customDomain
                                      ? t('network_not_ready_icp_reg')
                                      : t('network_not_ready')}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
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
