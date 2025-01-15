import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, useTheme, Flex, Divider } from '@chakra-ui/react';

import { useAppStore } from '@/store/app';
import { useToast } from '@/hooks/useToast';
import { serviceSideProps } from '@/utils/i18n';
import DetailLayout from '@/components/layouts/DetailLayout';

import { Header } from '@/components/app/detail/logs/Header';
import { Filter } from '@/components/app/detail/logs/Filter';
import { LogTable } from '@/components/app/detail/logs/LogTable';
import { LogCounts } from '@/components/app/detail/logs/LogCounts';
import { useEffect, useState } from 'react';
import { ListItem } from '@/components/AdvancedSelect';
import useDateTimeStore from '@/store/date';

export default function LogsPage({ appName }: { appName: string }) {
  const theme = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { appDetail, appDetailPods } = useAppStore();
  const [podList, setPodList] = useState<ListItem[]>([]);
  const [containerList, setContainerList] = useState<ListItem[]>([]);
  const { refreshInterval } = useDateTimeStore();

  useEffect(() => {
    if (appDetailPods?.length > 0 && podList.length === 0) {
      setPodList(
        appDetailPods.map((pod) => ({
          value: pod.podName,
          label: pod.podName,
          checked: true
        }))
      );
      setContainerList(
        appDetailPods
          .flatMap((pod) => pod.spec?.containers || [])
          .map((container) => ({
            value: container.name,
            label: container.name
          }))
      );
    }
  }, [appDetailPods, podList]);

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

  const refetchData = () => {};

  return (
    <DetailLayout appName={appName}>
      <Box flex={1} borderRadius="lg" overflowY={'auto'}>
        <>
          <Flex
            mb={4}
            bg={'white'}
            gap={'12px'}
            flexDir={'column'}
            border={theme.borders.base}
            borderRadius={'lg'}
          >
            <Header
              podList={podList}
              setPodList={setPodList}
              refetchData={refetchData}
              containerList={containerList}
              setContainerList={setContainerList}
            />
            <Divider />
            <Filter />
          </Flex>
          <Box
            mb={4}
            p={4}
            bg={'white'}
            border={theme.borders.base}
            borderRadius={'lg'}
            flexShrink={0}
            minH={'257px'}
          >
            <LogCounts />
          </Box>
          <Box
            bg={'white'}
            p={4}
            border={theme.borders.base}
            borderRadius={'lg'}
            flex={1}
            minH={'400px'}
          >
            <LogTable />
          </Box>
        </>
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
