import GPUItem from '@/components/GPUItem';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useUserStore } from '@/store/user';
import type { AppDetailType } from '@/types/app';
import { printMemory, useCopyData } from '@/utils/tools';
import { Separator } from '@sealos/shadcn-ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useMemo, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { ArrowUpRight } from 'lucide-react';

const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));

const AppBaseInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { userSourcePrice } = useUserStore();
  const [detailConfigMap, setDetailConfigMap] = useState<{
    mountPath: string;
    value: string;
  }>();

  const appInfoTable = useMemo<
    {
      name: string;
      iconName: string;
      items: {
        label: string;
        value?: string;
        copy?: string;
        render?: React.ReactNode;
      }[];
    }[]
  >(
    () => [
      {
        name: 'Basic Information',
        iconName: 'formInfo',
        items: [
          { label: 'Creation Time', value: app.createTime },
          {
            label: `${t('Image Name')} ${app.secret.use ? '(Private)' : ''}`,
            value: app.imageName
          },
          { label: 'Limit CPU', value: `${app.cpu / 1000} Core` },
          {
            label: 'Limit Memory',
            value: printMemory(app.memory)
          },
          ...(userSourcePrice?.gpu
            ? [
                {
                  label: 'GPU',
                  render: <GPUItem gpu={app.gpu} />
                }
              ]
            : [])
        ]
      },
      {
        name: 'Deployment Mode',
        iconName: 'deployMode',
        items: app.hpa.use
          ? [
              {
                label: `${app.hpa.target} ${t('target_value')}`,
                value: `${app.hpa.value}${app.hpa.target === 'gpu' ? '' : '%'}`
              },
              {
                label: 'Number of Instances',
                value: `${app.hpa.minReplicas} ~ ${app.hpa.maxReplicas}`
              }
            ]
          : [{ label: `Number of Instances`, value: `${app.replicas}` }]
      }
    ],
    [app, t, userSourcePrice?.gpu]
  );

  const appTags = useMemo(
    () => [
      ...(app.networks.find((item) => item.openPublicDomain) ? ['Public Access'] : []),
      ...(app.hpa.use ? ['Auto scaling'] : ['Fixed instance']),
      ...(app.storeList.length > 0 ? ['Stateful'] : ['Stateless'])
    ],
    [app]
  );

  const persistentVolumes = useMemo(() => {
    return app.volumes
      .filter((item) => 'persistentVolumeClaim' in item)
      .reduce(
        (
          acc: {
            path: string;
            name: string;
          }[],
          volume
        ) => {
          const mount = app.volumeMounts.find((m) => m.name === volume.name);
          if (mount) {
            acc.push({
              path: mount.mountPath,
              name: volume.name
            });
          }
          return acc;
        },
        []
      );
  }, [app.volumes, app.volumeMounts]);

  return (
    <div className="p-5 relative rounded-xl bg-white border-[0.5px] border-zinc-200 shadow-xs h-full">
      {appInfoTable.map((info, index) => (
        <div key={info.name} className="space-y-4">
          <div className="text-zinc-900 text-base font-medium">{t(info.name)}</div>
          <div className="flex flex-col gap-4 text-sm font-normal">
            {app?.source?.hasSource && index === 0 && (
              <div
                className="flex flex-wrap cursor-pointer"
                onClick={() => {
                  if (!app?.source?.sourceName) return;
                  if (app.source.sourceType === 'app_store') {
                    sealosApp.runEvents('openDesktopApp', {
                      appKey: 'system-template',
                      pathname: '/instance',
                      query: { instanceName: app.source.sourceName }
                    });
                  }
                  if (app.source.sourceType === 'sealaf') {
                    sealosApp.runEvents('openDesktopApp', {
                      appKey: 'system-sealaf',
                      pathname: '/',
                      query: { instanceName: app.source.sourceName }
                    });
                  }
                }}
              >
                <span className="min-w-[120px] w-0 text-zinc-500">{t('application_source')}</span>
                <div className="flex items-center">
                  <span className="text-zinc-700">{t(app.source?.sourceType)}</span>
                  <Separator orientation="vertical" className="h-3 mx-2 bg-zinc-100" />
                  <span className="text-zinc-500">{t('Manage all resources')}</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            )}

            {info.items.map((item, i) => (
              <div key={item.label || i} className={`flex flex-wrap`}>
                <div className="min-w-[120px] w-0 text-zinc-500">{t(item.label)}</div>
                <div className="text-zinc-700 flex-1 min-w-0 truncate">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={item.copy ? 'cursor-pointer' : 'cursor-default'}
                          onClick={() => item.value && !!item.copy && copyData(item.copy)}
                        >
                          {item.render ? item.render : item.value}
                        </span>
                      </TooltipTrigger>
                      {item.value && (
                        <TooltipContent>
                          <p>{item.value}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
          {index !== appInfoTable.length - 1 && <Separator className="my-4 bg-zinc-100" />}
        </div>
      ))}

      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </div>
  );
};

export default React.memo(AppBaseInfo);
