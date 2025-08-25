import { createCloudServer, getCloudServerPrice } from '@/api/cloudserver';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { CloudServerType, EditForm } from '@/types/cloudserver';
import { CVMChargeType } from '@/types/region';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import ErrorModal from './components/ErrorModal';
import Form from './components/Form';
import Header, { CostTipContent } from './components/Header';
import { generateRandomPassword } from '@/utils/tools';

export default function EditOrder() {
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useTranslation();
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { lastRoute } = useGlobalStore();
  const [instanceType, setInstanceType] = useState<CloudServerType>();

  // form
  const formHook = useForm<EditForm>({
    defaultValues: {
      system: 'ubuntu',
      publicIpAssigned: false,
      internetMaxBandWidthOut: 1,
      storages: [
        {
          use: 'SystemDisk',
          size: 50,
          amount: 1
        }
      ],
      systemImageId: '',
      period: '1',
      counts: 1,
      autoPassword: true,
      password: generateRandomPassword()
      // chargeType: CVMChargeType.postPaidByHour,
      // zone: 'Guangzhou-6',
      // virtualMachineArch: 'x86_64',
      // virtualMachineType: 'costEffective',
      // virtualMachinePackageFamily: 'A'
    }
  });

  // watch form change, compute new yaml
  formHook.watch((data: any) => {
    setForceUpdate(!forceUpdate);
  });

  const { data: prices } = useQuery(
    ['getCloudServerPrice', forceUpdate],
    () => {
      const temp = formHook.getValues();
      return getCloudServerPrice(temp);
    },
    {
      enabled: !!formHook.getValues('virtualMachinePackageName')
    }
  );

  const submitSuccess = async (data: EditForm) => {
    console.log(data);
    setIsLoading(true);
    try {
      await createCloudServer(data);
      toast({
        status: 'success',
        title: 'success'
      });
      router.push(lastRoute);
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = useCallback(() => {
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

  const { openConfirm, ConfirmChild } = useConfirm({
    content: (
      <Box>
        {formHook.getValues('chargeType') === CVMChargeType.prePaid ? (
          <CostTipContent
            isMonth={formHook.getValues('chargeType') === CVMChargeType.prePaid}
            instanceType={instanceType}
            isModalTip
            prices={prices}
          />
        ) : (
          <Box>{t('Are you sure to create a cloud host?')}</Box>
        )}
      </Box>
    )
  });

  return (
    <Box
      flexDirection={'column'}
      alignItems={'center'}
      width={'100%'}
      height={'100%'}
      minW={'910px'}
      bg={'grayModern.100'}
    >
      <Header
        isMonth={formHook.getValues('chargeType') === CVMChargeType.prePaid}
        instanceType={instanceType}
        prices={prices}
        title="New Server"
        applyCb={() => {
          formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)();
          // openConfirm()();
        }}
        applyBtnText="Submit"
      />
      <Flex h={'calc(100% - 126px)'} justifyContent={'center'} borderRadius={'4px'}>
        <FormProvider {...formHook}>
          <Form refresh={forceUpdate} setInstanceType={setInstanceType} />
        </FormProvider>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={'Failed'} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </Box>
  );
}

export async function getServerSideProps(context: any) {
  return {
    props: { ...(await serviceSideProps(context)) }
  };
}
