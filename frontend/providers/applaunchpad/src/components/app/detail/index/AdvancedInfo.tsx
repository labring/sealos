import MyIcon from '@/components/Icon';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType } from '@/types/app';
import { Separator } from '@sealos/shadcn-ui/separator';
import { Button } from '@sealos/shadcn-ui/button';
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
import React, { useState } from 'react';
import TruncateTooltip from '@/components/TruncateTooltip';
import { useRouter } from 'next/router';
import { FileCog, HardDrive, Variable } from 'lucide-react';

const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));

interface AdvancedInfoProps {
  app?: AppDetailType;
  containerClassName?: string;
  contentClassName?: string;
}

const AdvancedInfo = ({
  app = MOCK_APP_DETAIL,
  containerClassName,
  contentClassName
}: AdvancedInfoProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [detailConfigMap, setDetailConfigMap] = useState<{
    mountPath: string;
    value: string;
  }>();
  const handleManage = (scrollTo: string) => {
    router.push(`/app/edit?name=${app.appName}&scrollTo=${scrollTo}`);
  };
  const rootClassName = containerClassName?.length ? containerClassName : '';

  return (
    <div className={`grid grid-cols-2 w-full gap-2 overflow-y-auto ${rootClassName}`}>
      <div className="col-span-2 h-fit bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-0.5">
            <div className="text-base font-medium text-zinc-900">{t('Command')}</div>
            <div className="text-sm font-normal text-zinc-500">
              {t('If no, the default command is used')}
            </div>
          </div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center shadow-none"
            onClick={() => handleManage('settings-command')}
          >
            {t('Manage')}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-3">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium leading-none text-neutral-500">{t('Command')}</div>
            <div
              className={`h-10 flex items-center rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm cursor-default ${
                app.runCMD ? 'text-zinc-900' : 'text-zinc-500'
              }`}
            >
              <TruncateTooltip
                content={app.runCMD || ''}
                className="truncate block w-full"
                contentClassName="w-2xl"
              >
                {app.runCMD || t('Not Configured')}
              </TruncateTooltip>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium leading-none text-neutral-500">
              {t('Arguments')}
            </div>
            <div
              className={`h-10 flex items-center rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm cursor-default ${
                app.cmdParam ? 'text-zinc-900' : 'text-zinc-500'
              }`}
            >
              <TruncateTooltip
                content={app.cmdParam || ''}
                className="truncate block w-full"
                contentClassName="w-2xl"
              >
                {app.cmdParam || t('Not Configured')}
              </TruncateTooltip>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-2 bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-medium text-zinc-900">{t('Environment Variables')}</div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center shadow-none"
            onClick={() => handleManage('settings-envs')}
          >
            {t('Manage')}
          </Button>
        </div>
        {app.envs?.length > 0 ? (
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <Table className="table-fixed w-full [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0 [&_tbody_tr:nth-child(even)]:bg-zinc-50">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2 h-auto py-2 font-medium text-zinc-500 bg-zinc-50 !rounded-bl-none">
                    {t('Key')}
                  </TableHead>
                  <TableHead className="w-1/2 h-auto py-2 font-medium text-zinc-500 bg-zinc-50 !rounded-br-none">
                    {t('Value')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {app.envs.map((env) => {
                  const valText = env.value ? env.value : env.valueFrom ? 'value from | ***' : '';
                  return (
                    <TableRow key={env.key}>
                      <TableCell className="w-1/2 max-w-0 text-sm font-normal text-zinc-900">
                        <TruncateTooltip
                          content={env.key}
                          className="w-full truncate cursor-default"
                          contentClassName="w-2xl"
                        >
                          {env.key}
                        </TruncateTooltip>
                      </TableCell>
                      <TableCell className="w-1/2 max-w-0 text-sm font-normal text-zinc-900">
                        <TruncateTooltip
                          content={valText}
                          className="w-full truncate cursor-default"
                          contentClassName="w-2xl"
                        >
                          {valText}
                        </TruncateTooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full flex-1 p-4">
            <button type="button" className="w-full" onClick={() => handleManage('settings-envs')}>
              <div className="flex items-center justify-center w-full h-24">
                <div className="flex items-center justify-center flex-col gap-3">
                  <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                    <Variable className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                  </div>
                  <div className="text-zinc-900 text-sm font-semibold flex flex-col gap-1">
                    {t('no_data_available')}
                    <div className="text-xs font-normal text-zinc-500">
                      {t('Click Manage to add environment variable')}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-zinc-900">{t('Configmaps')}</div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center shadow-none"
            onClick={() => handleManage('settings-configmaps')}
          >
            {t('Manage')}
          </Button>
        </div>
        {app.configMapList?.length > 0 ? (
          <div className="space-y-1">
            {app.configMapList.map((item) => (
              <div
                key={item.mountPath}
                className="flex items-center gap-3 px-3 py-[10px] bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100 transition-colors"
                onClick={() => setDetailConfigMap({ mountPath: item.mountPath, value: item.value })}
              >
                <MyIcon
                  name="configMapColor"
                  w="24px"
                  h="24px"
                  color="#a1a1aa"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.mountPath}</p>
                  <p className="text-xs text-neutral-500 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full flex-1 p-4">
            <button
              type="button"
              className="w-full"
              onClick={() => handleManage('settings-configmaps')}
            >
              <div className="flex items-center justify-center w-full h-24">
                <div className="flex items-center justify-center flex-col gap-3">
                  <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                    <FileCog className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                  </div>
                  <div className="text-zinc-900 text-sm font-semibold flex flex-col gap-1">
                    {t('no_data_available')}
                    <div className="text-xs font-normal text-zinc-500">
                      {t('Click Manage to add configmap')}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-zinc-900">{t('Local Storage')}</div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center shadow-none"
            onClick={() => handleManage('settings-storage')}
          >
            {t('Manage')}
          </Button>
        </div>
        {app.storeList?.length > 0 ? (
          <div className="space-y-1">
            {app.storeList.map((item) => (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-[10px] bg-zinc-50 rounded-lg"
              >
                <MyIcon name="storeColor" w="24px" h="24px" color="#a1a1aa" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.path}</p>
                  <p className="text-xs text-neutral-500">{item.value} Gi</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full flex-1 p-4">
            <button
              type="button"
              className="w-full"
              onClick={() => handleManage('settings-storage')}
            >
              <div className="flex items-center justify-center w-full h-24">
                <div className="flex items-center justify-center flex-col gap-3">
                  <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
                    <HardDrive className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                  </div>
                  <div className="text-zinc-900 text-sm font-semibold flex flex-col gap-1">
                    {t('no_data_available')}
                    <div className="text-xs font-normal text-zinc-500">
                      {t('Click Manage to add storage')}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* TODO: Add probe management */}
      {/* <div className="col-span-2 bg-white border-[0.5px] border-zinc-200 rounded-xl shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-zinc-900">{t('Probe')}</div>
          <Button
            variant="outline"
            className="h-9 !px-4 rounded-lg hover:bg-zinc-50 flex items-center shadow-none"
            onClick={() => handleManage('settings-probe')}
          >
            {t('Manage')}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: 'Startup', empty: 'No startup added yet' },
            { title: 'Liveness', empty: 'No liveness added yet' },
            { title: 'Readiness', empty: 'No readiness added yet' }
          ].map((item) => (
            <div
              key={item.title}
              className="border border-zinc-200 rounded-xl p-4 bg-white flex flex-col gap-2"
            >
              <div className="text-sm font-medium text-zinc-500 border-b border-dashed border-zinc-200 pb-2 ">
                {t(item.title)}
              </div>
              <div className="text-sm font-medium text-zinc-900 text-center py-6">
                {t(item.empty)}
              </div>
            </div>
          ))}
        </div>
      </div> */}

      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </div>
  );
};

export default React.memo(AdvancedInfo);
