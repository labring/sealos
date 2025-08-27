import { Box, Flex, Tab, TabList, TabPanels, Tabs as ChakraTabs } from '@chakra-ui/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import RechargeTabPanel from '@/components/billing/RechargeTabPanel';
import InOutTabPanel from '@/components/billing/InOutTabPanel';
import TransferTabPanel from '@/components/billing/TransferTabPnel';
import { Refresh } from '@/components/Refresh';
import { useQueryClient } from '@tanstack/react-query';
import { Trend as OverviewTrend } from '@/components/cost_overview/trend';
import { TrendBar as TrendOverviewBar } from '@/components/cost_overview/trendBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { CostTree, type BillingNode } from '@/components/billing/CostTree';
import { CostPanel } from '@/components/billing/CostPanel';
import {
  SubscriptionCostTable,
  type SubscriptionData
} from '@/components/billing/SubscriptionCostTable';
import { PAYGCostTable, type PAYGData } from '@/components/billing/PAYGCostTable';
import { PAYGAppBillingDrawer } from '@/components/billing/PAYGAppBillingDrawer';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';

import { Region } from '@/types/region';
import { ApiResp, AppOverviewBilling } from '@/types';
import useOverviewStore from '@/stores/overview';

function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getRegion, getAppName, getAppType, getNamespace } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Query regions
  const { data: regionData } = useQuery({
    queryFn: () => request<any, ApiResp<Region[]>>('/api/getRegions'),
    queryKey: ['regionList', 'menu']
  });

  // Get current region UID for namespace query
  const currentRegionUid = useMemo(() => {
    if (selectedRegion) {
      // Extract region UID from selectedRegion (format: "region_<uid>")
      return selectedRegion.replace('region_', '');
    }
    // Fallback to store region
    return getRegion()?.uid || '';
  }, [selectedRegion, getRegion]);

  const queryBody = {
    startTime,
    endTime,
    regionUid: currentRegionUid
  };

  // Query namespaces - only when we have a region selected
  const { data: nsListData } = useQuery({
    queryFn: () => request.post('/api/billing/getNamespaceList', queryBody),
    queryKey: ['nsList', 'menu', queryBody],
    enabled: !!currentRegionUid
  });

  // Query app overview billing data for the selected workspace
  const appOverviewQueryBody = useMemo(() => {
    const namespace = selectedWorkspace ? selectedWorkspace.replace('workspace_', '') : '';
    return {
      endTime,
      startTime,
      regionUid: currentRegionUid,
      appType: getAppType(),
      appName: getAppName(),
      namespace,
      page,
      pageSize
    };
  }, [
    endTime,
    startTime,
    currentRegionUid,
    selectedWorkspace,
    getAppType,
    getAppName,
    page,
    pageSize
  ]);

  const {
    data: appOverviewData,
    isFetching: isAppOverviewFetching,
    refetch: refetchAppOverview
  } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          overviews: AppOverviewBilling[];
          total: number;
          totalPage: number;
        }>
      >('/api/billing/appOverview', appOverviewQueryBody);
    },
    onSuccess(data) {
      if (!data.data) {
        return;
      }
      const { total, totalPage } = data.data;
      if (totalPage === 0) {
        setTotalPage(1);
        setTotalItem(1);
      } else {
        setTotalItem(total);
        setTotalPage(totalPage);
      }
      if (totalPage < page) {
        setPage(1);
      }
    },
    keepPreviousData: false,
    queryKey: ['appOverviewBilling', appOverviewQueryBody, page, pageSize],
    enabled: !!currentRegionUid && !!selectedWorkspace && !!appOverviewQueryBody.namespace
  });

  // Reset pagination on search change
  useEffect(() => {
    setPage(1);
  }, [selectedRegion, selectedWorkspace, endTime, startTime]);

  // Transform data to BillingNode format
  const nodes: BillingNode[] = useMemo(() => {
    const regions = regionData?.data || [];
    const namespaces = (nsListData?.data || []) as [string, string][];

    const result: BillingNode[] = [];

    // Add total cost node
    result.push({
      id: 'total_cost',
      name: 'Total Cost',
      cost: 0,
      type: 'total',
      dependsOn: null
    });

    // Add region nodes
    regions.forEach((region) => {
      result.push({
        id: `region_${region.uid}`,
        name: region.name.en, // Use English name, could be made dynamic based on locale
        cost: 0, // Calculate from workspaces in this region
        type: 'region',
        dependsOn: 'total_cost'
      });
    });

    // Add workspace nodes - namespaces are [id, name] tuples
    // Since we're querying with a specific regionUid, all returned namespaces belong to that region
    namespaces.forEach(([namespaceId, namespaceName]) => {
      result.push({
        id: `workspace_${namespaceId}`,
        name: namespaceName,
        cost: 0, // Will be updated with actual cost data
        type: 'workspace',
        dependsOn: selectedRegion || `region_${currentRegionUid}`
      });
    });

    return result;
  }, [regionData, nsListData, selectedRegion, currentRegionUid]);

  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegion(regionId);
    setPage(1);
    setSelectedApp(null);
    if (!regionId) {
      setSelectedWorkspace(null);
    }
  };

  const handleWorkspaceSelect = (workspaceId: string | null) => {
    setSelectedWorkspace(workspaceId);
    setPage(1);
    setSelectedApp(null);

    // Trigger refetch on workspace selection
    if (workspaceId && currentRegionUid) {
      setTimeout(() => {
        refetchAppOverview();
      }, 0);
    }
  };

  // Transform app overview data to PAYGData format
  const paygData: PAYGData[] = useMemo(() => {
    if (!selectedWorkspace) {
      return [];
    }

    const overviews = appOverviewData?.data?.overviews || [];
    return overviews.map((overview) => ({
      appName: overview.appName,
      // ! ================================================= I can't find where to convert appType to actual string.
      appType: overview.appType.toString(),
      cost: overview.amount / 100000, // Convert from micro units to dollars
      avatarFallback: overview.appName?.charAt(0).toUpperCase() || 'A'
    }));
  }, [appOverviewData, selectedWorkspace]);

  // Mock subscription data (keeping this as subscription data is not available in app overview)
  const subscriptionData: SubscriptionData[] = Array.from({ length: 3 }, (_, i) => ({
    time: '2024-12-14 16:00',
    plan: 'STARTER',
    cost: 5
  }));

  // Calculate total cost from PAYG data
  // ! ================================= Subscription data is missing for now, so calc from PAYG data only.
  const totalCost = useMemo(() => {
    return paygData.reduce((sum, item) => sum + item.cost, 0);
  }, [paygData]);

  // Get current region and workspace names for display
  const currentRegionName = useMemo(() => {
    if (selectedRegion) {
      const region = (regionData?.data || []).find((r) => `region_${r.uid}` === selectedRegion);
      return region?.name.en;
    }
    return null; // No region selected
  }, [selectedRegion, regionData]);

  const currentWorkspaceName = useMemo(() => {
    if (selectedWorkspace) {
      const namespaces = (nsListData?.data || []) as [string, string][];
      const workspace = namespaces.find(([id]) => `workspace_${id}` === selectedWorkspace);
      return workspace?.[1];
    }
    return null; // No workspace selected
  }, [selectedWorkspace, nsListData]);

  // Display title logic
  const displayTitle = useMemo(() => {
    if (!selectedRegion && !selectedWorkspace) {
      return 'Total Cost';
    }
    if (selectedRegion && !selectedWorkspace) {
      return `${currentRegionName} Cost`;
    }
    if (selectedRegion && selectedWorkspace) {
      return `${currentRegionName} / ${currentWorkspaceName} Cost`;
    }
    return 'Total Cost';
  }, [selectedRegion, selectedWorkspace, currentRegionName, currentWorkspaceName]);

  const [selectedApp, setSelectedApp] = useState<PAYGData | null>(null);

  const handleUsageClick = (item: PAYGData) => {
    setSelectedApp(item);
    setDetailsDrawerOpen(true);
  };

  return (
    <>
      <Tabs defaultValue="listing" className="h-[calc(100vh-60px)]">
        <TabsList variant="underline" className="w-fit">
          <TabsTrigger variant="cleanUnderline" value="listing">
            Billing
          </TabsTrigger>
          <TabsTrigger variant="cleanUnderline" value="trends">
            Cost & Revenue Trends
          </TabsTrigger>
          <TabsTrigger variant="cleanUnderline" value="legacy">
            Legacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="h-full overflow-hidden">
          <div className="flex flex-col h-full border rounded-2xl overflow-hidden">
            <div className="border-b bg-white px-6 py-3">
              <DateRangePicker className="w-fit" />
            </div>

            <CostTree
              nodes={nodes}
              selectedRegion={selectedRegion}
              selectedWorkspace={selectedWorkspace}
              onRegionSelect={handleRegionSelect}
              onWorkspaceSelect={handleWorkspaceSelect}
            >
              <CostPanel displayTitle={displayTitle} totalCost={totalCost}>
                <SubscriptionCostTable data={subscriptionData} />
                {paygData.length > 0 && (
                  <PAYGCostTable
                    data={paygData}
                    timeRange={`${new Date(startTime).toLocaleDateString()} – ${new Date(
                      endTime
                    ).toLocaleDateString()}`}
                    onUsageClick={handleUsageClick}
                  />
                )}
              </CostPanel>
            </CostTree>

            <PAYGAppBillingDrawer
              open={detailsDrawerOpen}
              onOpenChange={setDetailsDrawerOpen}
              appType={selectedApp?.appType || ''}
              namespace={selectedWorkspace ? selectedWorkspace.replace('workspace_', '') : ''}
              hasSubApps={false}
              data={[
                {
                  appName: 'App Name',
                  appType: 'applaunchpad',
                  time: new Date('2025-08-27T15:00:00'),
                  orderId: 'order-123',
                  namespace: 'default',
                  amount: 1200000,
                  usage: {
                    cpu: { amount: 1600, cost: 200000 },
                    memory: { amount: 1600, cost: 200000 },
                    storage: { amount: 1600, cost: 200000 },
                    network: { amount: 1600, cost: 200000 },
                    port: { amount: 2, cost: 200000 },
                    gpu: { amount: 2, cost: 200000 }
                  }
                },
                {
                  appName: 'App Name 2',
                  appType: 'devbox',
                  time: new Date('2025-08-27T15:00:00'),
                  orderId: 'order-124',
                  namespace: 'default',
                  amount: 600000,
                  usage: {
                    cpu: { amount: 800, cost: 100000 },
                    memory: { amount: 800, cost: 100000 }
                  }
                }
              ]}
              appName={selectedApp?.appName || 'Unknown App'}
              appIcon={selectedApp?.avatarFallback ?? 'A'}
              region={currentRegionName || 'Unknown Region'}
              currentPage={1}
              totalPages={1}
              pageSize={1}
              totalCount={1}
              onPageChange={() => {}}
              onOpenApp={() => {
                // Handle open app logic
                console.log('Open app:', selectedApp?.appName);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="flex flex-col gap-4 overflow-auto">
          <OverviewTrend />
          <TrendOverviewBar />
        </TabsContent>

        <TabsContent value="legacy">
          <Box w="100%" h="100%" p="8px" overflow={'auto'}>
            <Flex
              flexDirection="column"
              h={'full'}
              bg={'white'}
              px="24px"
              py="20px"
              borderRadius={'8px'}
            >
              <ChakraTabs flex={1} display={'flex'} flexDir={'column'} variant={'primary'}>
                <TabList>
                  <Tab>{t('Expenditure')}</Tab>
                  <Tab>{t('Charge')}</Tab>
                  <Tab>{t('Transfer')}</Tab>
                  <Refresh
                    boxSize={'32px'}
                    onRefresh={() => {
                      return queryClient.invalidateQueries();
                    }}
                    ml="auto"
                  />
                </TabList>
                <TabPanels mt="12px" flexDirection={'column'} flex={'1'} display={'flex'}>
                  <InOutTabPanel />
                  <RechargeTabPanel />
                  <TransferTabPanel />
                </TabPanels>
              </ChakraTabs>
            </Flex>
          </Box>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default Billing;

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}
