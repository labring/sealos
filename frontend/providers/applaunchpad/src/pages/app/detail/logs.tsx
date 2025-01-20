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
import { getAppLogs } from '@/api/app';
import { useForm } from 'react-hook-form';

export interface JsonFilterItem {
  jsonKey: string;
  jsonValue: string;
  jsonOperator: '=' | '>' | '<' | 'contains' | 'not_contains';
}

export interface LogsFormData {
  pods: ListItem[];
  containers: ListItem[];
  limit: number;
  keyword: string;
  isJsonMode: boolean;
  isOnlyStderr: boolean;
  jsonFilters: JsonFilterItem[];
  refreshInterval: number;
}

export default function LogsPage({ appName }: { appName: string }) {
  const theme = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { appDetail, appDetailPods } = useAppStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const { refreshInterval, setRefreshInterval, startDateTime, endDateTime } = useDateTimeStore();

  const formHook = useForm<LogsFormData>({
    defaultValues: {
      pods: [],
      containers: [],
      limit: 100,
      keyword: '',
      isJsonMode: false,
      isOnlyStderr: false,
      jsonFilters: [],
      refreshInterval: 0
    }
  });

  useEffect(() => {
    if (!isInitialized && appDetailPods?.length > 0) {
      const pods = appDetailPods.map((pod) => ({
        value: pod.podName,
        label: pod.podName,
        checked: true
      }));
      const containers = appDetailPods
        .flatMap((pod) => pod.spec?.containers || [])
        .map((container) => ({
          value: container.name,
          label: container.name,
          checked: true
        }))
        .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));

      formHook.setValue('pods', pods);
      formHook.setValue('containers', containers);

      setIsInitialized(true);
    }
  }, [appDetailPods, isInitialized, formHook]);

  const selectedPods = formHook.watch('pods').filter((pod) => pod.checked);
  const selectedContainers = formHook.watch('containers').filter((container) => container.checked);

  const { data: logsData } = useQuery(
    ['logs-data', appName],
    () =>
      getAppLogs({
        app: appName
      }),
    {
      refetchInterval: refreshInterval
    }
  );

  console.log(logsData, 'logsData');

  const refetchData = () => {};

  return (
    <DetailLayout appName={appName}>
      <Box flex={1} borderRadius="lg" overflowY={'auto'}>
        <>
          <Flex
            mb={'6px'}
            bg={'white'}
            gap={'12px'}
            flexDir={'column'}
            border={theme.borders.base}
            borderRadius={'lg'}
          >
            <Header formHook={formHook} />
            <Divider />
            <Filter formHook={formHook} />
          </Flex>
          <Box
            mb={'6px'}
            p={'20px 24px'}
            bg={'white'}
            border={theme.borders.base}
            borderRadius={'lg'}
            flexShrink={0}
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
