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
import { normalizeStorageDefaultGi } from '@/utils/storage';
import { useConfirm } from '@/hooks/useConfirm';
import { generateYamlList } from '@/utils/json2Yaml';
import { createDevbox, updateDevbox } from '@/api/devbox';
import type { DevboxEditTypeV2, DevboxKindsType } from '@/types/devbox';
import type { GpuInventoryModel, GpuInventorySpec, GpuPodConfig } from '@/types/gpu';
import type { SourcePrice } from '@/types/static';
import { defaultDevboxEditValueV2, editModeMap, gpuTypeAnnotationKey } from '@/constants/devbox';

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

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, '').toLowerCase() || '';
type GpuPriceItem = NonNullable<SourcePrice['gpu']>[number];

const isSameRecord = (lhs?: Record<string, string>, rhs?: Record<string, string>) => {
  const left = lhs || {};
  const right = rhs || {};
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(
    ([key, value], index) => rightEntries[index]?.[0] === key && rightEntries[index]?.[1] === value
  );
};

const isSamePodConfig = (left?: GpuPodConfig, right?: GpuPodConfig) =>
  isSameRecord(left?.annotations, right?.annotations) &&
  isSameRecord(left?.resources?.limits, right?.resources?.limits);

const buildGpuInventoryFromPrice = (gpuPriceList?: SourcePrice['gpu']): GpuInventoryModel[] => {
  if (!gpuPriceList || gpuPriceList.length === 0) return [];

  const modelMap = new Map<string, GpuInventoryModel>();

  gpuPriceList.forEach((item: GpuPriceItem) => {
    const model = item.model || item.annotationType;
    if (!model) return;

    const specType = item.specType || 'GPU';
    const specValue = item.specValue || (specType === 'GPU' ? 'full' : '');
    const specMemory = item.specMemory || `${Math.max(item.vm || 0, 0)}GB`;
    if (!specValue || !specMemory) return;

    const stock = Math.max(
      Number(item.stock ?? item.available ?? item.count ?? 0),
      0
    );
    const podConfig =
      item.podConfig ||
      (item.annotationType
        ? {
            annotations: {
              [gpuTypeAnnotationKey]: item.annotationType
            }
          }
        : undefined);

    const nextSpec: GpuInventorySpec = {
      type: specType,
      value: specValue,
      memory: specMemory,
      stock,
      ...(podConfig ? { podConfig } : {})
    };

    const existingModel = modelMap.get(model);
    if (!existingModel) {
      modelMap.set(model, {
        model,
        displayName: item.displayName || item.name,
        icon: item.icon,
        specs: [nextSpec]
      });
      return;
    }

    const existingSpecIndex = existingModel.specs.findIndex(
      (spec) => spec.type === nextSpec.type && spec.value === nextSpec.value
    );
    if (existingSpecIndex < 0) {
      existingModel.specs.push(nextSpec);
      return;
    }

    const existingSpec = existingModel.specs[existingSpecIndex];
    existingModel.specs[existingSpecIndex] = {
      ...existingSpec,
      ...nextSpec,
      stock: Math.max(existingSpec.stock || 0, nextSpec.stock || 0),
      podConfig: existingSpec.podConfig || nextSpec.podConfig
    };
  });

  return Array.from(modelMap.values()).filter((item) => item.specs.length > 0);
};

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

  const [isLoading, setIsLoading] = useState(false);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);

  const tabType = searchParams.get('type') || 'form';
  const devboxName = searchParams.get('name') || '';

  // NOTE: need to explain why this is needed
  // fix a bug: searchParams will disappear when go into this page
  const [captureFrom, setCaptureFrom] = useState('');
  const [captureScrollTo, setCaptureScrollTo] = useState('');
  const [captureDevboxName, setCaptureDevboxName] = useState('');
  const normalizedStorageDefault = normalizeStorageDefaultGi(
    env.storageDefault,
    defaultDevboxEditValueV2.storage
  );
  const formHook = useForm<DevboxEditTypeV2>({
    defaultValues: {
      ...defaultDevboxEditValueV2,
      storage: normalizedStorageDefault
    }
  });

  useEffect(() => {
    const name = searchParams.get('name');
    const from = searchParams.get('from');
    const scrollTo = searchParams.get('scrollTo');
    if (name && name !== captureDevboxName) {
      setCaptureDevboxName(name);
    }
    if (from && from !== captureFrom) {
      setCaptureFrom(from);
    }
    if (scrollTo && scrollTo !== captureScrollTo) {
      setCaptureScrollTo(scrollTo);
    }

    if (from === 'template' && !name) {
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
  }, [searchParams, captureDevboxName, captureScrollTo, captureFrom, formHook]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isEdit = useMemo(() => !!devboxName, []);

  useEffect(() => {
    if (isEdit) return;

    const currentStorage = formHook.getValues('storage');

    if (currentStorage !== normalizedStorageDefault) {
      formHook.setValue('storage', normalizedStorageDefault, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false
      });
    }
  }, [formHook, isEdit, normalizedStorageDefault]);

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
  const gpuInventoryData = useMemo(
    () => buildGpuInventoryFromPrice(sourcePrice?.gpu),
    [sourcePrice?.gpu]
  );

  const findSelectedGpuSpec = useCallback(
    (gpu?: DevboxEditTypeV2['gpu']) => {
      if (!gpu) return undefined as
        | {
            model: GpuInventoryModel;
            spec: GpuInventorySpec;
          }
        | undefined;

      const selectedModel =
        (gpu.model && gpuInventoryData.find((item) => item.model === gpu.model)) ||
        gpuInventoryData.find((item) =>
          item.specs.some(
            (spec) =>
              normalizeText(spec.podConfig?.annotations?.[gpuTypeAnnotationKey]) ===
              normalizeText(gpu.type)
          )
        );
      if (!selectedModel) return undefined;

      const selectedSpec =
        selectedModel.specs.find(
          (spec) => spec.type === gpu.specType && spec.value === gpu.specValue
        ) ||
        (gpu.podConfig
          ? selectedModel.specs.find((spec) => isSamePodConfig(spec.podConfig, gpu.podConfig))
          : undefined);
      if (!selectedSpec) return undefined;

      return { model: selectedModel, spec: selectedSpec };
    },
    [gpuInventoryData]
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
        if (!res) {
          return;
        }
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
      if ((formData.gpu?.model || formData.gpu?.type) && gpuInventoryData.length > 0) {
        const selectedGpu = findSelectedGpuSpec(formData.gpu);
        const selectedSpec = selectedGpu?.spec;
        const selectedStock = selectedSpec?.stock ?? formData.gpu?.stock ?? 0;
        const selectedSpecType = selectedSpec?.type ?? formData.gpu?.specType;
        const selectedPodConfig = selectedSpec?.podConfig ?? formData.gpu?.podConfig;
        const selectedLimits = selectedPodConfig?.resources?.limits;

        if (!selectedPodConfig || !selectedLimits || Object.keys(selectedLimits).length === 0) {
          return toast.warning(t('gpu_spec_invalid'));
        }

        if (selectedStock <= 0) {
          return toast.warning(
            t('Gpu under inventory Tip', {
              gputype: formData.gpu?.model || formData.gpu?.type || 'GPU'
            })
          );
        }

        const amount = selectedSpecType === 'GPU' ? Math.max(formData.gpu?.amount || 1, 1) : 1;
        if (selectedSpecType === 'GPU' && amount > selectedStock) {
          return toast.warning(
            t('Gpu under inventory Tip', {
              gputype: formData.gpu?.model || formData.gpu?.type || 'GPU'
            })
          );
        }

        formData.gpu = {
          ...formData.gpu,
          model: selectedGpu?.model.model || formData.gpu?.model,
          type:
            selectedPodConfig.annotations?.[gpuTypeAnnotationKey] ||
            formData.gpu?.type ||
            formData.gpu?.model ||
            '',
          amount,
          specType: selectedSpecType,
          specValue: selectedSpec?.value || formData.gpu?.specValue,
          specMemory: selectedSpec?.memory || formData.gpu?.specMemory,
          stock: selectedStock,
          podConfig: selectedPodConfig
        };
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
              <Form isEdit={isEdit} gpuInventory={gpuInventoryData} />
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
