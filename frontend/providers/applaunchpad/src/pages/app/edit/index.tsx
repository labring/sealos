import { exportApp, exportApps, getAppByName, getConfigMapName, postDeployApp, putApp } from '@/api/app';
import { updateDesktopGuide } from '@/api/platform';
import { noGpuSliderKey } from '@/constants/app';
import { defaultEditVal, editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import useDriver from '@/hooks/useDriver';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/app';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import type { YamlItemType } from '@/types';
import type { AppEditContainerType, AppEditType, DeployKindsType } from '@/types/app';
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
import { addConfigMapToYamlList, getErrText, patchYamlList } from '@/utils/tools';
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
import { getCurrentNamespace, getUserNamespace } from '@/utils/user';
import YAML from 'js-yaml';

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
  // ...(data.containers.some((container) => container.networks.some((item) => item.openPublicDomain))
  //   ? [
  //       {
  //         filename: 'ingress.yaml',
  //         value: json2Ingress(data)
  //       }
  //     ]
  //   : []),
  ...(data.hpa.use
    ? [
        {
          filename: 'hpa.yaml',
          value: json2HPA(data)
        }
      ]
    : []),
  ...(data.containers.some((container) => container.secret.use)
    ? data.containers
        .filter((container) => container.secret.use)
        .map((container) => {
          return {
            filename: `${container.name}-secret.yaml`,
            value: json2Secret(container)
          };
        })
    : [])
];

const EditApp = ({
  namespace,
  appName,
  tabType
}: {
  namespace: string;
  appName?: string;
  tabType: string;
}) => {
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

  const currentNamespace = getCurrentNamespace(namespace);

  // form
  const formHook = useForm<AppEditType>({
    defaultValues: defaultEditVal
  });
  const { isGuided, closeGuide } = useDriver();

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
      setIsLoading(true);
      try {
        let data = await getConfigMapName();
        let configMapName = data?.configmapName || '';
        let mountPath = data?.mountPath || '';
        const yamls = yamlList.map((item) => item.value);
        if (appName) {
          const patch = patchYamlList({
            formOldYamlList: formOldYamls.current.map((item) => item.value),
            newYamlList: addConfigMapToYamlList(yamls, configMapName, mountPath),
            crYamlList: crOldYamls.current
          });
          console.log('patch:', currentNamespace, appName, patch);
          await putApp(currentNamespace, {
            patch,
            appName,
            stateFulSetYaml: yamlList.find((item) => item.filename === 'statefulSet.yaml')?.value
          });
        } else {
          await postDeployApp(currentNamespace, yamls);
        }

        router.replace(
          `/app/detail?namespace=${currentNamespace}&&name=${formHook.getValues('appName')}`
        );
        if (!isGuided) {
          updateDesktopGuide({
            activityType: 'beginner-guide',
            phase: 'launchpad',
            phasePage: 'create',
            shouldSendGift: true
          }).catch((err) => {
            console.log(err);
          });
        }
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
      appName,
      router,
      currentNamespace,
      formHook,
      isGuided,
      toast,
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

  // test
  // useEffect(() => {
  //   exportApps({
  //     namespace: currentNamespace,
  //     appNames: ['hello-world2', 'hello-world']
  //   });
  // }, []);

  useQuery(
    ['initLaunchpadApp'],
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
      return setAppDetail(currentNamespace, appName);
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
        setYamlList(formData2Yamls(res));
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
        backgroundColor={'grayModern.100'}
      >
        <Header
          namespace={currentNamespace}
          formHook={formHook}
          appName={formHook.getValues('appName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() => {
            closeGuide();
            formHook.handleSubmit((data) => {
              console.log(data);
              const parseYamls = formData2Yamls(data);

              setYamlList(parseYamls);
              // balance check
              // if (balance <= 0) {
              //   return toast({
              //     status: 'warning',
              //     title: t('user.Insufficient account balance')
              //   });
              // }

              // gpu inventory check
              console.log('gpu:', data.gpu);
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
              // console.log('oldAppEditData.current:', oldAppEditData.current);
              // const quoteCheckRes = checkQuotaAllow(data, oldAppEditData.current);
              // if (quoteCheckRes) {
              //   return toast({
              //     status: 'warning',
              //     title: t(quoteCheckRes),
              //     duration: 5000,
              //     isClosable: true
              //   });
              // }

              // check network port
              const networks = data.containers.flatMap((item) => item.networks);
              if (!checkNetworkPorts(networks)) {
                return toast({
                  status: 'warning',
                  title: t('Network port conflict')
                });
              }

              console.log('submitSuccess');
              openConfirm(() => submitSuccess(parseYamls))();
            }, submitError)();
          }}
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form
              namespace={currentNamespace}
              formHook={formHook}
              already={already}
              defaultStorePathList={defaultStorePathList}
              countGpuInventory={countGpuInventory}
              pxVal={pxVal}
              refresh={forceUpdate}
            />
          ) : (
            <Yaml namespace={currentNamespace} yamlList={yamlList} pxVal={pxVal} />
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
  const namespace = content?.query?.namespace || 'default';
  const tabType = content?.query?.type || 'form';

  return {
    props: {
      namespace,
      appName,
      tabType,
      ...(await serviceSideProps(content))
    }
  };
}

export default EditApp;

function checkNetworkPorts(networks: AppEditContainerType['networks']) {
  const ports = networks.map((item) => item.port);
  const portSet = new Set(ports);
  if (portSet.size !== ports.length) {
    return false;
  }
  return true;
}
