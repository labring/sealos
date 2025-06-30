'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import { useDevboxStore } from '@/stores/devbox';
import type { DevboxEditTypeV2 } from '@/types/devbox';

import Gpu from './Gpu';
import Cpu from './Cpu';
import Memory from './Memory';
import Network from './Network';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import DevboxName from './DevboxName';

import { Form as FormUI } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Form = ({
  isEdit,
  countGpuInventory,
  defaultValues
}: {
  isEdit: boolean;
  countGpuInventory: (type: string) => number;
  defaultValues?: Partial<DevboxEditTypeV2>;
}) => {
  const router = useRouter();
  const t = useTranslations();

  const form = useForm<DevboxEditTypeV2>({
    defaultValues
  });
  const formValues = form.watch();

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
    <FormUI {...form}>
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
                cpu: formValues.cpu,
                memory: formValues.memory,
                nodeports: devboxList.length
              }
            ]}
          />
          <QuotaBox />
        </div>

        {/* right grid */}
        <div id="form-container" className="relative flex h-full flex-col gap-4">
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
          <Network isEdit={isEdit} />
        </div>
      </div>
    </FormUI>
  );
};

export default Form;
