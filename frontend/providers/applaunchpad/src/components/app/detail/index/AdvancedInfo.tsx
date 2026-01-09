import MyIcon from '@/components/Icon';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { Separator } from '@sealos/shadcn-ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from '@/components/app/detail/index/index.module.scss';

const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));

const AdvancedInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [detailConfigMap, setDetailConfigMap] = useState<{
    mountPath: string;
    value: string;
  }>();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="px-8">
      <div>
        <button
          type="button"
          className="flex items-center w-full h-[52px] text-left py-4 px-0 hover:bg-transparent transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="text-zinc-900 text-sm font-bold">{t('Advanced Configuration')}</div>

          <div className="ml-5 flex items-center text-xs font-normal text-zinc-600">
            <span>
              {t('Command')}: {app.runCMD || 'Not Configured'}
            </span>
            <Separator orientation="vertical" className="h-3 mx-4 bg-zinc-300" />
            <span>
              {t('Environment Variables')}: {app.envs?.length}
            </span>
            <Separator orientation="vertical" className="h-3 mx-4 bg-zinc-300" />
            <span>ConfigMaps: {app.configMapList?.length}</span>
            <Separator orientation="vertical" className="h-3 mx-4 bg-zinc-300" />
            <span>
              {t('Storage')}: {app.storeList?.length}
            </span>
          </div>

          <div className="ml-auto">
            <ChevronDown
              className={`w-5 h-5 text-zinc-600 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
        {isExpanded && (
          <div>
            <div className="mt-2 flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-normal text-zinc-600">
                  <div>{t('Command')}</div>
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-3 mt-2">
                    {[
                      { label: 'Command', value: app.runCMD || 'Not Configured' },
                      { label: 'Parameters', value: app.cmdParam || 'Not Configured' }
                    ].map((item, index) => (
                      <div key={item.label} className={index > 0 ? 'mt-3' : ''}>
                        <div className="flex">
                          <div className="flex-[0_0_80px] min-w-0">{t(item.label)}</div>
                          <div className="text-zinc-900">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-xs font-normal text-zinc-600">
                  <div>{t('Environment Variables')}</div>
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-3 mt-2">
                    {app.envs?.length > 0 ? (
                      <div className="flex flex-col border border-zinc-200 bg-white rounded-md">
                        {app.envs.map((env, index) => {
                          const valText = env.value
                            ? env.value
                            : env.valueFrom
                            ? 'value from | ***'
                            : '';
                          return (
                            <div
                              key={env.key}
                              className={`flex gap-6 px-2.5 py-2 ${
                                index !== app.envs.length - 1 ? 'border-b border-zinc-200' : ''
                              }`}
                            >
                              <div className="flex-1 max-w-[40%] break-words">{env.key}</div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex-1 ${styles.textEllipsis}`}
                                      style={{
                                        userSelect: 'auto',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => copyData(valText)}
                                    >
                                      {valText}
                                    </div>
                                  </TooltipTrigger>
                                  {valText && (
                                    <TooltipContent>
                                      <p>{valText}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-8 text-zinc-600 text-xs rounded">
                        {t('no_data_available')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-normal text-zinc-600">
                  <div>{t('Configuration File')}</div>
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-3 mt-2">
                    {app.configMapList?.length > 0 ? (
                      <div className="rounded-md overflow-hidden bg-white border border-zinc-200">
                        {app.configMapList.map((item, index) => (
                          <div
                            key={item.mountPath}
                            className={`flex items-center px-3.5 py-2 cursor-pointer hover:bg-zinc-50 ${
                              index !== app.configMapList.length - 1
                                ? 'border-b border-zinc-200'
                                : ''
                            }`}
                            onClick={() =>
                              setDetailConfigMap({ mountPath: item.mountPath, value: item.value })
                            }
                          >
                            <MyIcon name={'configMap'} width={'24px'} height={'24px'} />
                            <div className="ml-4 flex-1 min-w-0">
                              <div className="font-bold text-zinc-900">{item.mountPath}</div>
                              <div className={`${styles.textEllipsis} text-zinc-600 text-sm`}>
                                {item.value}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-8 text-zinc-600 text-xs rounded">
                        {t('no_data_available')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-xs font-normal text-zinc-600">
                  <div>{t('Storage')}</div>
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-3 mt-2">
                    {app.storeList?.length > 0 ? (
                      <div className="rounded-md overflow-hidden bg-white border border-zinc-200">
                        {app.storeList.map((item, index) => (
                          <div
                            key={item.path}
                            className={`flex items-center px-3.5 py-2 ${
                              index !== app.storeList.length - 1 ? 'border-b border-zinc-200' : ''
                            }`}
                          >
                            <MyIcon name={'store'} width={'24px'} height={'24px'} />
                            <div className="ml-4 flex-1 min-w-0">
                              <div className="text-zinc-900 font-bold">{item.path}</div>
                              <div className={`${styles.textEllipsis} text-zinc-600 text-sm`}>
                                {item.value} Gi
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-8 text-zinc-600 text-xs rounded">
                        {t('no_data_available')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </div>
  );
};

export default React.memo(AdvancedInfo);
