import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box } from '@chakra-ui/react';
import type { YamlItemType } from '@/types';
import {
  json2DeployCr,
  json2Service,
  json2Ingress,
  json2ConfigMap,
  json2Secret,
  json2HPA
} from '@/utils/deployYaml2Json';
import { useForm } from 'react-hook-form';
import { defaultEditVal, editModeMap } from '@/constants/editApp';
import { postDeployApp, putApp } from '@/api/app';
import { useConfirm } from '@/hooks/useConfirm';
import type { AppEditType, DeployKindsType } from '@/types/app';
import { adaptEditAppData } from '@/utils/adapt';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import Header from './components/Header';
import Form from './components/Form';
import Yaml from './components/Yaml';
import dynamic from 'next/dynamic';
import { serviceSideProps } from '@/utils/i18n';
import { getErrText, patchYamlList } from '@/utils/tools';
import { useTranslation } from 'next-i18next';
import { noGpuSliderKey } from '@/constants/app';
import { useUserStore } from '@/store/user';

const ErrorModal = dynamic(() => import('./components/ErrorModal'));

const formData2Yamls = (data: AppEditType) => [
  {
    filename: 'service.yaml',
    value: json2Service(data)
  },
  !!data.storeList?.length
    ? {
        filename: 'statefulSet.yaml',
        value: json2DeployCr(data, 'statefulset')
      }
    : {
        filename: 'deployment.yaml',
        value: json2DeployCr(data, 'deployment')
      },
  ...(data.configMapList.length > 0
    ? [
        {
          filename: 'configmap.yaml',
          value: json2ConfigMap(data)
        }
      ]
    : []),
  ...(data.networks.find((item) => item.openPublicDomain)
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
  const formOldYamls = useRef<YamlItemType[]>([]);
  const crOldYamls = useRef<DeployKindsType[]>([]);
  const oldAppEditData = useRef<AppEditType>();

  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { setAppDetail } = useAppStore();
  const { screenWidth, formSliderListConfig } = useGlobalStore();
  const { userSourcePrice, loadUserSourcePrice, checkQuotaAllow, balance } = useUserStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!appName);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [already, setAlready] = useState(false);
  const [defaultStorePathList, setDefaultStorePathList] = useState<string[]>([]); // default store will no be edit
  const [defaultGpuSource, setDefaultGpuSource] = useState<AppEditType['gpu']>({
    type: '',
    amount: 0,
    manufacturers: ''
  });
  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
  });
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
  const realTimeForm = useRef(defaultEditVal);

  // watch form change, compute new yaml
  formHook.watch((data) => {
    if (!data) return;
    realTimeForm.current = data as AppEditType;
    setForceUpdate(!forceUpdate);
  });

  const { refetch: refetchPrice } = useQuery(['init-price'], loadUserSourcePrice, {
    enabled: !!userSourcePrice?.gpu,
    refetchInterval: 5000
  });

  // add already deployment gpu amount if they exists
  const countGpuInventory = useCallback(
    (type?: string) => {
      const inventory = userSourcePrice?.gpu?.find((item) => item.type === type)?.inventory || 0;
      const defaultInventory = type === defaultGpuSource?.type ? defaultGpuSource?.amount || 0 : 0;
      return inventory + defaultInventory;
    },
    [defaultGpuSource?.amount, defaultGpuSource?.type, userSourcePrice?.gpu]
  );

  const submitSuccess = useCallback(
    async (yamlList: YamlItemType[]) => {
      setIsLoading(true);
      try {
        const yamls = yamlList.map((item) => item.value);

        if (appName) {
          const patch = patchYamlList({
            formOldYamlList: formOldYamls.current.map((item) => item.value),
            crYamlList: crOldYamls.current,
            newYamlList: yamls
          });
          console.log(patch);

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

        if (userSourcePrice?.gpu) {
          refetchPrice();
        }
      } catch (error) {
        console.error(error);
        const msg = getErrText(error);
        setErrorMessage(msg || JSON.stringify(error));
      }
      setIsLoading(false);
    },
    [
      setIsLoading,
      toast,
      appName,
      router,
      formHook,
      t,
      applySuccess,
      userSourcePrice?.gpu,
      refetchPrice
    ]
  );
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
        const defaultApp = {
          ...defaultEditVal,
          cpu: formSliderListConfig[noGpuSliderKey].cpu[0],
          memory: formSliderListConfig[noGpuSliderKey].memory[0]
        };
        setAlready(true);
        setYamlList([
          {
            filename: 'service.yaml',
            value: json2Service(defaultApp)
          },
          {
            filename: 'deployment.yaml',
            value: json2DeployCr(defaultApp, 'deployment')
          }
        ]);
        return null;
      }
      setIsLoading(true);
      refetchPrice();
      return setAppDetail(appName);
    },
    {
      onSuccess(res) {
        if (!res) return;
        oldAppEditData.current = res;
        formOldYamls.current = formData2Yamls(res);
        crOldYamls.current = res.crYamlList;

        setDefaultStorePathList(res.storeList.map((item) => item.path));
        setDefaultGpuSource(res.gpu);
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

  useEffect(() => {
    if (tabType === 'yaml') {
      try {
        setYamlList(formData2Yamls(realTimeForm.current));
      } catch (error) {}
    }
  }, [router.query.name, tabType]);

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
          applyCb={() =>
            formHook.handleSubmit((data) => {
              const parseYamls = formData2Yamls(data);
              setYamlList(parseYamls);
              // balance check
              if (balance <= 0) {
                return toast({
                  status: 'warning',
                  title: t('user.Insufficient account balance')
                });
              }

              // gpu inventory check
              if (data.gpu?.type) {
                const inventory = countGpuInventory(data.gpu?.type);
                if (data.gpu?.amount > inventory) {
                  return toast({
                    status: 'warning',
                    title: t('Gpu under inventory Tip', {
                      gputype: data.gpu.type
                    })
                  });
                }
              }
              // quote check
              const quoteCheckRes = checkQuotaAllow(data, oldAppEditData.current);
              if (quoteCheckRes) {
                return toast({
                  status: 'warning',
                  title: t(quoteCheckRes),
                  duration: 5000,
                  isClosable: true
                });
              }
              // check network port
              if (!checkNetworkPorts(data.networks)) {
                return toast({
                  status: 'warning',
                  title: t('Network port conflict')
                });
              }

              openConfirm(() => submitSuccess(parseYamls))();
            }, submitError)()
          }
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form
              formHook={formHook}
              already={already}
              defaultStorePathList={defaultStorePathList}
              countGpuInventory={countGpuInventory}
              pxVal={pxVal}
              refresh={forceUpdate}
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

function checkNetworkPorts(networks: AppEditType['networks']) {
  const ports = networks.map((item) => item.port);
  const portSet = new Set(ports);
  if (portSet.size !== ports.length) {
    return false;
  }
  return true;
}
