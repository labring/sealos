import { applyYamlList, getDBSecret } from '@/api/db';
import { defaultDBEditValue } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import type { YamlItemType } from '@/types';
import { DBType } from '@/types/db';
import { MigrateForm } from '@/types/migrate';
import { serviceSideProps } from '@/utils/i18n';
import { json2MigrateCR } from '@/utils/json2Yaml';
import { Box, Flex } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import Header from './components/Header';
import Yaml from './components/Yaml';

const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const defaultEdit = {
  ...defaultDBEditValue,
  sinkHost: '',
  sinkPort: '',
  sinkPassword: '',
  sinkUser: '',
  sourceHost: '',
  sourcePort: '',
  sourceUsername: '',
  sourcePassword: '',
  sourceDatabase: '',
  sourceDatabaseTable: ['All'],
  isChecked: false,
  continued: false
};

const EditApp = ({
  dbName,
  tabType,
  dbType
}: {
  dbName: string;
  dbType: DBType;
  tabType?: 'form' | 'yaml';
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const { checkQuotaAllow, balance } = useUserStore();
  const { openConfirm, ConfirmChild } = useConfirm({
    content: t('are_you_sure_to_perform_database_migration')
  });
  const { loadDBDetail } = useDBStore();
  const { screenWidth, lastRoute } = useGlobalStore();

  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2);
    if (val < 20) {
      return 20;
    }
    return val;
  }, [screenWidth]);

  // form
  const formHook = useForm<MigrateForm>({
    defaultValues: defaultEdit
  });

  const generateYamlList = (data: MigrateForm) => {
    return [
      {
        filename: 'migrate.yaml',
        value: json2MigrateCR(data)
      }
    ];
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: MigrateForm) => {
      try {
        setYamlList(generateYamlList(data));
      } catch (error) {
        console.log(error);
      }
    }, 200),
    []
  );

  // watch form change, compute new yaml
  formHook.watch((data) => {
    data && formOnchangeDebounce(data as MigrateForm);
  });

  const submitSuccess = async (formData: MigrateForm) => {
    console.log(formData);
    setIsLoading(true);
    try {
      const yamlList = generateYamlList(formData).map((item) => item.value);
      console.log(json2MigrateCR(formData));
      // quote check
      const quoteCheckRes = checkQuotaAllow(formData);
      if (quoteCheckRes) {
        setIsLoading(false);
        return toast({
          status: 'warning',
          title: t(quoteCheckRes),
          duration: 5000,
          isClosable: true
        });
      }
      await applyYamlList(yamlList, 'create');
      toast({
        title: t('migration_task_created_successfully'),
        status: 'success'
      });
      router.push({
        pathname: '/db/detail',
        query: {
          ...router.query,
          listType: 'InternetMigration'
        }
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = useCallback(() => {
    const deepSearch = (obj: any, depth: number = 2): string => {
      if (!obj || depth === 0) return t('submit_error');
      if (!!obj.message) {
        return obj.message;
      }
      const values = Object.values(obj);
      if (values.length === 0 || typeof values[0] !== 'object') {
        return t('submit_error');
      }
      return deepSearch(values[0], depth - 1);
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
    ['initMigrate'],
    () => {
      if (!dbName) {
        return null;
      }
      setIsLoading(true);
      return loadDBDetail(dbName);
    },
    {
      async onSuccess(res) {
        if (!res) return;
        const dbSecret = await getDBSecret({ dbName: res.dbName, dbType: res.dbType });
        formHook.reset((oldData) => {
          return {
            ...oldData,
            dbType: res.dbType,
            dbVersion: res.dbVersion,
            dbName: res.dbName,
            cpu: res.cpu,
            memory: res.memory,
            replicas: res.replicas,
            storage: res.storage,
            sinkHost: dbSecret.host,
            sinkPort: dbSecret.port,
            sinkUser: dbSecret.username,
            sinkPassword: dbSecret.password
          };
        });
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
        bg={'#F3F4F5'}
      >
        <Header
          dbName={dbName}
          dbType={dbType}
          title={'data_migration_config'}
          applyBtnText={'migrate_now'}
          applyCb={() =>
            formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
          }
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form formHook={formHook} pxVal={pxVal} />
          ) : (
            <Yaml yamlList={yamlList} pxVal={pxVal} />
          )}
        </Box>
      </Flex>
      <ConfirmChild />
      {!!errorMessage && (
        <ErrorModal
          title={'applyError'}
          content={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      )}
    </>
  );
};

export default EditApp;

export async function getServerSideProps(context: any) {
  const dbName = context?.query?.name || '';
  const dbType = context?.query?.dbType || '';
  const tabType = context?.query?.type || 'form';

  return {
    props: { ...(await serviceSideProps(context)), dbName, tabType, dbType }
  };
}
