import { adapterMongoHaConfig, applyYamlList, createDB } from '@/api/db';
import { defaultDBEditValue } from '@/constants/db';
import { editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useDBStore } from '@/store/db';
import { useGlobalStore } from '@/store/global';
import { DBVersionMap } from '@/store/static';
import { useUserStore } from '@/store/user';
import type { YamlItemType } from '@/types';
import type { DBEditType } from '@/types/db';
import { adaptDBForm } from '@/utils/adapt';
import { serviceSideProps } from '@/utils/i18n';
import { json2Account, json2CreateCluster, limitRangeYaml } from '@/utils/json2Yaml';
import { Box, Flex } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import Header from './components/Header';
import Yaml from './components/Yaml';

const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const defaultEdit = {
  ...defaultDBEditValue,
  dbVersion: DBVersionMap.postgresql[0]?.id
};

const EditApp = ({ dbName, tabType }: { dbName?: string; tabType?: 'form' | 'yaml' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minStorage, setMinStorage] = useState(1);
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const { loadDBDetail, dbDetail } = useDBStore();
  const oldDBEditData = useRef<DBEditType>();
  const { checkQuotaAllow } = useUserStore();

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: DBEditType) => {
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
    data && formOnchangeDebounce(data as DBEditType);
    setForceUpdate(!forceUpdate);
  });

  const submitSuccess = async (formData: DBEditType) => {
    const needMongoAdapter =
      formData.dbType === 'mongodb' && formData.replicas !== oldDBEditData.current?.replicas;
    setIsLoading(true);
    try {
      !isEdit && (await applyYamlList([limitRangeYaml], 'create'));
      needMongoAdapter && (await adapterMongoHaConfig({ name: formData.dbName }));
    } catch (err) {}
    try {
      // quote check
      const quoteCheckRes = checkQuotaAllow(formData, oldDBEditData.current);
      if (quoteCheckRes) {
        setIsLoading(false);
        return toast({
          status: 'warning',
          title: t(quoteCheckRes),
          duration: 5000,
          isClosable: true
        });
      }
      await createDB({ dbForm: formData, isEdit });
      toast({
        title: t(applySuccess),
        status: 'success'
      });
      router.push(lastRoute);
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return t('submit_error');
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
        setMinStorage(res.storage);
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
        backgroundColor={'grayModern.100'}
      >
        <Header
          dbName={formHook.getValues('dbName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() =>
            formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
          }
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form formHook={formHook} minStorage={minStorage} pxVal={pxVal} />
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

export default EditApp;

export async function getServerSideProps(context: any) {
  const dbName = context?.query?.name || '';
  const tabType = context?.query?.type || 'form';

  return {
    props: { ...(await serviceSideProps(context)), dbName, tabType }
  };
}
