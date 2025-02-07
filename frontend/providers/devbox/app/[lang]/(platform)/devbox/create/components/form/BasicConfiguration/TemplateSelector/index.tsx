// RuntimeVersionSelector.tsx
import { listTemplate } from '@/api/template';
import { useEnvStore } from '@/stores/env';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { nanoid } from '@/utils/tools';
import { Flex, Input } from '@chakra-ui/react';
import { MySelect, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import Label from '../../Label';

interface TemplateSelectorProps {
  isEdit: boolean;
}

export default function TemplateSelector({ isEdit }: TemplateSelectorProps) {
  const { getValues, setValue, watch, control } = useFormContext<DevboxEditTypeV2>();
  const { env } = useEnvStore();
  const { message: toast } = useMessage();
  const templateRepositoryUid = watch('templateRepositoryUid');
  const isVaildTemplateRepositoryUid = z.string().uuid().safeParse(templateRepositoryUid).success;
  const templateListQuery = useQuery(
    ['templateList', templateRepositoryUid],
    () => listTemplate(templateRepositoryUid),
    {
      enabled: isVaildTemplateRepositoryUid
    }
  );
  const templateList = templateListQuery.data?.templateList || [];
  const t = useTranslations();
  // const defaultTemplateUid = watch('templateUid')
  const menuList = templateList.map((v) => ({ label: v.name, value: v.uid }));
  // const defaultTemplate = defaultTemplateUid ? templateList.find(t => t.uid === defaultTemplateUid) : templateList[0]

  const { field } = useController({
    control,
    name: 'templateUid',
    rules: {
      required: t('This runtime field is required')
    }
  });
  const afterUpdateTemplate = (uid: string) => {
    const template = templateList.find((v) => v.uid === uid)!;
    setValue('templateConfig', template.config as string);
    setValue('image', template.image);
  };
  const resetNetwork = () => {
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
          } as const)
      )
    );
  };
  useEffect(() => {
    if (!templateListQuery.isSuccess || !templateList.length || !templateListQuery.isFetched)
      return;

    const curTemplate = templateList.find((t) => t.uid === field.value);
    const isExist = !!curTemplate;
    if (!isExist) {
      const defaultTemplate = templateList[0];
      setValue('templateUid', defaultTemplate.uid);
      afterUpdateTemplate(defaultTemplate.uid);
      resetNetwork();
    } else {
      setValue('templateUid', curTemplate.uid);
      afterUpdateTemplate(curTemplate.uid);
    }
  }, [templateListQuery.isSuccess, templateList, templateListQuery.isFetched, isEdit]);
  return (
    <Flex alignItems={'center'} mb={7}>
      <Label w={100}>{t('version')}</Label>
      {isEdit ? (
        <Input
          opacity={0.5}
          width={'200px'}
          defaultValue={templateList.find((t) => t.uid === field.value)?.name}
          disabled
        />
      ) : (
        <MySelect
          width={'200px'}
          placeholder={`${t('runtime')} ${t('version')}`}
          isDisabled={!templateListQuery.isSuccess}
          // ref={field.ref}
          value={field.value}
          list={menuList}
          name={field.name}
          onchange={(val) => {
            // if (isEdit) return
            const devboxName = getValues('name');
            if (!devboxName) {
              toast({
                title: t('Please enter the devbox name first'),
                status: 'warning'
              });
              return;
            }
            const oldTemplateUid = getValues('templateUid');
            field.onChange(val);
            afterUpdateTemplate(val);
            if (oldTemplateUid !== val) resetNetwork();
          }}
        />
      )}
    </Flex>
  );
}
