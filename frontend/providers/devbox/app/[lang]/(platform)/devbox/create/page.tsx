'use client';

import { toast } from 'sonner';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

import { FormProvider, useForm } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from '@/i18n';
import type { YamlItemType } from '@/types';
import { patchYamlList } from '@/utils/tools';
import { useConfirm } from '@/hooks/useConfirm';
import { generateYamlList } from '@/utils/json2Yaml';
import { createDevbox, updateDevbox } from '@/api/devbox';
import type { DevboxEditTypeV2, DevboxKindsType } from '@/types/devbox';
import { defaultDevboxEditValueV2, editModeMap } from '@/constants/devbox';

import { useEnvStore } from '@/stores/env';
import { useIDEStore } from '@/stores/ide';
import { usePriceStore } from '@/stores/price';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { useErrorMessage } from '@/hooks/useErrorMessage';

import Form from './components/Form';
import Yaml from './components/Yaml';
import Header from './components/Header';
import { Loading } from '@sealos/shadcn-ui/loading';
import { track } from '@sealos/gtm';
import { listTemplate } from '@/api/template';
import { z } from 'zod';

const DevboxCreatePage = () => {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const { getErrorMessage } = useErrorMessage();

  const { env } = useEnvStore();
  const { addDevboxIDE } = useIDEStore();
  const { setDevboxDetail, setStartedTemplate, startedTemplate } = useDevboxStore();
  const { sourcePrice, setSourcePrice } = usePriceStore();

  const crOldYamls = useRef<DevboxKindsType[]>([]);
  const formOldYamls = useRef<YamlItemType[]>([]);
  const oldDevboxEditData = useRef<DevboxEditTypeV2>();

  const [isLoading, setIsLoading] = useState(false);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);

  const tabType = searchParams.get('type') || 'form';
  const devboxName = searchParams.get('name') || '';

  // NOTE: need to explain why this is needed
  // fix a bug: searchParams will disappear when go into this page
  const [captureFrom, setCaptureFrom] = useState('');
  const [captureScrollTo, setCaptureScrollTo] = useState('');
  const [captureDevboxName, setCaptureDevboxName] = useState('');
  const formHook = useForm<DevboxEditTypeV2>({
    defaultValues: defaultDevboxEditValueV2
  });

  useEffect(() => {
    const name = searchParams.get('name');
    const from = searchParams.get('from');
    const scrollTo = searchParams.get('scrollTo');
    if (name) {
      setCaptureDevboxName(name);
      router.replace(`/devbox/create?name=${captureDevboxName}`, undefined);
      if (from) {
        setCaptureFrom(from);
        router.replace(`/devbox/create?name=${captureDevboxName}&from=${captureFrom}`, undefined);
        if (scrollTo) {
          setCaptureScrollTo(scrollTo);
          router.replace(
            `/devbox/create?name=${captureDevboxName}&scrollTo=${captureScrollTo}`,
            undefined
          );
        }
      }
    } else if (from === 'template') {
      const savedFormData = localStorage.getItem('devbox_create_form_data');
      if (savedFormData) {
        try {
          const formData = JSON.parse(savedFormData);
          formHook.reset(formData);
          localStorage.removeItem('devbox_create_form_data');
        } catch (error) {
          console.error('Failed to parse saved form data:', error);
        }
      }
    }
  }, [searchParams, router, captureDevboxName, captureScrollTo, captureFrom, formHook]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isEdit = useMemo(() => !!devboxName, []);

  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(isEdit);

  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
  });

  const templateRepositoryUid = formHook.watch('templateRepositoryUid');
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

  const generateDefaultYamlList = () => generateYamlList(defaultDevboxEditValueV2, env);

  // update yamlList every time yamlList change
  const debouncedUpdateYaml = useMemo(
    () =>
      debounce((data: DevboxEditTypeV2, env) => {
        try {
          const newYamlList = generateYamlList(data, env);
          setYamlList(newYamlList);
        } catch (error) {
          console.error('Failed to generate yaml:', error);
        }
      }, 300),
    []
  );

  const countGpuInventory = useCallback(
    (type?: string) => {
      const inventory = sourcePrice?.gpu?.find((item) => item.type === type)?.inventory || 0;

      return inventory;
    },
    [sourcePrice?.gpu]
  );

  useEffect(() => {
    const subscription = formHook.watch((value) => {
      if (value) {
        debouncedUpdateYaml(value as DevboxEditTypeV2, env);
      }
    });
    return () => {
      subscription.unsubscribe();
      debouncedUpdateYaml.cancel();
    };
  }, [debouncedUpdateYaml, env, formHook]);

  const { refetch: refetchPrice } = useQuery(['init-price'], setSourcePrice, {
    enabled: !!sourcePrice?.gpu,
    refetchInterval: 6000
  });

  useQuery(
    ['initDevboxCreateData'],
    () => {
      if (!devboxName) {
        setYamlList(generateDefaultYamlList());
        return null;
      }
      setIsLoading(true);
      return setDevboxDetail(devboxName, env.sealosDomain);
    },
    {
      onSuccess(res) {
        console.log('res', res);
        if (!res) {
          return;
        }
        oldDevboxEditData.current = res;
        formOldYamls.current = generateYamlList(res, env);
        crOldYamls.current = generateYamlList(res, env) as DevboxKindsType[];
        formHook.reset(res);
      },
      onError(err) {
        toast.error(String(err));
      },
      onSettled() {
        setIsLoading(false);
      }
    }
  );
  const { guideConfigDevbox } = useGuideStore();

  const submitSuccess = async (formData: DevboxEditTypeV2) => {
    if (!guideConfigDevbox) {
      return router.push('/devbox/detail/devbox-mock');
    }
    setIsLoading(true);
    try {
      // gpu inventory check
      if (formData.gpu?.type) {
        const inventory = countGpuInventory(formData.gpu?.type);
        if (formData.gpu?.amount > inventory) {
          return toast.warning(
            t('Gpu under inventory Tip', {
              gputype: formData.gpu.type
            })
          );
        }
      }

      // update
      if (isEdit) {
        const yamlList = generateYamlList(formData, env);
        setYamlList(yamlList);
        const parsedNewYamlList = yamlList.map((item) => item.value);
        const parsedOldYamlList = formOldYamls.current.map((item) => item.value);
        const areYamlListsEqual =
          new Set(parsedNewYamlList).size === new Set(parsedOldYamlList).size &&
          [...new Set(parsedNewYamlList)].every((item) => new Set(parsedOldYamlList).has(item));
        if (areYamlListsEqual) {
          setIsLoading(false);
          return toast.info(t('No changes detected'));
        }
        if (!parsedNewYamlList) {
          // prevent empty yamlList
          return toast.warning(t('submit_form_error'));
        }
        const patch = patchYamlList({
          parsedOldYamlList: parsedOldYamlList,
          parsedNewYamlList: parsedNewYamlList,
          originalYamlList: crOldYamls.current
        });
        await updateDevbox({
          patch,
          devboxName: formData.name
        });
        track({
          event: 'deployment_update',
          module: 'devbox',
          context: 'app'
        });
      } else {
        await createDevbox(formData);
        track({
          event: 'deployment_create',
          module: 'devbox',
          context: 'app',
          config: {
            template_name: startedTemplate?.name || '',
            template_version: templateList.find((t) => t.uid === formData.templateUid)?.name || ''
          },
          resources: {
            cpu_cores: formData.cpu,
            ram_mb: formData.memory
          }
        });
      }
      addDevboxIDE('vscode', formData.name);

      toast.success(t(applySuccess));

      if (sourcePrice?.gpu) {
        refetchPrice();
      }
      setStartedTemplate(undefined);
      router.push(`/devbox/detail/${formData.name}`);
    } catch (error: any) {
      if (typeof error === 'string' && error.includes('402')) {
        toast.warning(t(applyError), {
          description: t('outstanding_tips')
        });
      } else {
        const errorMsg = getErrorMessage(error, isEdit ? 'update_failed' : 'create_failed');
        toast.warning(t(applyError), { description: errorMsg });
      }
    }
    setIsLoading(false);
  };

  const submitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj || typeof obj !== 'object') {
        return t('submit_form_error');
      }
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };
    toast.error(deepSearch(formHook.formState.errors));
  }, [formHook.formState.errors, t]);

  if (isLoading) return <Loading />;

  return (
    <>
      <FormProvider {...formHook}>
        <div className="flex h-[calc(100vh-28px)] min-w-[1024px] flex-col items-center">
          <Header
            yamlList={yamlList}
            title={title}
            applyBtnText={applyBtnText}
            applyCb={() =>
              formHook.handleSubmit(
                (data) => openConfirm(() => submitSuccess(data))(),
                submitError
              )()
            }
          />
          <div className="w-full px-5 pt-10 pb-30 md:px-10 lg:px-20">
            {tabType === 'form' ? (
              <Form isEdit={isEdit} countGpuInventory={countGpuInventory} />
            ) : (
              <Yaml yamlList={yamlList} />
            )}
          </div>
        </div>
      </FormProvider>
      <ConfirmChild />
    </>
  );
};

export default DevboxCreatePage;
