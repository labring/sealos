'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import { useDevboxStore } from '@/stores/devbox';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import Gpu from './Gpu';
import Cpu from './Cpu';
import Memory from './Memory';
import Network from './Network';
import Runtime from './Runtime';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import DevboxName from './DevboxName';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FormProps {
  isEdit: boolean;
  countGpuInventory: (type: string) => number;
}

const Form = ({ isEdit, countGpuInventory }: FormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { watch } = useFormContext<DevboxEditTypeV2>();

  const { devboxList } = useDevboxStore();

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

  return (
    <div className="flex justify-center gap-6">
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
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8">
          <span className="text-xl/7 font-medium">{t('usage')}</span>
          <Gpu countGpuInventory={countGpuInventory} />
          <Cpu />
          <Memory />
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
