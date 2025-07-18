import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { nanoid } from '@/utils/tools';
import { useEnvStore } from '@/stores/env';
import { listTemplate } from '@/api/template';
import { useDevboxStore } from '@/stores/devbox';
import { DevboxEditTypeV2 } from '@/types/devbox';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FormItem, FormLabel } from '@/components/ui/form';

interface RuntimeProps {
  isEdit?: boolean;
}

export default function Runtime({ isEdit = false }: RuntimeProps) {
  const router = useRouter();
  const t = useTranslations();
  const { env } = useEnvStore();
  const { startedTemplate, devboxDetail } = useDevboxStore();
  const { getValues, setValue, watch } = useFormContext<DevboxEditTypeV2>();
  const searchParams = useSearchParams();

  const templateRepositoryUid = watch('templateRepositoryUid');
  const templateUid = watch('templateUid');
  const isValidTemplateRepositoryUid = z.string().uuid().safeParse(templateRepositoryUid).success;

  const templateListQuery = useQuery(
    ['templateList', templateRepositoryUid],
    () => listTemplate(templateRepositoryUid),
    {
      enabled: isValidTemplateRepositoryUid
    }
  );
  const templateList = useMemo(
    () => templateListQuery.data?.templateList || [],
    [templateListQuery.data?.templateList]
  );
  const menuList = useMemo(
    () => templateList.map((v) => ({ label: v.name, value: v.uid })),
    [templateList]
  );

  const afterUpdateTemplate = useCallback(
    (uid: string) => {
      const template = templateList.find((v) => v.uid === uid)!;
      setValue('templateConfig', template.config as string);
      setValue('image', template.image);
    },
    [templateList, setValue]
  );

  const resetNetwork = useCallback(() => {
    const devboxName = getValues('name');
    const config = getValues('templateConfig');
    const parsedConfig = JSON.parse(config as string) as {
      appPorts: [{ port: number; name: string; protocol: string }];
    };
    setValue(
      'networks',
      parsedConfig.appPorts.map(
        ({ port }) =>
          ({
            networkName: `${devboxName}-${nanoid()}`,
            portName: nanoid(),
            port: port,
            protocol: 'HTTP',
            openPublicDomain: true,
            publicDomain: `${nanoid()}.${env.ingressDomain}`,
            customDomain: ''
          }) as const
      )
    );
  }, [getValues, setValue, env]);

  const handleVersionChange = (val: string) => {
    if (isEdit) return;

    const devboxName = getValues('name');
    if (!devboxName) {
      toast.warning(t('Please enter the devbox name first'));
      return;
    }
    const oldTemplateUid = getValues('templateUid');
    setValue('templateUid', val);
    afterUpdateTemplate(val);
    if (oldTemplateUid !== val) resetNetwork();
  };

  const handleChangeTemplate = () => {
    if (isEdit) return;
    const name = searchParams.get('name');
    if (name) return;
    router.push('/template');
  };

  useEffect(() => {
    // if (!startedTemplate && !isEdit) {
    //   router.push('/template');
    //   return;
    // }

    if (startedTemplate) {
      setValue('templateRepositoryUid', startedTemplate.uid);
    }
  }, [startedTemplate, router, setValue, isEdit]);

  useEffect(() => {
    if (!templateListQuery.isSuccess || !templateList.length || !templateListQuery.isFetched)
      return;

    const curTemplate = templateList.find((t) => t.uid === templateUid);
    const isExist = !!curTemplate;
    if (!isExist) {
      const defaultTemplate = templateList[0];
      setValue('templateUid', defaultTemplate.uid);
      afterUpdateTemplate(defaultTemplate.uid);
      resetNetwork();
    }
  }, [
    templateListQuery.isSuccess,
    templateList,
    templateListQuery.isFetched,
    templateUid,
    afterUpdateTemplate,
    resetNetwork,
    setValue
  ]);

  if (!startedTemplate && !isEdit) return null;
  if (isEdit && !devboxDetail) return null;

  const displayTemplate = {
    iconId: isEdit ? devboxDetail?.iconId || 'custom' : startedTemplate?.iconId || 'custom',
    name: isEdit ? devboxDetail?.templateRepositoryName || '' : startedTemplate?.name || '',
    description: isEdit
      ? devboxDetail?.templateRepositoryDescription || ''
      : startedTemplate?.description || ''
  };

  return (
    <FormItem className="min-w-[700px]">
      <FormLabel>{t('runtime_environment')}</FormLabel>
      <div
        className={cn('flex items-center rounded-xl border bg-card p-3', isEdit && 'opacity-60')}
      >
        <div className="flex w-[500px] items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
              <Image
                src={`/images/runtime/${displayTemplate.iconId}.svg`}
                alt={displayTemplate.name}
                width={40}
                height={40}
              />
            </div>
            <div className="font-medium">{displayTemplate.name}</div>
          </div>
          <div className="text-sm/5 text-zinc-500">
            {displayTemplate.description || t('no_description')}
          </div>
        </div>
        <div className="flex h-10 items-center gap-2">
          <Select
            disabled={!templateListQuery.isSuccess || isEdit}
            value={templateUid}
            onValueChange={handleVersionChange}
          >
            <SelectTrigger className="h-10 border-none px-3 text-zinc-600 select-none hover:bg-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectLabel className="px-1">{t('version')}</SelectLabel>
                {menuList.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="h-4 w-0.25 bg-zinc-200" />
          <Button
            variant="ghost"
            size="lg"
            onClick={handleChangeTemplate}
            disabled={isEdit}
            className="text-zinc-600 hover:text-zinc-600"
          >
            <PencilLine />
            {t('change')}
          </Button>
        </div>
      </div>
    </FormItem>
  );
}
