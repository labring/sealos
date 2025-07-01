import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { CircleHelp, MonitorIcon, NetworkIcon, Maximize } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

import MyTable from '@/components/MyTable';
import { Button } from '@/components/ui/button';
import PodLineChart from '@/components/MonitorChart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { useEnvStore } from '@/stores/env';
import { checkReady } from '@/api/platform';
import { useCopyData } from '@/utils/tools';
import { NetworkType } from '@/types/devbox';
import { useDevboxStore } from '@/stores/devbox';

const MonitorModal = dynamic(() => import('@/components/modals/MonitorModal'));

const MainBody = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { copyData } = useCopyData();

  const { env } = useEnvStore();
  const { devboxDetail } = useDevboxStore();

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [isOpen, setIsOpen] = useState(false);

  const retryCount = useRef(0);
  const { data: networkStatus, refetch } = useQuery({
    queryKey: ['networkStatus', devboxDetail?.name],
    queryFn: () =>
      devboxDetail?.name && devboxDetail?.status.value === 'Running'
        ? checkReady(devboxDetail?.name)
        : [],
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
    refetchIntervalInBackground: false
  });

  const statusMap = useMemo(
    () =>
      networkStatus
        ? networkStatus.reduce(
            (acc, item) => {
              if (item?.url) {
                acc[item.url] = item;
              }
              return acc;
            },
            {} as Record<string, { ready: boolean; url: string }>
          )
        : {},
    [networkStatus]
  );

  const networkColumn: {
    title: string;
    dataIndex?: keyof NetworkType;
    key: string;
    render?: (item: NetworkType) => JSX.Element;
    width?: string;
  }[] = [
    {
      title: t('port'),
      key: 'port',
      render: (item: NetworkType) => {
        return <p className="pl-4 text-gray-600">{item.port}</p>;
      },
      width: '0.5fr'
    },
    {
      title: t('internal_debug_address'),
      key: 'internalAddress',
      render: (item: NetworkType) => {
        return (
          <Tooltip>
            <TooltipTrigger>
              <p
                className="cursor-pointer text-gray-600 hover:underline"
                onClick={() =>
                  copyData(
                    `http://${devboxDetail?.name}.${env.namespace}.svc.cluster.local:${item.port}`
                  )
                }
              >{`http://${devboxDetail?.name}.${env.namespace}.svc.cluster.local:${item.port}`}</p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{t('copy')}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      title: t('external_debug_address'),
      key: 'externalAddress',
      render: (item: NetworkType) => {
        if (item.openPublicDomain) {
          const address = item.customDomain || item.publicDomain;
          const displayAddress = `https://${address}`;
          return (
            <div className="flex items-center gap-2">
              {displayAddress && (
                <>
                  {statusMap[displayAddress]?.ready ? (
                    <div className="flex min-w-[63px] items-center gap-0.5 rounded-full bg-[rgba(3,152,85,0.05)] px-2 py-0.5 text-xs font-normal text-[#039855]">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#039855]" />
                      {t('Accessible')}
                    </div>
                  ) : (
                    <Popover>
                      <PopoverTrigger>
                        <div className="flex cursor-pointer items-center gap-0.5 rounded-full bg-[rgba(17,24,36,0.05)] px-2 py-0.5 text-xs font-normal text-[#485264]">
                          <CircleHelp className="h-4 w-4" />
                          <p className="w-full text-xs text-[#485264]">{t('prepare')}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="h-[114px] min-h-fit w-fit min-w-[410px] rounded-[10px]">
                        <div className="h-4 w-full text-xs font-normal">
                          {t.rich('public_debug_address_tooltip_1', {
                            blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                          })}
                        </div>
                        <div className="mt-3 flex max-w-[410px] gap-1 lg:max-w-[610px]">
                          <div className="mt-0.5 flex flex-col items-center">
                            <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                            <div
                              className={cn(
                                'w-[1px] bg-gray-200',
                                locale === 'zh' ? 'h-5' : 'h-[22px]'
                              )}
                            />
                            <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                            <div
                              className={cn(
                                'w-[1px] bg-gray-200',
                                locale === 'zh' ? 'h-[38px]' : 'h-9'
                              )}
                            />
                            <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex h-4 min-h-fit w-full text-xs font-normal">
                              <div className={cn(locale === 'zh' ? 'w-auto' : 'w-1/5')}>
                                {t('public_debug_address_tooltip_2_1')}
                              </div>
                              <div className="w-4/5 text-gray-600">
                                {t('public_debug_address_tooltip_2_2')}
                              </div>
                            </div>
                            <div className="flex h-4 min-h-fit w-full text-xs font-normal">
                              <div className={cn(locale === 'zh' ? 'w-auto' : 'w-1/5')}>
                                {t('public_debug_address_tooltip_3_1')}
                              </div>
                              <div className="w-4/5 text-gray-600">
                                {t.rich('public_debug_address_tooltip_3_2', {
                                  underline: (chunks) => <span className="underline">{chunks}</span>
                                })}
                              </div>
                            </div>
                            <div className="flex h-4 min-h-fit w-full text-xs font-normal">
                              <div className={cn(locale === 'zh' ? 'w-auto' : 'w-1/5')}>
                                {t('public_debug_address_tooltip_4_1')}
                              </div>
                              <div className="w-4/5 text-gray-600">
                                {t.rich('public_debug_address_tooltip_4_2', {
                                  underline: (chunks) => <span className="underline">{chunks}</span>
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
              <Tooltip>
                <TooltipTrigger>
                  <p
                    className={cn(
                      'guide-network-address cursor-pointer hover:underline',
                      statusMap[displayAddress]?.ready ? 'text-gray-600' : 'text-gray-400'
                    )}
                    onClick={() => window.open(`https://${address}`, '_blank')}
                  >
                    https://{address}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{t('open_link')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }
        return <p>-</p>;
      }
    }
  ];

  return (
    <div className="h-full rounded-lg border bg-white p-6 pt-2">
      {/* network */}
      <div className="mt-4">
        <div className="mb-2 flex items-center">
          <NetworkIcon className="mr-1.5 h-[15px] w-[15px] text-gray-600" />
          <p className="text-base font-bold text-gray-600">
            {t('network')} ( {devboxDetail?.networks?.length} )
          </p>
        </div>
        {devboxDetail?.networks && devboxDetail.networks.length > 0 ? (
          <MyTable
            columns={networkColumn}
            data={devboxDetail?.networks}
            alternateRowColors={true}
          />
        ) : (
          <div className="flex h-[100px] items-center justify-center">
            <p className="text-gray-600">{t('no_network')}</p>
          </div>
        )}
      </div>
      <MonitorModal isOpen={isOpen} onClose={onClose} />
    </div>
  );
};

export default MainBody;
