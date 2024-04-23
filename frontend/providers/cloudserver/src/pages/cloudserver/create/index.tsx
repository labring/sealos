import { createCloudServer, getCloudServerPrice } from '@/api/cloudserver';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { CloudServerType, EditForm } from '@/types/cloudserver';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import ErrorModal from './components/ErrorModal';
import Form from './components/Form';
import Header from './components/Header';

export default function EditOrder() {
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useTranslation();
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { lastRoute } = useGlobalStore();
  const [instanceType, setInstanceType] = useState<CloudServerType>();

  const { openConfirm, ConfirmChild } = useConfirm({
    content: t('Are you sure to create a cloud host?')
  });

  // form
  const formHook = useForm<EditForm>({
    defaultValues: {
      system: 'ubuntu',
      systemDiskSize: 50,
      publicIpAssigned: false,
      internetMaxBandWidthOut: 1,
      storages: [
        {
          use: 'SystemDisk',
          size: 50,
          amount: 1
        }
      ],
      virtualMachinePackageFamily: 'A',
      systemImageId: ''
    }
  });

  // watch form change, compute new yaml
  formHook.watch((data: any) => {
    setForceUpdate(!forceUpdate);
  });

  const { data: prices } = useQuery(['getCloudServerPrice', forceUpdate], () => {
    const temp = formHook.getValues();
    return getCloudServerPrice(temp);
  });

  const submitSuccess = async (data: EditForm) => {
    setIsLoading(true);
    try {
      console.log(data);
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
        instanceType={instanceType}
        prices={prices}
        title="New Server"
        applyCb={() =>
          formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
        }
        applyBtnText="Submit"
      />
      <Flex h={'calc(100% - 126px)'} justifyContent={'center'} borderRadius={'4px'}>
        <Form formHook={formHook} refresh={forceUpdate} setInstanceType={setInstanceType} />
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
