import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box } from '@chakra-ui/react';
import type { YamlItemType } from '@/types';
import {
  json2Development,
  json2StatefulSet,
  json2Service,
  json2Ingress,
  json2ConfigMap,
  json2Secret,
  json2HPA
} from '@/utils/deployYaml2Json';
import { useForm } from 'react-hook-form';
import { defaultEditVal, editModeMap } from '@/constants/editApp';
import debounce from 'lodash/debounce';
import { postDeployApp, putApp } from '@/api/app';
import { useConfirm } from '@/hooks/useConfirm';
import type { AppEditType } from '@/types/app';
import { adaptEditAppData } from '@/utils/adapt';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { useLoading } from '@/hooks/useLoading';
import Header from './components/Header';
import Form from './components/Form';
import Yaml from './components/Yaml';
import dynamic from 'next/dynamic';
const ErrorModal = dynamic(() => import('./components/ErrorModal'));
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { patchYamlList } from '@/utils/tools';
import { useTranslation } from 'next-i18next';

const formData2Yamls = (data: AppEditType) => [
  {
    filename: 'service.yaml',
    value: json2Service(data)
  },
  data.storeList.length > 0
    ? {
        filename: 'statefulSet.yaml',
        value: json2StatefulSet(data)
      }
    : {
        filename: 'deployment.yaml',
        value: json2Development(data)
      },
  ...(data.configMapList.length > 0
    ? [
        {
          filename: 'configmap.yaml',
          value: json2ConfigMap(data)
        }
      ]
    : []),
  ...(data.accessExternal.use
    ? [
        {
          filename: 'ingress.yaml',
          value: json2Ingress(data)
        }
      ]
    : []),
  ...(data.hpa.use
    ? [
        {
          filename: 'hpa.yaml',
          value: json2HPA(data)
        }
      ]
    : []),
  ...(data.secret.use
    ? [
        {
          filename: 'secret.yaml',
          value: json2Secret(data)
        }
      ]
    : [])
];

const EditApp = ({ appName, tabType }: { appName?: string; tabType: string }) => {
  const { t } = useTranslation();
  const appOldYamls = useRef<YamlItemType[]>([]);
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { setAppDetail } = useAppStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!appName);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [already, setAlready] = useState(false);
  const [defaultStorePathList, setDefaultStorePathList] = useState<string[]>([]); // default store will no be edit
  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
  });
  // compute container width
  const { screenWidth } = useGlobalStore();
  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2);
    if (val < 20) {
      return 20;
    }
    return val;
  }, [screenWidth]);

  // form
  const formHook = useForm<AppEditType>({
    defaultValues: defaultEditVal
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: AppEditType) => {
      try {
        setYamlList(formData2Yamls(data));
      } catch (error) {
        console.log(error);
      }
    }, 200),
    []
  );
  // watch form change, compute new yaml
  formHook.watch((data) => {
    data && formOnchangeDebounce(data as AppEditType);
    setForceUpdate(!forceUpdate);
  });

  const submitSuccess = useCallback(async () => {
    setIsLoading(true);
    try {
      const yamls = yamlList.map((item) => item.value);
      if (appName) {
        const patch = patchYamlList(
          appOldYamls.current.map((item) => item.value),
          yamls
        );

        await putApp({
          patch,
          appName,
          stateFulSetYaml: yamlList.find((item) => item.filename === 'statefulSet.yaml')?.value
        });
      } else {
        await postDeployApp(yamls);
      }

      router.replace(`/app/detail?name=${formHook.getValues('appName')}`);
      toast({
        title: t(applySuccess),
        status: 'success'
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  }, [setIsLoading, yamlList, appName, router, formHook, toast, t, applySuccess]);
  const submitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj) return t('Submit Error');
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
  }, [formHook.formState.errors, t, toast]);

  useQuery(
    ['init'],
    () => {
      if (!appName) {
        setAlready(true);
        setYamlList([
          {
            filename: 'service.yaml',
            value: json2Service(defaultEditVal)
          },
          {
            filename: 'deployment.yaml',
            value: json2Development(defaultEditVal)
          }
        ]);
        return null;
      }
      setIsLoading(true);
      return setAppDetail(appName);
    },
    {
      onSuccess(res) {
        if (!res) return;
        appOldYamls.current = formData2Yamls(res);
        setDefaultStorePathList(res.storeList.map((item) => item.path));
        formHook.reset(adaptEditAppData(res));
        setAlready(true);
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

  return (
    <>
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        h={'100%'}
        minWidth={'1024px'}
        backgroundColor={'#F3F4F5'}
      >
        <Header
          appName={formHook.getValues('appName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form
              formHook={formHook}
              already={already}
              defaultStorePathList={defaultStorePathList}
              pxVal={pxVal}
            />
          ) : (
            <Yaml yamlList={yamlList} pxVal={pxVal} />
          )}
        </Box>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </>
  );
};

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';
  const tabType = content?.query?.type || 'form';

  return {
    props: {
      appName,
      tabType,
      ...(await serviceSideProps(content))
    }
  };
}

export default EditApp;
