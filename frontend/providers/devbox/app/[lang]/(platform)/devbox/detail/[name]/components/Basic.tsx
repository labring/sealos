import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { Copy, Download, Settings } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { useEnvStore } from '@/stores/env';
import { usePriceStore } from '@/stores/price';
import { useDevboxStore } from '@/stores/devbox';
import { getTemplateConfig } from '@/api/template';
import { downLoadBlob, parseTemplateConfig, useCopyData } from '@/utils/tools';

import GPUItem from '@/components/GPUItem';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectDrawer from '@/components/drawers/SshConnectDrawer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Basic = () => {
  const t = useTranslations();
  const { copyData } = useCopyData();

  const { env } = useEnvStore();
  const { sourcePrice } = usePriceStore();
  const { devboxDetail } = useDevboxStore();

  const [onOpenSsHConnect, setOnOpenSsHConnect] = useState(false);
  const [sshConfigData, setSshConfigData] = useState<JetBrainsGuideData | null>(null);

  const handleOneClickConfig = useCallback(async () => {
    const result = await getTemplateConfig(devboxDetail?.templateUid as string);
    const config = parseTemplateConfig(result.template.config);

    if (!devboxDetail?.sshPort) return;

    setSshConfigData({
      devboxName: devboxDetail?.name,
      runtimeType: devboxDetail?.templateRepositoryName,
      privateKey: devboxDetail?.sshConfig?.sshPrivateKey as string,
      userName: devboxDetail?.sshConfig?.sshUser as string,
      token: devboxDetail?.sshConfig?.token as string,
      workingDir: config.workingDir,
      host: env.sealosDomain,
      port: devboxDetail?.sshPort.toString(),
      configHost: `${env.sealosDomain}_${env.namespace}_${devboxDetail?.name}`
    });

    setOnOpenSsHConnect(true);
  }, [
    devboxDetail?.name,
    devboxDetail?.templateUid,
    devboxDetail?.sshPort,
    devboxDetail?.templateRepositoryName,
    env.sealosDomain,
    env.namespace,
    devboxDetail?.sshConfig?.sshUser,
    devboxDetail?.sshConfig?.sshPrivateKey,
    devboxDetail?.sshConfig?.token
  ]);

  const sshConnectCommand = useMemo(
    () =>
      `ssh -i ${env.sealosDomain}_${env.namespace}_${devboxDetail?.name} ${devboxDetail?.sshConfig?.sshUser}@${env.sealosDomain} -p ${devboxDetail?.sshPort}`,
    [
      devboxDetail?.name,
      devboxDetail?.sshConfig?.sshUser,
      devboxDetail?.sshPort,
      env.sealosDomain,
      env.namespace
    ]
  );

  const basicInfoItems = useMemo((): BasicInfoItemType[] => {
    return [
      {
        type: 'single' as const,
        items: [
          {
            title: t('image_info'),
            value: `${env.registryAddr}/${env.namespace}/${devboxDetail?.name}`
          }
        ]
      },
      {
        type: 'double' as const,
        items: [
          {
            title: t('create_time'),
            value: dayjs(devboxDetail?.createTime).format('YYYY-MM-DD HH:mm')
          },
          { title: t('start_time'), value: devboxDetail?.upTime }
        ]
      },
      {
        type: 'double' as const,
        items: [
          { title: 'CPU Limit', value: `${(devboxDetail?.cpu || 0) / 1000} Core` },
          { title: 'Memory Limit', value: `${(devboxDetail?.memory || 0) / 1024} GiB` }
        ]
      },
      ...(sourcePrice?.gpu
        ? [
            {
              type: 'single' as const,
              items: [{ title: t('gpu'), value: <GPUItem gpu={devboxDetail?.gpu} /> }]
            }
          ]
        : [])
    ];
  }, [
    devboxDetail?.createTime,
    devboxDetail?.upTime,
    devboxDetail?.cpu,
    devboxDetail?.memory,
    devboxDetail?.gpu,
    devboxDetail?.name,
    env.registryAddr,
    env.namespace,
    sourcePrice?.gpu,
    t
  ]);

  return (
    <div className="flex min-w-[450px] flex-col items-start rounded-xl border-[0.5px] bg-white shadow-xs">
      {/* top:basic,ssh config*/}
      <div className="flex w-full flex-shrink-0 flex-grow-1 flex-col items-start gap-4 p-6">
        {/* title */}
        <div className="flex items-center gap-2">
          <div className="text-lg/7 font-medium">{t('basic_info')}</div>
          <div className="rounded-full border-[0.5px] border-zinc-200 bg-zinc-50 px-2 text-xs/4 text-zinc-700">{`${devboxDetail?.templateRepositoryName}-${devboxDetail?.templateName}`}</div>
        </div>
        {/* basic info */}
        <div className="flex w-full flex-col items-start gap-4">
          <div className="flex w-full flex-col items-start gap-5">
            {basicInfoItems.map((item, index) => (
              <BasicInfoRow key={index} items={item} />
            ))}
          </div>
          <Separator className="bg-zinc-100" />
          {/* ssh config */}
          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex w-full flex-col items-start gap-1">
              {/* Title */}
              <span className="text-sm text-zinc-500">{t('ssh_config')}</span>
              {/* Connection String */}
              <div
                className={cn(
                  'w-full text-sm/5 text-zinc-900',
                  devboxDetail?.status.value === 'Running' && 'hover:text-blue-500'
                )}
              >
                {devboxDetail?.status.value === 'Running' ? (
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer truncate text-sm text-zinc-900"
                          onClick={() => copyData(sshConnectCommand)}
                        >
                          {sshConnectCommand}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{sshConnectCommand}</TooltipContent>
                    </Tooltip>
                    <Copy
                      className="h-4 w-4 cursor-pointer text-neutral-500"
                      onClick={() => copyData(sshConnectCommand)}
                    />
                  </div>
                ) : (
                  <span className="ml-2">-</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  downLoadBlob(
                    devboxDetail?.sshConfig?.sshPrivateKey as string,
                    'application/octet-stream',
                    `${env.sealosDomain}_${env.namespace}_${devboxDetail?.name}`
                  )
                }
              >
                <Download className="h-4 w-4 text-neutral-500" />
                {t('private_key')}
              </Button>
              <Button
                variant="outline"
                disabled={devboxDetail?.status.value !== 'Running'}
                onClick={() => handleOneClickConfig()}
              >
                <Settings className="h-4 w-4 text-neutral-500" />
                {t('one_click_config')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* bottom: event */}
      <div
        className={cn(
          'flex h-13 w-full flex-col items-start justify-center border-t border-zinc-100 px-6 py-3',
          devboxDetail?.lastTerminatedReason && 'rounded-b-xl bg-red-50'
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-sm text-zinc-900',
              devboxDetail?.lastTerminatedReason && 'text-red-600'
            )}
          >
            {t('last_event')}:
          </span>
          <div
            className={cn(
              'text-sm/5 text-zinc-600',
              devboxDetail?.lastTerminatedReason && 'font-semibold text-red-600'
            )}
          >
            {devboxDetail?.lastTerminatedReason ? (
              <span>{devboxDetail?.lastTerminatedReason}</span>
            ) : (
              <span>{t('none_event_available')}</span>
            )}
          </div>
        </div>
      </div>
      {!!sshConfigData && (
        <SshConnectDrawer
          jetbrainsGuideData={sshConfigData}
          open={onOpenSsHConnect}
          onSuccess={() => {
            setOnOpenSsHConnect(false);
          }}
          onClose={() => {
            setOnOpenSsHConnect(false);
          }}
        />
      )}
    </div>
  );
};

type BasicInfoItemType = {
  type: 'single' | 'double';
  items: Array<{
    title: string;
    value: React.ReactNode;
  }>;
};

const BasicInfoItem = ({ title, value }: { title: string; value: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-start gap-2 self-stretch">
      <span className="text-sm text-zinc-500">{title}</span>
      <span className="text-sm text-zinc-600">{value}</span>
    </div>
  );
};

const BasicInfoRow = ({ items }: { items: BasicInfoItemType }) => {
  if (items.type === 'single') {
    return <BasicInfoItem title={items.items[0].title} value={items.items[0].value} />;
  }

  return (
    <div className="flex items-center gap-3 self-stretch">
      {items.items.map((item, index) => (
        <div key={index} className="flex-1">
          <BasicInfoItem title={item.title} value={item.value} />
        </div>
      ))}
    </div>
  );
};

export default Basic;
