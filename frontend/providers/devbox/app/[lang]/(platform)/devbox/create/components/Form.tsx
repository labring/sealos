'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import Gpu from './Gpu';
import Cpu from './Cpu';
import Memory from './Memory';
import Network from './Network';
import Runtime from './Runtime';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import DevboxName from './DevboxName';

import { Tabs, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { useUserStore } from '@/stores/user';
import { resourcePropertyMap } from '@/constants/resource';
import { sealosApp } from 'sealos-desktop-sdk/app';

interface FormProps {
  isEdit: boolean;
  oldDevboxData: DevboxEditTypeV2 | null;
  countGpuInventory: (type: string) => number;
}

const Form = ({ isEdit, countGpuInventory, oldDevboxData }: FormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userStore = useUserStore();
  const t = useTranslations();
  const { watch } = useFormContext<DevboxEditTypeV2>();

  const formValues = watch();
  const exceededQuotas = useMemo(() => {
    return userStore.checkExceededQuotas({
      cpu: isEdit ? formValues.cpu - (oldDevboxData?.cpu ?? 0) : formValues.cpu,
      memory: isEdit ? formValues.memory - (oldDevboxData?.memory ?? 0) : formValues.memory,
      // [TODO] These two does not need to be considered currently
      gpu: 0,
      nodeport: 0
    });
  }, [formValues, userStore, isEdit, oldDevboxData]);

  useEffect(() => {
    if (searchParams.get('scrollTo') === 'network') {
      const el = document.getElementById('network');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

  const handleOpenCostcenter = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'upgrade'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'upgrade'
      }
    });
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
              memory: watch('memory')
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
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8">
          <span className="text-lg/7 font-medium">{t('usage')}</span>

          <div className="mt-6">
            <Gpu countGpuInventory={countGpuInventory} />
          </div>

          <div className="mt-10">
            <Cpu />
            {exceededQuotas.some(({ type }) => type === 'cpu') && (
              <>
                <div className="text-sm text-red-600">
                  {t('cpu_exceeds_quota', {
                    requested: watch('cpu') / resourcePropertyMap.cpu.scale,
                    limit:
                      (exceededQuotas.find(({ type }) => type === 'cpu')?.limit ?? 0) /
                      resourcePropertyMap.cpu.scale,
                    used:
                      (exceededQuotas.find(({ type }) => type === 'cpu')?.used ?? 0) /
                      resourcePropertyMap.cpu.scale
                  })}
                </div>
                <div className="text-sm text-red-600">
                  {t('please_upgrade_plan.0')}
                  <a
                    className="cursor-pointer font-semibold text-blue-600 underline"
                    onClick={handleOpenCostcenter}
                  >
                    {t('please_upgrade_plan.1')}
                  </a>
                  {t('please_upgrade_plan.2')}
                </div>
              </>
            )}
          </div>

          <div className="mt-10">
            <Memory />
            {exceededQuotas.some(({ type }) => type === 'memory') && (
              <>
                <div className="text-sm text-red-600">
                  {t('memory_exceeds_quota', {
                    requested: watch('memory') / resourcePropertyMap.memory.scale,
                    limit:
                      (exceededQuotas.find(({ type }) => type === 'memory')?.limit ?? 0) /
                      resourcePropertyMap.memory.scale,
                    used:
                      (exceededQuotas.find(({ type }) => type === 'memory')?.used ?? 0) /
                      resourcePropertyMap.memory.scale
                  })}
                </div>

                <div className="text-sm text-red-600">
                  {t('please_upgrade_plan.0')}
                  <a
                    className="cursor-pointer font-semibold text-blue-600 underline"
                    onClick={handleOpenCostcenter}
                  >
                    {t('please_upgrade_plan.1')}
                  </a>
                  {t('please_upgrade_plan.2')}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Network */}
        <div id="network">
          <Network isEdit={isEdit} />
        </div>
      </div>
    </div>
  );
};

export default Form;
