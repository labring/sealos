import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { CircleHelp, Network as NetworkIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { useEnvStore } from '@/stores/env';
import { useCopyData } from '@/utils/tools';
import { checkReady } from '@/api/platform';
import { NetworkType } from '@/types/devbox';
import { useDevboxStore } from '@/stores/devbox';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Network = () => {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();

  const { env } = useEnvStore();
  const { copyData } = useCopyData();
  const { devboxDetail } = useDevboxStore();

  const retryCount = useRef(0);
  const { data: networkStatus, refetch } = useQuery({
    queryKey: ['networkStatus', devboxDetail?.name],
    queryFn: () =>
      devboxDetail?.name && devboxDetail?.status.value === 'Running'
        ? checkReady(devboxDetail?.name)
        : [],
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    refetchOnWindowFocus: 'always',
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

  const protocolMap = {
    HTTP: 'https://',
    GRPC: 'grpcs://',
    WS: 'wss://'
  };

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
        return <span>{item.port}</span>;
      },
      width: '12%'
    },
    {
      title: t('internal_debug_address'),
      key: 'internalAddress',
      render: (item: NetworkType) => {
        const prefix = item.openPublicDomain ? protocolMap[item.protocol] : 'https://';
        const address = `${prefix}${devboxDetail?.name}.${env.namespace}.svc.cluster.local:${item.port}`;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex cursor-pointer break-all hover:underline"
                onClick={() => copyData(address)}
              >
                {address.replace('.svc.cluster.local', '')}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('copy')}</TooltipContent>
          </Tooltip>
        );
      },
      width: '30%'
    },
    {
      title: t('external_debug_address'),
      key: 'externalAddress',
      width: '50%',
      render: (item: NetworkType) => {
        if (!item.openPublicDomain) {
          return <div>-</div>;
        }
        const address = item.customDomain || item.publicDomain;
        const displayAddress = `https://${address}`;
        return (
          <div className="flex items-center gap-2">
            {displayAddress && (
              <>
                {statusMap[displayAddress]?.ready ? (
                  <div className="flex cursor-pointer items-center gap-2 rounded-full border-[0.5px] border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs/4 font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span className="text-emerald-600">{t('Accessible')}</span>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-2 rounded-full border-[0.5px] border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs/4 font-medium">
                        <CircleHelp className="h-4 w-4 text-zinc-400" />
                        <span className="w-full text-xs text-zinc-500">{t('prepare')}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className="flex w-fit max-w-[600px] flex-col gap-2 p-4"
                      side="bottom"
                    >
                      <span className="text-xs/4">
                        {t.rich('public_debug_address_tooltip_1', {
                          blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                        })}
                      </span>
                      <div className="flex w-full gap-2">
                        {/* left svg */}
                        <div className="flex flex-col items-center py-1">
                          <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                          <div
                            className={cn('w-[1px] bg-gray-200', locale === 'zh' ? 'h-5' : 'h-8')}
                          />
                          <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                          <div
                            className={cn('w-[1px] bg-gray-200', locale === 'zh' ? 'h-4' : 'h-7')}
                          />
                          <div className="h-[6px] w-[6px] rounded-full border border-gray-400" />
                        </div>
                        {/* right content */}
                        <div className="grid w-full grid-cols-[auto_1fr] gap-1 text-xs/4">
                          <span>{t('public_debug_address_tooltip_2_1')}</span>
                          <span className="text-zinc-600">
                            {t('public_debug_address_tooltip_2_2')}
                          </span>
                          <span>{t('public_debug_address_tooltip_3_1')}</span>
                          <span className="text-zinc-600">
                            {t.rich('public_debug_address_tooltip_3_2', {
                              underline: (chunks) => <span className="underline">{chunks}</span>
                            })}
                          </span>
                          <span>{t('public_debug_address_tooltip_4_1')}</span>
                          <span className="text-zinc-600">
                            {t.rich('public_debug_address_tooltip_4_2', {
                              underline: (chunks) => <span className="underline">{chunks}</span>
                            })}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="guide-network-address cursor-pointer text-sm/5 break-words hover:underline"
                  onClick={() => window.open(`${protocolMap[item.protocol]}${address}`, '_blank')}
                >
                  {protocolMap[item.protocol]}
                  {address}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{t('open_link')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }
    }
  ];

  const handleManage = () => {
    router.push(`/devbox/create?name=${devboxDetail?.name}&scrollTo=network`);
  };

  return (
    <div className="flex h-full max-h-[400px] flex-col items-center gap-3 rounded-xl border-[0.5px] bg-white px-6 py-5 shadow-xs">
      {/* title */}
      <div className="flex w-full items-center justify-between">
        <span className="text-lg/7 font-medium text-accent-foreground">{t('network')}</span>
        <Button variant="outline" size="sm" onClick={handleManage}>
          {t('manage')}
        </Button>
      </div>
      {/* table */}
      {devboxDetail?.networks && devboxDetail.networks.length > 0 ? (
        <ScrollArea className="w-full min-w-0 pr-2">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                {networkColumn.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                    className="px-4 break-words whitespace-normal"
                  >
                    {column.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {devboxDetail.networks.map((network, index) => (
                <TableRow key={`${network.port}-${index}`}>
                  {networkColumn.map((column) => (
                    <TableCell
                      key={`${network.port}-${column.key}`}
                      className="px-4 break-words whitespace-normal"
                    >
                      {column.render
                        ? column.render(network as NetworkType)
                        : network[column.dataIndex as keyof NetworkType]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <div className="flex h-full w-[300px] flex-col items-center justify-center gap-3">
          <div className="rounded-lg border border-dashed border-zinc-200 p-2">
            <NetworkIcon className="h-6 w-6 text-zinc-400" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-semibold text-center text-sm text-black">{t('no_network')}</span>
            <span className="text-center text-sm/5 text-neutral-500">
              {t('click_manage_to_add_network')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Network;
