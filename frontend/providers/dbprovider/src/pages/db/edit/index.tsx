import { adapterMongoHaConfig, applyYamlList, createDB } from '@/api/db';
import { defaultDBEditValue } from '@/constants/db';
import { editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import useEnvStore from '@/store/env';
import { useGlobalStore } from '@/store/global';
import { DBVersionMap } from '@/store/static';
import type { YamlItemType } from '@/types';
import { AutoBackupFormType } from '@/types/backup';
import type { DBEditType } from '@/types/db';
import { adaptDBForm } from '@/utils/adapt';
import { serviceSideProps } from '@/utils/i18n';
import { json2Account, json2CreateCluster, limitRangeYaml } from '@/utils/json2Yaml';
import {
  Box,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import Form from './components/Form';
import Header from './components/Header';
import Yaml from './components/Yaml';
import yaml from 'js-yaml';
import { ResponseCode } from '@/types/response';
import { useGuideStore } from '@/store/guide';
import { getDBSecret } from '@/api/db';
import type { BackupItemType } from '@/types/db';
import { getBackups, deleteBackup } from '@/api/backup';
import StopBackupModal from '../detail/components/StopBackupModal';
import { resourcePropertyMap, useUserQuota, useQuotaGuarded } from '@sealos/shared';
import { distributeResources } from '@/utils/database';
import MyIcon from '@/components/Icon';
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const EditApp = ({ dbName, tabType }: { dbName?: string; tabType?: 'form' | 'yaml' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<ResponseCode>();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [allocatedStorage, setAllocatedStorage] = useState(1);
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const { loadDBDetail } = useDBStore();
  const oldDBEditData = useRef<DBEditType>();
  const { SystemEnv } = useEnvStore();

  const defaultEdit = {
    ...defaultDBEditValue,
    dbVersion: DBVersionMap.postgresql?.[0]?.id || 'postgresql-14.8.0',
    autoBackup: {
      ...defaultDBEditValue.autoBackup,
      // Enable backup only when the flag is set.
      start: SystemEnv.BACKUP_ENABLED
    } satisfies Partial<AutoBackupFormType> as AutoBackupFormType | undefined
  };

  // Stop backup modal state
  const {
    isOpen: isStopBackupOpen,
    onOpen: onStopBackupOpen,
    onClose: onStopBackupClose
  } = useDisclosure();
  const [pendingFormData, setPendingFormData] = useState<DBEditType | null>(null);

  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!dbName);
  const { openConfirm, ConfirmChild } = useConfirm({
    content: t(applyMessage)
  });
  const isEdit = useMemo(() => !!dbName, [dbName]);

  // compute container width
  const { screenWidth, lastRoute } = useGlobalStore();
  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2);
    if (val < 20) {
      return 20;
    }
    return val;
  }, [screenWidth]);

  // form
  const formHook = useForm<DBEditType>({
    defaultValues: defaultEdit
  });

  const realTimeForm = useRef(defaultEdit);

  // watch form change, compute new yaml
  formHook.watch((data) => {
    if (!data) return;
    realTimeForm.current = data as any;
    setForceUpdate(!forceUpdate);
  });

  const resourceRequirements = useMemo(() => {
    const oldReplicas = formHook.formState.defaultValues?.replicas ?? 0;
    const newReplicas = realTimeForm.current.replicas;

    // Calculate actual resource usage from components list for more accurate result.

    const oldComponents = distributeResources({
      // dbType cannot be changed
      dbType: realTimeForm.current.dbType,
      cpu: formHook.formState.defaultValues?.cpu ?? 0,
      memory: formHook.formState.defaultValues?.memory ?? 0,
      storage: formHook.formState.defaultValues?.storage ?? 0,
      replicas: formHook.formState.defaultValues?.replicas ?? 0,
      forDisplay: false
    });

    const newComponents = distributeResources({
      // dbType cannot be changed
      dbType: realTimeForm.current.dbType,
      cpu: realTimeForm.current.cpu,
      memory: realTimeForm.current.memory,
      storage: realTimeForm.current.storage,
      replicas: realTimeForm.current.replicas,
      forDisplay: false
    });

    const oldResources = {
      cpu: Object.values(oldComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.cpuMemory.limits.cpu.replace('m', '')) * (cur?.other?.replicas ?? oldReplicas),
        0
      ),
      memory: Object.values(oldComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.cpuMemory.limits.memory.replace('Mi', '')) *
            (cur?.other?.replicas ?? oldReplicas),
        0
      ),
      storage: Object.values(oldComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.storage * resourcePropertyMap.storage.scale) *
            (cur?.other?.replicas ?? oldReplicas),
        0
      )
    };

    const newResources = {
      cpu: Object.values(newComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.cpuMemory.limits.cpu.replace('m', '')) * (cur?.other?.replicas ?? newReplicas),
        0
      ),
      memory: Object.values(newComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.cpuMemory.limits.memory.replace('Mi', '')) *
            (cur?.other?.replicas ?? newReplicas),
        0
      ),
      storage: Object.values(newComponents).reduce(
        (acc, cur) =>
          acc +
          Number(cur.storage * resourcePropertyMap.storage.scale) *
            (cur?.other?.replicas ?? newReplicas),
        0
      )
    };

    return {
      cpu: isEdit ? newResources.cpu - oldResources.cpu : newResources.cpu,
      memory: isEdit ? newResources.memory - oldResources.memory : newResources.memory,
      storage: isEdit ? newResources.storage - oldResources.storage : newResources.storage,
      traffic: true
    };
  }, [formHook.formState, isEdit]);

  const quotaResult = useUserQuota({
    requirements: resourceRequirements
  });
  const exceededQuotas = quotaResult.exceededQuotas || [];

  useEffect(() => {
    if (!dbName) {
      const hour = Math.floor(Math.random() * 10) + 14;
      formHook.setValue('autoBackup.hour', hour.toString().padStart(2, '0'));
      const minute = Math.floor(Math.random() * 60);
      formHook.setValue('autoBackup.minute', minute.toString().padStart(2, '0'));
    }
  }, []);

  const generateYamlList = (data: DBEditType) => {
    return [
      ...(isEdit
        ? []
        : [
            {
              filename: 'account.yaml',
              value: json2Account(data)
            }
          ]),
      {
        filename: 'cluster.yaml',
        value: json2CreateCluster(data)
      }
    ];
  };

  function getCpuCores(yamlString: string): number {
    try {
      const doc = yaml.load(yamlString) as any;
      const cpuStr: string | undefined = doc?.spec?.componentSpecs?.[0]?.resources?.limits?.cpu;
      if (!cpuStr) return 8;
      const cpu = parseInt(cpuStr.replace('m', ''));
      return Math.ceil(cpu / 1000);
    } catch (error) {
      return 8;
    }
  }

  const cpu = useMemo(() => {
    if (yamlList.length === 0) return 8;
    const clusterYaml = yamlList.find((item) => item.filename === 'cluster.yaml');
    if (!clusterYaml) return 8;
    return getCpuCores(clusterYaml.value);
  }, [yamlList]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: DBEditType) => {
      try {
        setYamlList(generateYamlList(data));
      } catch (error) {
        console.error(error);
      }
    }, 200),
    []
  );

  // watch form change, compute new yaml
  formHook.watch((data) => {
    data && formOnchangeDebounce(data as DBEditType);
    setForceUpdate(!forceUpdate);
  });

  const { createCompleted } = useGuideStore();

  const supportConnect = ['postgresql', 'mongodb', 'apecloud-mysql', 'mysql', 'redis'].includes(
    formHook.getValues('dbType')
  );

  const { data: secret } = useQuery(
    ['secret', dbName],
    () => (dbName ? getDBSecret({ dbName, dbType: formHook.getValues('dbType') }) : null),
    { enabled: !!dbName && supportConnect }
  );

  const submitSuccess = async (formData: DBEditType) => {
    if (!createCompleted) {
      return router.push('/db/detail?name=hello-db&guide=true');
    }

    const needMongoAdapter =
      formData.dbType === 'mongodb' && formData.replicas !== oldDBEditData.current?.replicas;
    setIsLoading(true);
    try {
      !isEdit && (await applyYamlList([limitRangeYaml], 'create'));
      needMongoAdapter && (await adapterMongoHaConfig({ name: formData.dbName }));
    } catch (err) {}
    try {
      await createDB({ dbForm: formData, isEdit });

      track({
        event: 'deployment_create',
        module: 'database',
        context: 'app',
        config: {
          template_name: formData.dbType,
          template_version: formData.dbVersion
        },
        resources: {
          cpu_cores: formData.cpu,
          ram_mb: formData.memory,
          replicas: formData.replicas,
          storage: formData.storage
        },
        backups: {
          enabled: !!formData.autoBackup
        }
      });

      toast({
        title: t(applySuccess),
        status: 'success'
      });
      router.replace(`/db/detail?name=${formData.dbName}&dbType=${formData.dbType}`);
    } catch (error: any) {
      if (error?.code === ResponseCode.BALANCE_NOT_ENOUGH) {
        setErrorMessage(t('user_balance_not_enough'));
        setErrorCode(ResponseCode.BALANCE_NOT_ENOUGH);

        track('paywall_triggered', {
          module: 'database',
          type: 'insufficient_balance'
        });
      } else if (error?.code === ResponseCode.FORBIDDEN_CREATE_APP) {
        setErrorMessage(t('forbidden_create_app'));
        setErrorCode(ResponseCode.FORBIDDEN_CREATE_APP);

        track('error_occurred', {
          module: 'database',
          error_code: 'FORBIDDEN_CREATE_APP'
        });
      } else if (error?.code === ResponseCode.APP_ALREADY_EXISTS) {
        setErrorMessage(t('app_already_exists'));
        setErrorCode(ResponseCode.APP_ALREADY_EXISTS);

        track('error_occurred', {
          module: 'database',
          error_code: 'APP_ALREADY_EXISTS'
        });
      } else {
        setErrorMessage(JSON.stringify(error));

        track('error_occurred', {
          module: 'database',
          error_code: 'UNKNOWN_ERROR'
        });
      }
    }
    setIsLoading(false);
  };

  const handleBackupCheck = async (formData: DBEditType) => {
    try {
      if (isEdit) {
        const result = await getBackups();
        const allBackups = result || [];
        const backups = allBackups.filter(
          (backup: BackupItemType) => backup.dbName === formData.dbName
        );
        const inProgressBackups = backups.filter(
          (backup: BackupItemType) => backup.status.value === 'Running'
        );

        if (inProgressBackups.length > 0) {
          setPendingFormData(formData);
          onStopBackupOpen();
          return;
        }
      }

      await submitSuccess(formData);
    } catch (error) {
      console.error(error);
      toast({ title: t('backups.stop_backup_error'), status: 'error' });
    }
  };

  const submitError = (err: FieldErrors<DBEditType>) => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return t('submit_error');
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };
    toast({
      title: deepSearch(err),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  };

  useQuery(
    ['init'],
    () => {
      if (!dbName) {
        setYamlList([
          {
            filename: 'cluster.yaml',
            value: json2CreateCluster(defaultEdit)
          },
          {
            filename: 'account.yaml',
            value: json2Account(defaultEdit)
          }
        ]);
        return null;
      }
      setIsLoading(true);
      return loadDBDetail(dbName);
    },
    {
      onSuccess(res) {
        if (!res) return;
        oldDBEditData.current = res;
        formHook.reset(adaptDBForm(res));
        setAllocatedStorage(res.storage);
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

  const handleConfirm = useCallback(() => {
    formHook.handleSubmit(
      (data) => handleBackupCheck(data),
      (err) => submitError(err)
    )();
  }, [formHook, handleBackupCheck, submitError]);

  const confirmOrSubmit = useCallback(() => {
    // Show confirmation modal when editing.
    if (isEdit) {
      setIsRestartConfirmOpen(true);
      return;
    }

    // Or submit directly (on creation).
    handleConfirm();
  }, [isEdit, handleConfirm]);

  const handleSubmit = useQuotaGuarded(
    {
      requirements: {
        cpu: resourceRequirements.cpu,
        memory: resourceRequirements.memory,
        storage: resourceRequirements.storage,
        traffic: resourceRequirements.traffic
      },
      immediate: false,
      allowContinue: false
    },
    confirmOrSubmit
  );

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
          dbName={formHook.getValues('dbName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={handleSubmit}
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form
              formHook={formHook}
              allocatedStorage={allocatedStorage}
              pxVal={pxVal}
              cpuCores={cpu}
              exceededQuotas={exceededQuotas}
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
          errorCode={errorCode}
          onClose={() => setErrorMessage('')}
        />
      )}
      <StopBackupModal
        isOpen={isStopBackupOpen}
        onClose={onStopBackupClose}
        onConfirm={async () => {
          if (pendingFormData) {
            onStopBackupClose();
            setIsLoading(true);
            try {
              const result = await getBackups();
              const allBackups = result || [];
              const backups = allBackups.filter(
                (backup: BackupItemType) => backup.dbName === pendingFormData.dbName
              );
              const inProgressBackups = backups.filter(
                (backup: BackupItemType) => backup.status.value === 'Running'
              );

              if (inProgressBackups.length > 0) {
                await Promise.all(
                  inProgressBackups.map(async (backup: BackupItemType) => {
                    await deleteBackup(backup.name);
                  })
                );
                toast({ title: t('backups.stop_backup_success'), status: 'success' });
              }

              // Proceed with submission after stopping backups
              await submitSuccess(pendingFormData);
            } catch (error) {
              console.error(error);
              toast({ title: t('backups.stop_backup_error'), status: 'error' });
            } finally {
              setIsLoading(false);
            }
          }
        }}
        onCancel={onStopBackupClose}
        dbName={pendingFormData?.dbName || ''}
      />

      <Modal isOpen={isRestartConfirmOpen} onClose={() => setIsRestartConfirmOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display={'flex'} alignItems={'center'} bg={'#fff'} borderBottom={'none'}>
            <MyIcon color={'#CA8A04'} widths={'16px'} height={'16px'} name="warning"></MyIcon>
            <Box ml={3} fontSize={'xl'}>
              {t('prompt')}
            </Box>
          </ModalHeader>
          <ModalCloseButton fontSize={'16px'} />
          <ModalBody maxH={'50vh'} overflow={'auto'} whiteSpace={'pre-wrap'}>
            {t('confirm_config_change_restart')}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                setIsRestartConfirmOpen(false);
              }}
              variant={'outline'}
            >
              {t('Cancel')}
            </Button>
            <Button ml={'12px'} onClick={handleConfirm}>
              {t('confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EditApp;

export async function getServerSideProps(context: any) {
  const dbName = context?.query?.name || '';
  const tabType = context?.query?.type || 'form';

  return {
    props: { ...(await serviceSideProps(context)), dbName, tabType }
  };
}
