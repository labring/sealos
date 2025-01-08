// pages/app/detail/monitor.tsx
import { Box } from '@chakra-ui/react';
import DetailLayout from '@/components/Sidebar/layout';
import { serviceSideProps } from '@/utils/i18n';
import { useAppStore } from '@/store/app';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export default function MonitorPage({ appName }: { appName: string }) {
  const { toast } = useToast();
  const { appDetail } = useAppStore();

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
    <DetailLayout appName={appName}>
      <Box flex={1} bg="white" borderRadius="lg" p={4}>
        Monitor Page Content
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
