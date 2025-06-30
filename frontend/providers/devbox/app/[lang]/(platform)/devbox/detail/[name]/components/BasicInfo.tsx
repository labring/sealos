import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { useEnvStore } from '@/stores/env';
import { usePriceStore } from '@/stores/price';
import { useDevboxStore } from '@/stores/devbox';
import { getTemplateConfig } from '@/api/template';
import { downLoadBlob, parseTemplateConfig, useCopyData } from '@/utils/tools';

import MyIcon from '@/components/Icon';
import GPUItem from '@/components/GPUItem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectModal from '@/components/modals/SshConnectModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BasicInfo = () => {
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

  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-4">
      {/* basic info */}
      <div className="mt-2 mb-3 flex">
        <MyIcon name="info" className="mt-[1px] mr-1 h-[15px] w-[15px] text-gray-600" />
        <div className="text-base font-bold text-gray-600">{t('basic_info')}</div>
      </div>
      <Card className="space-y-4 bg-gray-50 p-4">
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('name')}</span>
          <div className="flex w-[60%] text-gray-600">
            <span className="text-xs">{devboxDetail?.name}</span>
            <Image
              className="ml-2"
              width={20}
              height={20}
              onError={(e) => {
                e.currentTarget.src = '/images/custom.svg';
              }}
              alt={devboxDetail?.iconId as string}
              src={`/images/${devboxDetail?.iconId}.svg`}
            />
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('image_info')}</span>
          <div className="w-[60%] text-gray-600">
            <span className="w-full text-xs">
              {`${env.registryAddr}/${env.namespace}/${devboxDetail?.name}`}
            </span>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('create_time')}</span>
          <div className="w-[60%] text-gray-600">
            <span className="text-xs">{devboxDetail?.createTime}</span>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('start_runtime')}</span>
          <div className="w-[60%] text-gray-600">
            <span className="w-full truncate text-xs">
              {`${devboxDetail?.templateRepositoryName}-${devboxDetail?.templateName}`}
            </span>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('start_time')}</span>
          <div className="w-[60%] text-gray-600">
            <span className="text-xs">{devboxDetail?.upTime}</span>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">CPU Limit</span>
          <div className="w-[60%] text-gray-600">
            <span className="text-xs">{(devboxDetail?.cpu || 0) / 1000} Core</span>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">Memory Limit</span>
          <div className="w-[60%] text-gray-600">
            <span className="text-xs">{(devboxDetail?.memory || 0) / 1024} G</span>
          </div>
        </div>
        {sourcePrice?.gpu && (
          <div className="flex">
            <span className="mr-2 w-[40%] text-xs">GPU</span>
            <div className="w-[60%] text-gray-600">
              <GPUItem gpu={devboxDetail?.gpu} />
            </div>
          </div>
        )}
      </Card>
      {/* ssh config */}
      <div className="mt-4 mb-3 flex items-center justify-between">
        <div className="flex">
          <MyIcon name="link" className="mt-[1px] mr-1 ml-[1px] h-[15px] w-[15px] text-gray-600" />
          <div className="text-base font-bold text-gray-600">{t('ssh_config')}</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white text-gray-600 hover:text-blue-600"
          disabled={devboxDetail?.status.value !== 'Running'}
          onClick={() => handleOneClickConfig()}
        >
          <MyIcon name="settings" className="mr-2 h-4 w-4" />
          {t('one_click_config')}
        </Button>
      </div>
      <Card className="space-y-4 bg-gray-50 p-4">
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('ssh_connect_info')}</span>
          <div className="w-[60%] text-gray-600">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild disabled={devboxDetail?.status.value !== 'Running'}>
                  <span
                    className={`w-full text-xs ${
                      devboxDetail?.status.value === 'Running'
                        ? 'cursor-pointer hover:text-blue-500'
                        : ''
                    }`}
                    onClick={
                      devboxDetail?.status.value === 'Running'
                        ? () => copyData(sshConnectCommand)
                        : undefined
                    }
                  >
                    {devboxDetail?.status.value === 'Running' ? (
                      sshConnectCommand
                    ) : (
                      <span className="ml-2">-</span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-white text-gray-900">{t('copy')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('private_key')}</span>
          <div className="w-[60%] text-gray-600">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="cursor-pointer rounded-md p-1 hover:bg-gray-100"
                    onClick={() =>
                      downLoadBlob(
                        devboxDetail?.sshConfig?.sshPrivateKey as string,
                        'application/octet-stream',
                        `${env.sealosDomain}_${env.namespace}_${devboxDetail?.name}`
                      )
                    }
                  >
                    <MyIcon name="download" className="h-4 w-4 text-gray-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white text-gray-900">
                  {t('export_privateKey')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>
      {/* event */}
      <div className="mt-4 mb-3 flex">
        <MyIcon name="response" className="mt-[2px] mr-1 h-[15px] w-[15px] text-gray-600" />
        <div className="text-base font-bold text-gray-600">{t('event')}</div>
      </div>
      <Card className="space-y-4 bg-gray-50 p-4">
        <div className="flex">
          <span className="mr-2 w-[40%] text-xs">{t('recent_error')}</span>
          <div className="w-[60%] items-center text-gray-600">
            {devboxDetail?.lastTerminatedReason ? (
              <span className="text-xs text-red-500">{devboxDetail?.lastTerminatedReason}</span>
            ) : (
              <span className="text-xs">{t('none')}</span>
            )}
          </div>
        </div>
      </Card>
      {onOpenSsHConnect && sshConfigData && (
        <SshConnectModal
          jetbrainsGuideData={sshConfigData}
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

export default BasicInfo;
