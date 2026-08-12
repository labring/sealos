import { getBackendServices, postDeployApp, putApp } from '@/api/app';
import {
  checkCustomDomainCertificateCoverage,
  checkPermission,
  checkPublicDomain,
  postAuthCname,
  postAuthDomainChallenge
} from '@/api/platform';
import { defaultSliderKey } from '@/constants/app';
import { defaultEditVal, editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useAppStore } from '@/store/app';
import { useGlobalStore } from '@/store/global';
import {
  CUSTOM_DOMAIN_MODE,
  CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED,
  SEALOS_DOMAIN
} from '@/store/static';
import { useUserStore } from '@/store/user';
import type { YamlItemType } from '@/types';
import type { AppEditSyncedFields, AppEditType, DeployKindsType } from '@/types/app';
import { adaptEditAppData, YamlKindEnum } from '@/utils/adapt';
import type { V1OwnerReference } from '@kubernetes/client-node';
import {
  generateOwnerReference,
  json2ConfigMap,
  json2DeployCr,
  json2HPA,
  json2Ingress,
  json2Secret,
  json2Service
} from '@/utils/deployYaml2Json';
import { serviceSideProps } from '@/utils/i18n';
import { getErrText, patchYamlList } from '@/utils/tools';
import { getSubmitErrorMessage } from '@/utils/formErrorMessage';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import Form from './components/Form';
import Header from './components/Header';
import Yaml from './components/Yaml';
import { useMessage } from '@sealos/ui';
import { customAlphabet } from 'nanoid';
import { ResponseCode } from '@/types/response';
import { useGuideStore } from '@/store/guide';
import { track } from '@sealos/gtm';
import {
  PUBLIC_DOMAIN_PREFIX_MAX_LENGTH,
  PUBLIC_DOMAIN_PREFIX_MIN_LENGTH,
  PublicDomainConflictOwner,
  getDuplicateManagedPublicDomainHosts,
  validatePublicDomainPrefix
} from '@/utils/public-domain';
import { getCustomDomainBindings } from '@/utils/custom-domain';
import { APP_NAME_BASE_MAX_LENGTH, getInvalidNameMessageI18nKey } from '@/utils/appNameValidation';
import { Global } from '@emotion/react';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const ErrorModal = dynamic(() => import('./components/ErrorModal'));

const EDIT_PAGE_MIN_PADDING = 12;
const EDIT_PAGE_NAV_WIDTH = 220;
const EDIT_PAGE_COLUMN_GAP = 20;
const EDIT_PAGE_CONTENT_TARGET_WIDTH = 1100;
const EDIT_PAGE_TARGET_WIDTH =
  EDIT_PAGE_NAV_WIDTH + EDIT_PAGE_COLUMN_GAP + EDIT_PAGE_CONTENT_TARGET_WIDTH;

const getPublicDomainPrefixErrorMessage = (
  t: ReturnType<typeof useTranslation>['t'],
  reason: 'format' | 'reserved' | 'conflict' | 'duplicate',
  conflictOwner?: PublicDomainConflictOwner
) => {
  if (reason === 'duplicate') {
    return (
      t('public_domain_prefix_duplicate_error') ||
      'This public address prefix is duplicated in this app. Please choose another one.'
    );
  }

  if (reason === 'conflict') {
    if (conflictOwner) {
      return (
        t('public_domain_prefix_conflict_owner_error', {
          type: conflictOwner.displayType,
          name: conflictOwner.displayName
        }) ||
        `This public address prefix is already used by ${conflictOwner.displayType} "${conflictOwner.displayName}" in this workspace.`
      );
    }

    return (
      t('public_domain_prefix_conflict_error') ||
      'This public address prefix is already in use. Please choose another one.'
    );
  }

  if (reason === 'reserved') {
    return (
      t('public_domain_prefix_reserved_error') ||
      'This public address prefix is reserved. Please choose another one.'
    );
  }

  return (
    t('public_domain_prefix_format_error', {
      min: PUBLIC_DOMAIN_PREFIX_MIN_LENGTH,
      max: PUBLIC_DOMAIN_PREFIX_MAX_LENGTH
    }) ||
    `Use ${PUBLIC_DOMAIN_PREFIX_MIN_LENGTH}-${PUBLIC_DOMAIN_PREFIX_MAX_LENGTH} lowercase letters, numbers, or hyphens. It cannot start or end with a hyphen.`
  );
};

const getConflictOwnerFromError = (error: any): PublicDomainConflictOwner | undefined => {
  return error?.error?.conflictOwner;
};

function validatePublicDomainPrefixBeforeSubmit(
  data: AppEditType,
  t: ReturnType<typeof useTranslation>['t'],
  setFieldError: (index: number, message: string) => void
) {
  if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return '';

  for (const [index, network] of data.networks.entries()) {
    if (!network.openPublicDomain || network.openNodePort || network.customDomain) {
      continue;
    }

    const result = validatePublicDomainPrefix(network.publicDomain);
    if (result.valid) {
      network.publicDomain = result.value;
      continue;
    }

    const message = getPublicDomainPrefixErrorMessage(t, result.reason);
    setFieldError(index, message);
    return message;
  }

  return '';
}

function validateManagedPublicDomainHostDuplicatesBeforeSubmit(
  data: AppEditType,
  t: ReturnType<typeof useTranslation>['t'],
  setFieldError: (index: number, message: string) => void
) {
  if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return '';

  const duplicatedHosts = getDuplicateManagedPublicDomainHosts(data.networks, SEALOS_DOMAIN);
  if (duplicatedHosts.length === 0) return '';

  const message = getPublicDomainPrefixErrorMessage(t, 'duplicate');
  duplicatedHosts.forEach(({ indexes }) => {
    indexes.forEach((index) => setFieldError(index, message));
  });
  return message;
}

async function validatePublicDomainAvailabilityBeforeSubmit(
  data: AppEditType,
  t: ReturnType<typeof useTranslation>['t'],
  setFieldError: (index: number, message: string) => void
) {
  if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return '';

  for (const [index, network] of data.networks.entries()) {
    if (!network.openPublicDomain || network.openNodePort || network.customDomain) {
      continue;
    }

    try {
      await checkPublicDomain({
        prefix: network.publicDomain,
        domain: network.domain,
        appName: data.appName
      });
    } catch (error: any) {
      if (
        error?.code === ResponseCode.FORBIDDEN ||
        /forbidden|permission denied|insufficient permissions/i.test(error?.message || '')
      ) {
        return t('Insufficient permissions');
      }

      if (error?.error?.code !== 'PUBLIC_DOMAIN_CONFLICT') {
        throw error;
      }

      const message = getPublicDomainPrefixErrorMessage(
        t,
        'conflict',
        getConflictOwnerFromError(error)
      );
      setFieldError(index, message);
      return message;
    }
  }

  return '';
}

export const formData2Yamls = (
  data: AppEditType,
  options?: { maskSecret?: boolean }
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
          value: json2Secret(data, undefined, { maskPassword: options?.maskSecret })
        }
      ]
    : [])
];

export const formData2DisplayYamls = (data: AppEditType) =>
  formData2Yamls(data, { maskSecret: true });

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
  const { userSourcePrice, loadUserSourcePrice } = useUserStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!appName);
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<ResponseCode>();
  const [already, setAlready] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // For identifying existing stores and quota calculation
  const [existingStores, setExistingStores] = useState<AppEditType['storeList']>([]);
  const [defaultGpuSource, setDefaultGpuSource] = useState<AppEditType['gpu']>({
    type: '',
    amount: 0,
    manufacturers: ''
  });
  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
  });
  const pxVal = useMemo(() => {
    return Math.max(EDIT_PAGE_MIN_PADDING, Math.floor((screenWidth - EDIT_PAGE_TARGET_WIDTH) / 2));
  }, [screenWidth]);
  const { createCompleted } = useGuideStore();

  const checkCustomDomainBindings = useCallback(async (data: AppEditType) => {
    const bindings = getCustomDomainBindings(data.networks);

    for (const binding of bindings) {
      if (CUSTOM_DOMAIN_MODE === 'certificate') {
        try {
          const result = await checkCustomDomainCertificateCoverage({
            customDomain: binding.customDomain
          });

          if (result.status === 'covered') {
            continue;
          }

          return {
            ...binding,
            reason:
              result.status === 'pendingSync'
                ? ('certificate_domain_pending_sync' as const)
                : result.status === 'unsupported'
                ? ('certificate_domain_unsupported' as const)
                : ('certificate_domain_not_configured' as const)
          };
        } catch (error) {
          return {
            ...binding,
            reason: 'certificate_domain_unsupported' as const
          };
        }
      }

      if (!binding.publicDomain) {
        return {
          ...binding,
          reason: 'cname_not_verified' as const
        };
      }

      try {
        await postAuthCname({
          customDomain: binding.customDomain,
          publicDomain: binding.publicDomain
        });
      } catch (error) {
        try {
          const challengeResult = await postAuthDomainChallenge({
            customDomain: binding.customDomain
          });
          if (!challengeResult?.verified) {
            return {
              ...binding,
              reason: 'cname_not_verified' as const
            };
          }
        } catch (challengeError) {
          return {
            ...binding,
            reason: 'cname_not_verified' as const
          };
        }
      }
    }

    return null;
  }, []);

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
      if (!createCompleted) {
        return router.push('/app/detail?name=hello&guide=true');
      }

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
      } catch (error: any) {
        if (error?.code === ResponseCode.BALANCE_NOT_ENOUGH) {
          setErrorMessage(t('user_balance_not_enough'));
          setErrorCode(ResponseCode.BALANCE_NOT_ENOUGH);

          track('paywall_triggered', {
            module: 'applaunchpad',
            type: 'insufficient_balance'
          });
        } else if (error?.code === ResponseCode.FORBIDDEN_CREATE_APP) {
          setErrorMessage(t('forbidden_create_app'));
          setErrorCode(ResponseCode.FORBIDDEN_CREATE_APP);

          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'FORBIDDEN_CREATE_APP'
          });
        } else if (error?.code === ResponseCode.FORBIDDEN) {
          setErrorMessage(t('Insufficient permissions'));
          setErrorCode(ResponseCode.FORBIDDEN);

          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'FORBIDDEN'
          });
        } else if (error?.code === ResponseCode.QUOTA_EXCEEDED) {
          setErrorMessage(t('quota_exceeded'));
          setErrorCode(ResponseCode.QUOTA_EXCEEDED);

          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'QUOTA_EXCEEDED'
          });
        } else if (error?.code === ResponseCode.APP_ALREADY_EXISTS) {
          setErrorMessage(t('app_already_exists'));
          setErrorCode(ResponseCode.APP_ALREADY_EXISTS);

          track('error_occurred', {
            module: 'applaunchpad',
            error_code: 'APP_ALREADY_EXISTS'
          });
        } else if (error?.code === ResponseCode.BAD_REQUEST) {
          setErrorMessage(
            t(getInvalidNameMessageI18nKey(error?.message) || error?.message || 'Submit Error', {
              length: APP_NAME_BASE_MAX_LENGTH
            })
          );
          setErrorCode(ResponseCode.BAD_REQUEST);
        } else {
          setErrorMessage(JSON.stringify(error));
        }
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
      refetchPrice,
      createCompleted
    ]
  );

  const submitError = useCallback<SubmitErrorHandler<AppEditType>>(
    (errors) => {
      toast({
        title: getSubmitErrorMessage(
          errors,
          t('Submit Error'),
          t(
            'The application name can contain only lowercase letters, digits, and hyphens (-) and must start with a letter'
          )
        ),
        status: 'error',
        position: 'top',
        duration: 3000,
        isClosable: true
      });
    },
    [t, toast]
  );

  const handleDomainVerified = useCallback(
    ({ index, customDomain }: { index: number; customDomain: string }) => {
      try {
        if (!appName) return;
        const data = formHook.getValues();
        if (!data?.appName) return;

        if (data.networks?.[index]) {
          data.networks[index].customDomain = customDomain;
        }

        let ownerReferences: V1OwnerReference[] | undefined;
        const workload = crOldYamls.current.find(
          (item) => item.kind === YamlKindEnum.Deployment || item.kind === YamlKindEnum.StatefulSet
        );
        if (workload) {
          const workloadUid = workload.metadata?.uid;
          const workloadKind = workload.kind as 'Deployment' | 'StatefulSet';
          if (workloadUid && workloadKind) {
            ownerReferences = generateOwnerReference(data.appName, workloadKind, workloadUid);
          }
        }

        const shouldCreateClusterIpService =
          data.networks.some((network) => !network.openNodePort) &&
          data.networks.every((network) => network.openNodePort || !network.serviceName);
        const ingressYaml = json2Ingress(data, ownerReferences);
        const yamlList = [
          ...(shouldCreateClusterIpService
            ? [
                json2Service(data, ownerReferences, {
                  includeNodePort: false
                })
              ]
            : []),
          ingressYaml
        ].filter((item) => item.trim());
        setIsLoading(true);
        postDeployApp(yamlList, 'replace')
          .then(() => {
            toast({ status: 'success', title: t('Deployment Successful') });
            formOldYamls.current = formData2Yamls(data);
            setYamlList(formData2DisplayYamls(data));
          })
          .catch((err) => {
            toast({ status: 'error', title: getErrText(err) });
          })
          .finally(() => setIsLoading(false));
      } catch (error) {}
    },
    [appName, formHook, setIsLoading, t, toast]
  );

  useQuery(
    ['initLaunchpadApp'],
    () => {
      if (!appName) {
        getBackendServices()
          .then((serviceList) => {
            formHook.setValue('serviceList', serviceList);
          })
          .catch(() => {});

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

        setExistingStores(res.storeList);
        setDefaultGpuSource(res.gpu);
        formHook.reset(adaptEditAppData(res));
        setAlready(true);
        setYamlList(formData2DisplayYamls(realTimeForm.current));
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
        setYamlList(formData2DisplayYamls(realTimeForm.current));
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
      console.log('parsedData', parsedData);

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
          appProtocol: network.appProtocol || undefined,
          openPublicDomain: network.openPublicDomain || false,
          openNodePort: network.openNodePort || false,
          publicDomain: network.publicDomain || nanoid(),
          customDomain: network.customDomain || '',
          domain: network.domain || SEALOS_DOMAIN,
          routes: network.routes?.length
            ? network.routes.map((route) => ({
                path: route.path || '/',
                pathType: route.pathType || ('Prefix' as const),
                serviceName: route.serviceName || '',
                servicePort: route.servicePort || network.port || 80
              }))
            : [
                {
                  path: '/',
                  pathType: 'Prefix' as const,
                  serviceName: '',
                  servicePort: network.port || 80
                }
              ]
        }));
        formHook.setValue('networks', completeNetworks);
      }

      // Handle GPU configuration
      if (parsedData.gpu && parsedData.gpu.type) {
        formHook.setValue('gpu', {
          type: parsedData.gpu.type,
          amount: parsedData.gpu.amount || 0,
          manufacturers: parsedData.gpu.manufacturers || 'nvidia'
        });
      }

      // Handle ConfigMap list
      if (Array.isArray(parsedData.configMapList)) {
        const completeConfigMapList = parsedData.configMapList.map((configMap) => ({
          mountPath: configMap.mountPath || '',
          value: configMap.value || '',
          key: configMap.key || '',
          volumeName: configMap.volumeName || `config-${nanoid()}`,
          subPath: configMap.subPath
        }));
        formHook.setValue('configMapList', completeConfigMapList);
      }

      // Handle Store list
      if (Array.isArray(parsedData.storeList)) {
        const completeStoreList = parsedData.storeList.map((store) => ({
          name: store.name || `store-${nanoid()}`,
          path: store.path || '',
          value: store.value || 1,
          storageType: store.storageType,
          storageClassName: store.storageClassName
        }));
        formHook.setValue('storeList', completeStoreList);
      }

      // Handle Network Store list
      if (Array.isArray(parsedData.networkStoreList)) {
        const completeNetworkStoreList = parsedData.networkStoreList.map((store) => ({
          name: store.name || '',
          path: store.path || '',
          storageClassName: store.storageClassName
        }));
        formHook.setValue('networkStoreList', completeNetworkStoreList);
      }

      // Handle Environment variables
      if (Array.isArray(parsedData.envs)) {
        const completeEnvs = parsedData.envs.map((env) => ({
          key: env.key || '',
          value: env.value || '',
          valueFrom: env.valueFrom
        }));
        formHook.setValue('envs', completeEnvs);
      }

      // Handle Shared Memory
      if (parsedData.sharedMemory) {
        formHook.setValue('sharedMemory', {
          enabled: parsedData.sharedMemory.enabled || false,
          sizeLimit: parsedData.sharedMemory.sizeLimit || 1
        });
      }

      // Handle Tolerations
      if (Array.isArray(parsedData.tolerations)) {
        formHook.setValue('tolerations', parsedData.tolerations);
      }
    } catch (error) {}
  }, [router.query, already]);

  return (
    <>
      <Global
        styles={{
          'html, body': {
            minWidth: 0,
            overflowX: 'hidden'
          }
        }}
      />
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        h={'100%'}
        minWidth={0}
        w={'100%'}
        backgroundColor={'grayModern.100'}
        overflowY={'auto'}
        overflowX={'hidden'}
      >
        <Header
          appName={formHook.getValues('appName')}
          title={title}
          yamlList={yamlList}
          getFormData={() => realTimeForm.current}
          applyBtnText={applyBtnText}
          applyCb={() => {
            formHook.handleSubmit(async (data) => {
              console.log('data', data);

              const publicDomainErrorMessage = validatePublicDomainPrefixBeforeSubmit(
                data,
                t,
                (index, message) => {
                  formHook.setError(`networks.${index}.publicDomain`, {
                    type: 'validate',
                    message
                  });
                }
              );

              if (publicDomainErrorMessage) {
                return toast({
                  status: 'warning',
                  title: publicDomainErrorMessage
                });
              }

              const publicDomainDuplicateErrorMessage =
                validateManagedPublicDomainHostDuplicatesBeforeSubmit(data, t, (index, message) => {
                  formHook.setError(`networks.${index}.publicDomain`, {
                    type: 'duplicate',
                    message
                  });
                });

              if (publicDomainDuplicateErrorMessage) {
                return toast({
                  status: 'warning',
                  title: publicDomainDuplicateErrorMessage
                });
              }

              const publicDomainAvailabilityErrorMessage =
                await validatePublicDomainAvailabilityBeforeSubmit(data, t, (index, message) => {
                  formHook.setError(`networks.${index}.publicDomain`, {
                    type: 'validate',
                    message
                  });
                });

              if (publicDomainAvailabilityErrorMessage) {
                return toast({
                  status: 'warning',
                  title: publicDomainAvailabilityErrorMessage
                });
              }

              const parseYamls = formData2Yamls(data);
              setYamlList(formData2DisplayYamls(data));

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
              if (!checkNetworkPorts(data.networks)) {
                return toast({
                  status: 'warning',
                  title: t('Network port conflict')
                });
              }

              const invalidCustomDomain = await checkCustomDomainBindings(data);
              if (invalidCustomDomain) {
                const certificateMessage =
                  invalidCustomDomain.reason === 'certificate_domain_pending_sync'
                    ? t('custom_domain_certificate_pending_sync', {
                        customDomain: invalidCustomDomain.customDomain
                      })
                    : invalidCustomDomain.reason === 'certificate_domain_unsupported'
                    ? t('custom_domain_certificate_unavailable')
                    : t('custom_domain_certificate_not_configured', {
                        customDomain: invalidCustomDomain.customDomain
                      });

                return toast({
                  status: 'warning',
                  title:
                    invalidCustomDomain.reason === 'certificate_domain_not_configured' ||
                    invalidCustomDomain.reason === 'certificate_domain_pending_sync' ||
                    invalidCustomDomain.reason === 'certificate_domain_unsupported'
                      ? certificateMessage
                      : t('custom_domain_cname_required', {
                          customDomain: invalidCustomDomain.customDomain,
                          publicDomain: invalidCustomDomain.publicDomain
                        })
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
                    title:
                      error?.code === ResponseCode.FORBIDDEN ||
                      /forbidden|permission denied|insufficient permissions/i.test(
                        error?.message || ''
                      )
                        ? t('Insufficient permissions')
                        : error?.message || 'Check Error'
                  });
                }
              }

              openConfirm(() => {
                track('deployment_create', {
                  module: 'applaunchpad',
                  method: 'custom',
                  config: {
                    template_type: 'public',
                    template_name: data.imageName,
                    template_version: data.imageName.split(':')?.[1] ?? 'latest'
                  },
                  resources: {
                    cpu_cores: data.cpu,
                    ram_mb: data.memory,
                    replicas: data.hpa.use ? data.hpa.maxReplicas : Number(data.replicas),
                    scaling: data.hpa.use
                      ? {
                          method:
                            data.hpa.target === 'cpu'
                              ? 'CPU'
                              : data.hpa.target === 'gpu'
                              ? 'GPU'
                              : 'RAM',
                          value: data.hpa.value
                        }
                      : undefined
                  }
                });
                submitSuccess(parseYamls);
              })();
            }, submitError)();
          }}
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form
              formHook={formHook}
              already={already}
              existingStores={existingStores}
              countGpuInventory={countGpuInventory}
              pxVal={pxVal}
              refresh={forceUpdate}
              isAdvancedOpen={isAdvancedOpen}
              onDomainVerified={handleDomainVerified}
            />
          ) : (
            <Yaml yamlList={yamlList} pxVal={pxVal} />
          )}
        </Box>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal
          title={t(applyError)}
          content={errorMessage}
          onClose={() => setErrorMessage('')}
          errorCode={errorCode}
        />
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
