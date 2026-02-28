'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import Gpu from './Gpu';
import Cpu from './Cpu';
import Memory from './Memory';
import NetworkStorage from './NetworkStorage';
import Network from './Network';
import Runtime from './Runtime';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import DevboxName from './DevboxName';
import AdvancedConfig from './AdvancedConfig';

import { Tabs, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { useEnvStore } from '@/stores/env';

interface FormProps {
  isEdit: boolean;
  countGpuInventory: (type: string) => number;
}

const Form = ({ isEdit, countGpuInventory }: FormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { watch } = useFormContext<DevboxEditTypeV2>();
  const { env } = useEnvStore();

  const formValues = watch();
  const showEnvAndConfigmap = env.enableAdvancedEnvAndConfigmap === 'true';
  const showNfs = env.enableAdvancedNfs === 'true';
  const showSharedMemory = env.enableAdvancedSharedMemory === 'true';
  const showAdvancedConfig = showEnvAndConfigmap || showSharedMemory;

  const originalVolumesRef = useRef<DevboxEditTypeV2['volumes']>();

  useEffect(() => {
    if (isEdit && !originalVolumesRef.current) {
      originalVolumesRef.current = watch('volumes');
    }
  }, [isEdit, watch]);

  useEffect(() => {
    const scrollTo = searchParams.get('scrollTo');
    if (scrollTo) {
      setTimeout(() => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    if (value === 'yaml') {
      router.replace(
        `/devbox/create?${obj2Query({
          type: 'yaml'
        })}`
      );
    }
  };

  return (
    <div className="flex justify-center gap-6">
      {/* left grid */}
      <div className="flex min-w-65 flex-col gap-4 text-sm">
        <Tabs defaultValue="form" onValueChange={handleTabChange}>
          <TabsList className="h-11 w-full">
            <TabsTrigger value="form">{t('config_form')}</TabsTrigger>
            <TabsTrigger value="yaml">{t('yaml_file')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <PriceBox
          components={[
            {
              cpu: watch('cpu'),
              memory: watch('memory'),
              storage: watch('storage'),
              gpu: formValues.gpu
            }
          ]}
        />
        <QuotaBox />
      </div>

      {/* right grid */}
      <div id="form-container" className="relative flex flex-col gap-4">
        <Runtime isEdit={isEdit} />
        {/* Devbox Name */}
        <DevboxName isEdit={isEdit} />
        {/* Usage */}
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8">
          <span className="text-lg/7 font-medium">{t('usage')}</span>
          <Gpu countGpuInventory={countGpuInventory} />
          <Cpu />
          <Memory />
          {showNfs && <NetworkStorage isEdit={isEdit} originalVolumes={originalVolumesRef.current} />}
        </div>
        {/* Network */}
        <div id="network">
          <Network isEdit={isEdit} />
        </div>

        {/* Advanced Configurations */}
        {showAdvancedConfig && (
          <AdvancedConfig
            showEnvAndConfigmap={showEnvAndConfigmap}
            showSharedMemory={showSharedMemory}
          />
        )}
      </div>
    </div>
  );
};

export default Form;
