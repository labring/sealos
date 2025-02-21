import { postDeployApp, putApp } from '@/api/app';
import { checkPermission } from '@/api/platform';
import { defaultSliderKey } from '@/constants/app';
import { defaultEditVal, editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import useDriver from '@/hooks/useDriver';
import { useLoading } from '@/hooks/useLoading';
import { useAppStore } from '@/store/app';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import type { YamlItemType } from '@/types';
import type { AppEditSyncedFields, AppEditType, DeployKindsType } from '@/types/app';
import { adaptEditAppData } from '@/utils/adapt';
import {
  json2ConfigMap,
  json2DeployCr,
  json2HPA,
  json2Ingress,
  json2Secret,
  json2Service
} from '@/utils/deployYaml2Json';
import { serviceSideProps } from '@/utils/i18n';
import { getErrText, patchYamlList } from '@/utils/tools';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import Header from './components/Header';
import Yaml from './components/Yaml';
import { useMessage } from '@sealos/ui';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const ErrorModal = dynamic(() => import('./components/ErrorModal'));

export const formData2Yamls = (
  data: AppEditType
  // handleType: 'edit' | 'create' = 'create',
  // crYamlList?: DeployKindsType[]
) => [
  {
    filename: 'service.yaml',
    value: json2Service(data)
  },
  data.kind === 'statefulset' || data.storeList?.length > 0
    ? {
        filename: 'statefulset.yaml',
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
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { setAppDetail } = useAppStore();
  const { screenWidth, formSliderListConfig } = useGlobalStore();
  const { userSourcePrice, loadUserSourcePrice, checkQuotaAllow } = useUserStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!appName);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [already, setAlready] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [defaultStorePathList, setDefaultStorePathList] = useState<string[]>([]); // default store will no be edit
  const [defaultGpuSource, setDefaultGpuSource] = useState<AppEditType['gpu']>({
    type: '',
    amount: 0,
    manufacturers: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const { isGuided, closeGuide } = useDriver({ setIsAdvancedOpen });

  const realTimeForm = useRef(defaultEditVal);

  // watch form change, compute new yaml
  formHook.watch((data) => {
    if (!data) return;
    realTimeForm.current = data as AppEditType;
    setForceUpdate(!forceUpdate);
  });

  const { refetch: refetchPrice } = useQuery(['init-price'], loadUserSourcePrice, {
    enabled: !!userSourcePrice?.gpu,
    refetchInterval: 6000
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
      setIsSubmitting(false);
      setIsLoading(true);
      try {
        const parsedNewYamlList = yamlList.map((item) => item.value);

        if (appName) {
          const patch = patchYamlList({
            parsedOldYamlList: formOldYamls.current.map((item) => item.value),
            parsedNewYamlList: parsedNewYamlList,
            originalYamlList: crOldYamls.current
          });
          await putApp({
            patch,
            appName,
            stateFulSetYaml: yamlList.find((item) => item.filename === 'statefulset.yaml')?.value
          });
        } else {
          await postDeployApp(parsedNewYamlList);
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
      if (!obj || typeof obj !== 'object') return t('Submit Error');
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
    ['initLaunchpadApp'],
    () => {
      if (!appName) {
        const defaultApp = {
          ...defaultEditVal,
          cpu: formSliderListConfig[defaultSliderKey].cpu[0],
          memory: formSliderListConfig[defaultSliderKey].memory[0]
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
        console.log(res, 'init res');
        oldAppEditData.current = res;
        formOldYamls.current = formData2Yamls(res);
        crOldYamls.current = res.crYamlList;

        setDefaultStorePathList(res.storeList.map((item) => item.path));
        setDefaultGpuSource(res.gpu);
        formHook.reset(adaptEditAppData(res));
        setAlready(true);
        setYamlList(formData2Yamls(realTimeForm.current));
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

  useEffect(() => {
    try {
      console.log('edit page already', already, router.query);
      if (!already) return;
      const query = router.query as { formData?: string; name?: string };
      if (!query.formData) return;

      const parsedData: Partial<AppEditSyncedFields> = JSON.parse(
        decodeURIComponent(query.formData)
      );

      const basicFields: (keyof AppEditSyncedFields)[] = router.query?.name
        ? ['imageName', 'cpu', 'memory']
        : ['imageName', 'replicas', 'cpu', 'memory', 'cmdParam', 'runCMD', 'appName', 'labels'];

      basicFields.forEach((field) => {
        if (parsedData[field] !== undefined) {
          formHook.setValue(field, parsedData[field] as any);
        }
      });

      if (Array.isArray(parsedData.networks)) {
        const completeNetworks = parsedData.networks.map((network) => ({
          networkName: network.networkName || `network-${nanoid()}`,
          portName: network.portName || nanoid(),
          port: network.port || 80,
          protocol: network.protocol || 'TCP',
          appProtocol: network.appProtocol || 'HTTP',
          openPublicDomain: network.openPublicDomain || false,
          openNodePort: network.openNodePort || false,
          publicDomain: network.publicDomain || nanoid(),
          customDomain: network.customDomain || '',
          domain: network.domain || 'gzg.sealos.run'
        }));
        formHook.setValue('networks', completeNetworks);
      }
    } catch (error) {}
  }, [router.query, already]);

  return (
    <>
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        h={'100%'}
        minWidth={'1024px'}
        backgroundColor={'grayModern.100'}
        overflowY={'auto'}
      >
        <Header
          appName={formHook.getValues('appName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() => {
            console.log(isSubmitting, 123123);

            if (isSubmitting) return;
            closeGuide();
            setIsSubmitting(true);
            formHook.handleSubmit(async (data) => {
              const parseYamls = formData2Yamls(data);
              setYamlList(parseYamls);

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

              // check permission
              if (appName) {
                try {
                  const result = await checkPermission({
                    appName: data.appName
                  });
                  if (result === 'insufficient_funds') {
                    return toast({
                      status: 'warning',
                      title: t('user.Insufficient account balance')
                    });
                  }
                } catch (error: any) {
                  return toast({
                    status: 'warning',
                    title: error?.message || 'Check Error'
                  });
                }
              }

              openConfirm(
                () => submitSuccess(parseYamls),
                () => setIsSubmitting(false)
              )();
            }, submitError)();
          }}
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
              isAdvancedOpen={isAdvancedOpen}
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
  const portProtocolSet = new Set<string>();

  for (const network of networks) {
    const { port, protocol } = network;
    const key = `${port}-${protocol}`;
    if (portProtocolSet.has(key)) {
      return false;
    }
    portProtocolSet.add(key);
  }

  return true;
}
