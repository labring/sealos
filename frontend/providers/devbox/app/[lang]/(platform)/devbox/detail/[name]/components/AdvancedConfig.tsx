'use client';

import { useTranslations } from 'next-intl';
import { FileText, HardDrive } from 'lucide-react';

import { useRouter } from '@/i18n';
import { Button } from '@sealos/shadcn-ui/button';
import { useDevboxStore } from '@/stores/devbox';

const AdvancedConfig = () => {
  const t = useTranslations();
  const router = useRouter();
  const { devboxDetail } = useDevboxStore();

  const envs = devboxDetail?.envs || [];
  const configMaps = devboxDetail?.configMaps || [];
  const volumes = devboxDetail?.volumes || [];

  const handleManageClick = (section: 'env' | 'configmap' | 'storage') => {
    const devboxName = devboxDetail?.name;
    if (!devboxName) return;

    router.push(
      `/devbox/create?name=${devboxName}&from=detail&fromTab=advancedConfig&scrollTo=${section}`
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-start gap-2 overflow-hidden">
      {/* Environment Variables */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden rounded-xl border-[0.5px] border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h3 className="text-lg/7 font-medium text-black">{t('environment_variables')}</h3>
          <Button
            variant="outline"
            className="h-9 border border-zinc-200 bg-white px-4 py-2"
            onClick={() => handleManageClick('env')}
          >
            <span className="text-sm/5 font-medium">{t('manage')}</span>
          </Button>
        </div>

        {envs.length > 0 ? (
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border-[0.8px] border-zinc-200">
            {/* Table Header */}
            <div className="flex h-9 flex-shrink-0 border-b-[0.5px] border-zinc-200 bg-zinc-50">
              <div className="flex flex-1 items-center border-r-[0.5px] border-zinc-200 px-3 py-2">
                <span className="text-sm font-semibold text-zinc-500">{t('key')}</span>
              </div>
              <div className="flex flex-1 items-center px-3 py-2">
                <span className="text-sm font-semibold text-zinc-500">{t('value')}</span>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
              {envs.map((env, idx) => (
                <div
                  key={idx}
                  className={`flex h-9 items-center border-b-[0.5px] border-zinc-200 last:border-b-0 ${
                    idx % 2 === 1 ? 'bg-zinc-50' : ''
                  }`}
                >
                  <div className="flex flex-1 items-center border-r-[0.5px] border-zinc-200 px-3 py-2">
                    <span className="truncate text-sm">{env.key}</span>
                  </div>
                  <div className="flex flex-1 items-center px-3 py-2">
                    <span className="truncate text-sm">{env.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
            {t('no_environment_variables')}
          </div>
        )}
      </div>

      {/* Configmaps */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden rounded-xl border-[0.5px] border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h3 className="text-lg/7 font-medium text-black">{t('configmaps')}</h3>
          <Button
            variant="outline"
            className="h-9 border border-zinc-200 bg-white px-4 py-2"
            onClick={() => handleManageClick('configmap')}
          >
            <span className="text-sm/5 font-medium">{t('manage')}</span>
          </Button>
        </div>

        {configMaps.length > 0 ? (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {configMaps.map((config, idx) => (
              <div
                key={idx}
                className="flex h-14 flex-shrink-0 items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <FileText className="h-6 w-6 flex-shrink-0 text-zinc-400" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-gray-900">{config.path}</span>
                  <span className="truncate text-xs text-neutral-500">
                    {config.content.slice(0, 50)}
                    {config.content.length > 50 ? '...' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
            {t('no_configmaps')}
          </div>
        )}
      </div>

      {/* Network Storage */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden rounded-xl border-[0.5px] border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h3 className="text-lg/7 font-medium text-black">{t('network_storage')}</h3>
          <Button
            variant="outline"
            className="h-9 border border-zinc-200 bg-white px-4 py-2"
            onClick={() => handleManageClick('storage')}
          >
            <span className="text-sm/5 font-medium">{t('manage')}</span>
          </Button>
        </div>

        {volumes.length > 0 ? (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {volumes.map((storage, idx) => (
              <div
                key={idx}
                className="flex h-14 flex-shrink-0 items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <HardDrive className="h-6 w-6 flex-shrink-0 text-zinc-400" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-gray-900">{storage.path}</span>
                  <span className="text-xs text-neutral-500">{storage.size} Gi</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
            {t('no_network_storage')}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedConfig;
