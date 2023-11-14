import { Box, Flex } from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Authority, FormSchema, QueryKey, bucketConfigQueryParam } from '@/consts';
import { inAuthority } from '@/utils/tools';
import ConfigHeader from '@/components/buckConfig/ConfigHeader';
import ConfigMain from '@/components/buckConfig/Configmain';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBucket } from '@/api/bucket';
import { useRouter } from 'next/router';
import { useToast } from '@/hooks/useToast';
const EditApp = ({ bucketName, bucketPolicy }: bucketConfigQueryParam) => {
  const methods = useForm<FormSchema>({
    defaultValues: {
      bucketAuthority: bucketPolicy,
      bucketName
    }
  });
  const { toast } = useToast();
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: createBucket,
    onSuccess(data) {
      client.invalidateQueries([QueryKey.bucketList]);
      client.invalidateQueries([QueryKey.bucketUser]);
      client.invalidateQueries([QueryKey.bucketInfo]);
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
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit((data) => {
          mutation.mutate({
            bucketName: data.bucketName,
            bucketPolicy: data.bucketAuthority
          });
        })}
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
  );
};

export default EditApp;
export async function getServerSideProps(context: any) {
  const query = context.query as bucketConfigQueryParam;
  const bucketName = (query.bucketName || '') as string;
  const bucketPolicy = inAuthority(query.bucketPolicy) ? query.bucketPolicy : Authority.private;
  return {
    props: {
      ...(await serverSideTranslations(context.locale, ['common', 'tools', 'bucket'], null, [
        'zh',
        'en'
      ])),
      bucketName,
      bucketPolicy
    }
  };
}
