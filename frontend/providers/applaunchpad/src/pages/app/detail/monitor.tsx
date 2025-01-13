import DetailLayout from '@/components/layouts/DetailLayout';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Monitor/Header';

export default function MonitorPage({ appName }: { appName: string }) {
  const { toast } = useToast();
  const { appDetail, appDetailPods } = useAppStore();
  const { t } = useTranslation();

  console.log(appName, 'appName', appDetail, appDetailPods);

  const { data: monitorData } = useQuery(
    ['monitor-data', appName],
    async () => {
      return [];
    },
    {
      onError(err) {
        toast({
          title: String(err),
          status: 'error'
        });
      }
    }
  );

  return (
    <DetailLayout appName={appName} key={'monitor'}>
      <Box flex={1} bg="white" borderRadius="8px" py={'16px'} px={'24px'}>
        <Header />
      </Box>
    </DetailLayout>
  );
}

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}
