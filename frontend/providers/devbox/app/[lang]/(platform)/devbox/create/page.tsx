'use client';
'use client';

import { useRouter } from '@/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import Form from './components/form';
import Header from './components/Header';
import Yaml from './components/Yaml';

import type { YamlItemType } from '@/types';
import type { DevboxEditType, DevboxEditTypeV2, DevboxKindsType } from '@/types/devbox';

import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';

import { useDevboxStore } from '@/stores/devbox';
import { useEnvStore } from '@/stores/env';
import { useGlobalStore } from '@/stores/global';
import { useIDEStore } from '@/stores/ide';
import { useUserStore } from '@/stores/user';
import { usePriceStore } from '@/stores/price';

import { createDevbox, updateDevbox } from '@/api/devbox';
import { defaultDevboxEditValueV2, editModeMap } from '@/constants/devbox';
import { useTemplateStore } from '@/stores/template';
import { generateYamlList } from '@/utils/json2Yaml';
import { patchYamlList } from '@/utils/tools';
import { debounce } from 'lodash';

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'));
const DevboxCreatePage = () => {
  const { env } = useEnvStore();
  const generateDefaultYamlList = () => generateYamlList(defaultDevboxEditValueV2, env);
  const router = useRouter();
  const t = useTranslations();
  const { Loading, setIsLoading } = useLoading();

  const searchParams = useSearchParams();
  const { message: toast } = useMessage();
  const { addDevboxIDE } = useIDEStore();
  const { sourcePrice, setSourcePrice } = usePriceStore();
  const { checkQuotaAllow } = useUserStore();
  const { setDevboxDetail, devboxList } = useDevboxStore();

  const crOldYamls = useRef<DevboxKindsType[]>([]);
  const formOldYamls = useRef<YamlItemType[]>([]);
  const oldDevboxEditData = useRef<DevboxEditTypeV2>();

  const [errorMessage, setErrorMessage] = useState('');
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);

  const tabType = searchParams.get('type') || 'form';
  const devboxName = searchParams.get('name') || '';

  // NOTE: need to explain why this is needed
  // fix a bug: searchParams will disappear when go into this page
  const [captureDevboxName, setCaptureDevboxName] = useState('');
  const { updateTemplateModalConfig, config: templateConfig } = useTemplateStore();
  useEffect(() => {
    const name = searchParams.get('name');
    if (name) {
      setCaptureDevboxName(name);
      router.replace(`/devbox/create?name=${captureDevboxName}`, undefined);
      setCaptureDevboxName(name);
      router.replace(`/devbox/create?name=${captureDevboxName}`, undefined);
    }
  }, [searchParams, router, captureDevboxName]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isEdit = useMemo(() => !!devboxName, []);

  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(isEdit);

  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
  });

  // compute container width
  const { screenWidth, lastRoute } = useGlobalStore();

  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2);
    if (val < 20) {
      return 20;
    }
    return val;
  }, [screenWidth]);

  const formHook = useForm<DevboxEditTypeV2>({
    defaultValues: defaultDevboxEditValueV2
  });

  // updateyamlList every time yamlList change
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

  // 监听表单变化
  useEffect(() => {
    const subscription = formHook.watch((value) => {
      if (value) {
        debouncedUpdateYaml(value as DevboxEditTypeV2, env);
        debouncedUpdateYaml(value as DevboxEditTypeV2, env);
      }
    });
    return () => {
      subscription.unsubscribe();
      debouncedUpdateYaml.cancel();
    };
  }, [formHook, debouncedUpdateYaml, env]);

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
        oldDevboxEditData.current = res;
        formOldYamls.current = generateYamlList(res, env);
        crOldYamls.current = generateYamlList(res, env) as DevboxKindsType[];
        formHook.reset(res);
      },
      onError(err) {
        toast({
          title: String(err),
          status: 'error'
        });
      },
      onSettled() {
        setIsLoading(false);
      }
    }
  );
  const submitSuccess = async (formData: DevboxEditTypeV2) => {
    setIsLoading(true);
    try {
      // gpu inventory check
      if (formData.gpu?.type) {
        const inventory = countGpuInventory(formData.gpu?.type);
        if (formData.gpu?.amount > inventory) {
          return toast({
            status: 'warning',
            title: t('Gpu under inventory Tip', {
              gputype: formData.gpu.type
            })
          });
        }
      }
      // quote check
      const quoteCheckRes = checkQuotaAllow(
        { ...formData, nodeports: devboxList.length + 1 } as DevboxEditTypeV2 & {
          nodeports: number;
        },
        {
          ...oldDevboxEditData.current,
          nodeports: devboxList.length
        } as DevboxEditType & {
          nodeports: number;
        }
      );
      if (quoteCheckRes) {
        setIsLoading(false);
        return toast({
          status: 'warning',
          title: t(quoteCheckRes),
          duration: 5000,
          isClosable: true
        });
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
          return toast({
            status: 'info',
            title: t('No changes detected'),
            duration: 5000,
            isClosable: true
          });
        }
        if (!parsedNewYamlList) {
          // prevent empty yamlList
          return setErrorMessage(t('submit_form_error'));
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
      } else {
        await createDevbox({ devboxForm: formData });
      }
      addDevboxIDE('vscode', formData.name);
      toast({
        title: t(applySuccess),
        status: 'success'
      });
      updateTemplateModalConfig({
        ...templateConfig,
        lastRoute
      });
      if (sourcePrice?.gpu) {
        refetchPrice();
      }
      router.push(lastRoute);
    } catch (error) {
      console.log('error', error);
      if (error instanceof String && error.includes('402')) {
        setErrorMessage(t('outstanding_tips'));
      } else setErrorMessage(JSON.stringify(error));
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
    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  }, [formHook.formState.errors, toast, t]);

  return (
    <>
      <FormProvider {...formHook}>
        <Flex
          flexDirection={'column'}
          alignItems={'center'}
          h={'100vh'}
          minWidth={'1024px'}
          backgroundColor={'grayModern.100'}
        >
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
          <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
            {tabType === 'form' ? (
              <Form pxVal={pxVal} isEdit={isEdit} countGpuInventory={countGpuInventory} />
            ) : (
              <Yaml yamlList={yamlList} pxVal={pxVal} />
            )}
          </Box>
        </Flex>
      </FormProvider>
      <ConfirmChild />
      <Loading />

      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </>
  );
};

export default DevboxCreatePage;
