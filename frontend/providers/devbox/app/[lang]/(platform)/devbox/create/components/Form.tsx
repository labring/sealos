'use client';

import { throttle } from 'lodash';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useEffect, useState, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import { useDevboxStore } from '@/stores/devbox';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import { Separator } from '@/components/ui/separator';
import BasicConfiguration from './form/BasicConfiguration';
import NetworkConfiguration from './form/NetworkConfiguration';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Form = ({
  isEdit,
  countGpuInventory
}: {
  isEdit: boolean;
  countGpuInventory: (type: string) => number;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { watch } = useFormContext<DevboxEditTypeV2>();

  const { devboxList } = useDevboxStore();

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
    <div className="grid grid-cols-[220px_1fr] gap-6">
      {/* left grid */}
      <div className="flex min-w-65 flex-col gap-4">
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
              nodeports: devboxList.length
            }
          ]}
        />
        <QuotaBox />
      </div>

      {/* right grid */}
      {/* <div
        id="form-container"
        className="relative h-full overflow-y-scroll px-5 pb-[100px] md:px-10 lg:px-20"
      >
        <BasicConfiguration
          isEdit={isEdit}
          id="baseInfo"
          className="mb-4 rounded-lg border bg-white"
          countGpuInventory={countGpuInventory}
        />
        <NetworkConfiguration
          isEdit={isEdit}
          id="network"
          className="mb-4 rounded-lg border bg-white"
        />
      </div> */}
    </div>
  );
};

export default Form;
