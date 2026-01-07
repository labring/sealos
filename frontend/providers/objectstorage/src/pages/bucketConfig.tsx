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
import { useTranslation } from 'next-i18next';

const EditApp = ({ bucketName, bucketPolicy }: bucketConfigQueryParam) => {
  const methods = useForm<FormSchema>({
    defaultValues: {
      bucketAuthority: bucketPolicy,
      bucketName
    }
  });
  const toast = useToast();
  const client = useQueryClient();
  const router = useRouter();
  const { session } = useSessionStore();
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
      toast({
        title: 'apply successfully',
        status: 'success'
      });
      router.replace('/');
    },
    onError(data: { message: string }) {
      toast({
        title: data.message,
        status: 'error'
      });
    }
  });

  const submitForm = () => {
    methods.handleSubmit(
      (data) => {
        mutation.mutateAsync({
          bucketName: data.bucketName,
          bucketPolicy: data.bucketAuthority
        });
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

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <ConfigHeader />

          <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
            <ConfigMain />
          </Box>
        </form>
      </FormProvider>
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
