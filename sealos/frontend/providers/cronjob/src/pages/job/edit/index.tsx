import { applyYamlList } from '@/api/job';
import { editModeMap } from '@/constants/editApp';
import { DefaultJobEditValue } from '@/constants/job';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { useJobStore } from '@/store/job';
import type { YamlItemType } from '@/types';
import { CronJobEditType } from '@/types/job';
import { serviceSideProps } from '@/utils/i18n';
import { json2CronJob } from '@/utils/json2Yaml';
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

const ErrorModal = dynamic(() => import('./components/ErrorModal'));

const defaultEdit: CronJobEditType = {
  ...DefaultJobEditValue
};

const formData2Yamls = (data: CronJobEditType) => [
  {
    filename: 'cronjob.yaml',
    value: json2CronJob(data)
  }
];

const EditApp = ({ jobName, tabType }: { jobName?: string; tabType?: 'form' | 'yaml' }) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const { loadJobDetail } = useJobStore();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!jobName);
  const isEdit = useMemo(() => !!jobName, [jobName]);

  const { openConfirm, ConfirmChild } = useConfirm({
    content: t(applyMessage)
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
  const formHook = useForm<CronJobEditType>({
    defaultValues: defaultEdit
  });
  const realTimeForm = useRef(defaultEdit);

  // watch form change, compute new yaml
  formHook.watch((data) => {
    if (!data) return;
    realTimeForm.current = data as CronJobEditType;
    setForceUpdate(!forceUpdate);
  });

  const submitSuccess = useCallback(async () => {
    setIsLoading(true);
    try {
      const yamlList = formData2Yamls(realTimeForm.current);
      setYamlList(yamlList);
      const data = yamlList.map((item) => item.value);
      await applyYamlList(data, isEdit ? 'replace' : 'create');
      toast({
        title: t(applySuccess),
        status: 'success'
      });
      router.push('/jobs');
    } catch (error) {
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  }, [applySuccess, isEdit, setIsLoading, t, toast, yamlList]);

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
    ['initJobDetail'],
    () => {
      if (!jobName) {
        setYamlList([
          {
            filename: 'cronjob.yaml',
            value: json2CronJob(defaultEdit)
          }
        ]);
        return null;
      }
      setIsLoading(true);
      return loadJobDetail(jobName);
    },
    {
      onSuccess(res) {
        if (!res) return;
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
        minW={'1024px'}
        flexDirection={'column'}
        alignItems={'center'}
        h={'100%'}
        bg={'#F3F4F5'}
      >
        <Header
          name={formHook.getValues('jobName')}
          title={title}
          yamlList={yamlList}
          applyBtnText={applyBtnText}
          applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form formHook={formHook} />
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
  const jobName = context?.query?.name || '';
  const tabType = context?.query?.type || 'form';

  return {
    props: { ...(await serviceSideProps(context)), jobName, tabType }
  };
}
