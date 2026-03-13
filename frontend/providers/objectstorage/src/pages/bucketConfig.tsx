import { Box, Flex, useToast } from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Authority, FormSchema, QueryKey, bucketConfigQueryParam } from '@/consts';
import { inAuthority } from '@/utils/tools';
import ConfigHeader from '@/components/buckConfig/ConfigHeader';
import ConfigMain from '@/components/buckConfig/Configmain';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { QueryClient, dehydrate, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBucket, listBucket } from '@/api/bucket';
import { useRouter } from 'next/router';
import useSessionStore from '@/store/session';
import { useQuotaGuarded } from '@sealos/shared';
import { useStorageOperation } from '@/hooks/useStorageOperation';
import ErrorModal from '@/components/ErrorModal';
import { useTranslation } from 'next-i18next';

const EditApp = ({ bucketName, bucketPolicy }: bucketConfigQueryParam) => {
  const methods = useForm<FormSchema>({
    defaultValues: {
      bucketAuthority: bucketPolicy,
      bucketName
    }
  });
  const client = useQueryClient();
  const router = useRouter();
  const { session } = useSessionStore();
  const { executeOperation, errorModalState, closeErrorModal } = useStorageOperation();
  const toast = useToast();
  const { t } = useTranslation(['common', 'bucket']);

  const mutation = useMutation({
    mutationFn: createBucket,
    async onSuccess(data) {
      await client.invalidateQueries({
        queryKey: [QueryKey.bucketList],
        refetchType: 'all'
      });
      await client.invalidateQueries({
        queryKey: [QueryKey.bucketUser],
        refetchType: 'all'
      });
      await client.invalidateQueries({
        queryKey: [QueryKey.bucketInfo],
        refetchType: 'all'
      });
      router.replace('/');
    }
  });

  const submitForm = () => {
    methods.handleSubmit(
      (data) => {
        executeOperation(
          () =>
            mutation.mutateAsync({
              bucketName: data.bucketName,
              bucketPolicy: data.bucketAuthority
            }),
          {
            successMessage: 'apply successfully'
          }
        );
      },
      (errors) => {
        if (errors.bucketName) {
          toast({
            title: t('bucket:bucketCreateFailed'),
            description: t('bucket:bucketNameInvalid'),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top'
          });
        }
      }
    )();
  };

  const handleSubmit = useQuotaGuarded(
    {
      requirements: {
        traffic: true
      },
      immediate: false,
      allowContinue: false
    },
    submitForm
  );

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Flex
            minW={'1024px'}
            flexDirection={'column'}
            alignItems={'center'}
            h={'100vh'}
            bg={'#F3F4F5'}
          >
            <ConfigHeader />

            <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
              <ConfigMain />
            </Box>
          </Flex>
        </form>
      </FormProvider>
      <ErrorModal
        isOpen={errorModalState.isOpen}
        onClose={closeErrorModal}
        errorCode={errorModalState.errorCode}
        errorMessage={errorModalState.errorMessage}
      />
    </>
  );
};

export default EditApp;
export async function getServerSideProps(context: any) {
  const query = context.query as bucketConfigQueryParam;
  const bucketName = (query.bucketName || '') as string;
  const bucketPolicy = inAuthority(query.bucketPolicy) ? query.bucketPolicy : Authority.private;
  const queryClient = new QueryClient();
  return {
    props: {
      ...(await serverSideTranslations(context.locale, ['common', 'tools', 'bucket'], null, [
        'zh',
        'en'
      ])),
      bucketName,
      bucketPolicy,
      dehydratedState: dehydrate(queryClient)
    }
  };
}
