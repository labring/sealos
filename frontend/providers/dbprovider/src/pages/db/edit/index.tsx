import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box } from '@chakra-ui/react';
import type { YamlItemType } from '@/types';
import { json2CreateCluster, json2Account, limitRangeYaml } from '@/utils/json2Yaml';
import { useForm } from 'react-hook-form';
import { editModeMap } from '@/constants/editApp';
import { defaultDBEditValue } from '@/constants/db';
import debounce from 'lodash/debounce';
import { applyYamlList } from '@/api/db';
import { useConfirm } from '@/hooks/useConfirm';
import type { DBEditType } from '@/types/db';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useLoading } from '@/hooks/useLoading';
import dynamic from 'next/dynamic';
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { useTranslation } from 'next-i18next';
import { adaptDBForm } from '@/utils/adapt';
import Header from './components/Header';
import Form from './components/Form';
import Yaml from './components/Yaml';
const ErrorModal = dynamic(() => import('./components/ErrorModal'));

const EditApp = ({ dbName, tabType }: { dbName?: string; tabType?: 'form' | 'yaml' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minStorage, setMinStorage] = useState(1);
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const { loadDBDetail } = useDBStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!dbName);
  const { openConfirm, ConfirmChild } = useConfirm({
    content: t(applyMessage)
  });
  const isEdit = useMemo(() => !!dbName, [dbName]);

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
  const formHook = useForm<DBEditType>({
    defaultValues: defaultDBEditValue
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: DBEditType) => {
      try {
        setYamlList([
          {
            filename: 'cluster.yaml',
            value: json2CreateCluster(data)
          },
          ...(isEdit
            ? []
            : [
                {
                  filename: 'account.yaml',
                  value: json2Account(data)
                }
              ])
        ]);
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

  const submitSuccess = useCallback(async () => {
    setIsLoading(true);
    try {
      !isEdit && (await applyYamlList([limitRangeYaml], 'create'));
    } catch (err) {}
    try {
      const data = yamlList.map((item) => item.value);

      await applyYamlList(data, isEdit ? 'replace' : 'create');

      toast({
        title: t(applySuccess),
        status: 'success'
      });
      router.replace(`/db/detail?name=${formHook.getValues('dbName')}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  }, [applySuccess, formHook, isEdit, router, setIsLoading, t, toast, yamlList]);
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
      if (!dbName) {
        setYamlList([
          {
            filename: 'cluster.yaml',
            value: json2CreateCluster(defaultDBEditValue)
          },
          {
            filename: 'account.yaml',
            value: json2Account(defaultDBEditValue)
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
        bg={'#F3F4F5'}
      >
        <Header
          dbName={formHook.getValues('dbName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
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
