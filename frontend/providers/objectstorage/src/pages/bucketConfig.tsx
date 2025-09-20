import { Box, Flex } from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Authority, FormSchema, QueryKey, bucketConfigQueryParam } from '@/consts';
import { inAuthority } from '@/utils/tools';
import ConfigHeader from '@/components/buckConfig/ConfigHeader';
import ConfigMain from '@/components/buckConfig/Configmain';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { QueryClient, dehydrate, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBucket, listBucket } from '@/api/bucket';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/user';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';
import { useState, useEffect } from 'react';
import useSessionStore from '@/store/session';
const EditApp = ({ bucketName, bucketPolicy }: bucketConfigQueryParam) => {
  const methods = useForm<FormSchema>({
    defaultValues: {
      bucketAuthority: bucketPolicy,
      bucketName
    }
  });
  const { toast } = useToast();
  const client = useQueryClient();
  const router = useRouter();
  const { checkExceededQuotas, loadUserQuota } = useUserStore();
  const { session } = useSessionStore();
  const [isInsufficientQuotaDialogOpen, setIsInsufficientQuotaDialogOpen] = useState(false);

  // Load user quota when session is available and has required properties
  useEffect(() => {
    if (session?.user && session?.kubeconfig) {
      loadUserQuota();
    }
  }, [session, loadUserQuota]);

  // Check quota before submission
  const exceededQuotas = checkExceededQuotas({
    traffic: session?.subscription.type === 'PAYG' ? 0 : 1
  });

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
  const handleSubmit = () => {
    if (exceededQuotas.length <= 0) {
      // No quota exceeded, proceed with submission
      methods.handleSubmit((data) => {
        mutation.mutate({
          bucketName: data.bucketName,
          bucketPolicy: data.bucketAuthority
        });
      })();
    } else {
      // Quota exceeded, show dialog
      setIsInsufficientQuotaDialogOpen(true);
    }
  };

  return (
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
      <InsufficientQuotaDialog
        items={exceededQuotas}
        onOpenChange={setIsInsufficientQuotaDialogOpen}
        open={isInsufficientQuotaDialogOpen}
        onConfirm={() => {}}
        showControls={false}
      />
    </FormProvider>
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
