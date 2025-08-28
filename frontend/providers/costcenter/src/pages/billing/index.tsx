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
import useAppTypeStore from '@/stores/appType';

import { Region } from '@/types/region';
import { ApiResp, AppOverviewBilling, APPBillingItem } from '@/types';
import useOverviewStore from '@/stores/overview';

function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getRegion } = useBillingStore();
  const { getAppType: getAppTypeString } = useAppTypeStore();
  const { startTime, endTime } = useOverviewStore();

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // App billing drawer states
  const [appBillingPage, setAppBillingPage] = useState(1);
  const [appBillingTotalPage, setAppBillingTotalPage] = useState(1);
  const [appBillingTotalItem, setAppBillingTotalItem] = useState(0);
  const [appBillingPageSize] = useState(10);

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
    return {
      endTime,
      startTime,
      regionUid: currentRegionUid,
      // Not supports filtering apps for now.
      appType: '',
      appName: '',
      namespace: selectedWorkspace || '', // selectedWorkspace is now the namespace ID directly
      page,
      pageSize
    };
  }, [endTime, startTime, currentRegionUid, selectedWorkspace, page, pageSize]);

  const { data: appOverviewData, refetch: refetchAppOverview } = useQuery({
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
      const { totalPage } = data.data;
      if (totalPage < page) {
        setPage(1);
      }
    },
    keepPreviousData: false,
    queryKey: ['appOverviewBilling', appOverviewQueryBody, page, pageSize],
    enabled: !!currentRegionUid && !!selectedRegion
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
    // Store namespace ID directly without workspace_ prefix for simpler usage
    namespaces.forEach(([namespaceId, namespaceName]) => {
      result.push({
        id: namespaceId, // Store namespace ID directly
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
    } else {
      // Trigger refetch when region is selected
      setTimeout(() => {
        refetchAppOverview();
      }, 0);
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
    if (!selectedRegion) {
      return [];
    }

    const overviews = appOverviewData?.data?.overviews || [];
    return overviews.map((overview) => ({
      appName: overview.appName,
      // Use the string appType ID directly (e.g., "DB") for both display and API
      appType: getAppTypeString(overview.appType.toString()),
      cost: overview.amount / 100000, // Convert from micro units to dollars
      avatarFallback: overview.appName?.charAt(0).toUpperCase() || 'A',
      // Store the namespace for this specific app
      namespace: overview.namespace
    }));
  }, [appOverviewData, selectedRegion, getAppTypeString]);

  // ! ========================================================================== Mock subscription data (keeping this as subscription data is not available in app overview)
  const subscriptionData: SubscriptionData[] = Array.from({ length: 3 }, () => ({
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
      const workspace = namespaces.find(([id]) => id === selectedWorkspace);
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

  // App billing query for drawer
  const appBillingQueryBody = useMemo(() => {
    if (!selectedApp) return null;

    return {
      endTime,
      startTime,
      regionUid: currentRegionUid,
      appType: selectedApp.appType, // Use the string appType ID (e.g., "DB")
      appName: selectedApp.appName,
      namespace: selectedApp.namespace || '', // Use the app's specific namespace
      page: appBillingPage,
      pageSize: appBillingPageSize
    };
  }, [selectedApp, endTime, startTime, currentRegionUid, appBillingPage, appBillingPageSize]);

  const { data: appBillingData } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          costs: APPBillingItem[];
          current_page: number;
          total_pages: number;
          total_records: number;
        }>
      >('/api/billing/appBilling', appBillingQueryBody);
    },
    onSuccess(data) {
      if (!data.data) {
        return;
      }
      const { total_records: total, total_pages: totalPage } = data.data;
      if (totalPage === 0) {
        setAppBillingTotalPage(1);
        setAppBillingTotalItem(1);
      } else {
        setAppBillingTotalItem(total);
        setAppBillingTotalPage(totalPage);
      }
      if (totalPage < appBillingPage) {
        setAppBillingPage(1);
      }
    },
    keepPreviousData: true,
    queryKey: ['appBillingDrawer', appBillingQueryBody, appBillingPage, appBillingPageSize],
    enabled: !!appBillingQueryBody
  });

  // Transform app billing data to PAYGBillingDetail format
  const appBillingDetails = useMemo(() => {
    if (!appBillingData?.data?.costs) return [];

    return appBillingData.data.costs.map((item): any => ({
      appName: item.app_name,
      // Convert appType number to string using the store
      appType: getAppTypeString(item.app_type.toString()),
      time: new Date(item.time),
      orderId: item.order_id,
      namespace: item.namespace,
      amount: item.amount,
      usage: {
        // Map from used and used_amount arrays based on resource type indices
        // 0: cpu, 1: memory, 2: storage, 3: network, 4: port, 5: gpu
        cpu: item.used['0'] ? { amount: item.used['0'], cost: item.used_amount['0'] } : undefined,
        memory: item.used['1']
          ? { amount: item.used['1'], cost: item.used_amount['1'] }
          : undefined,
        storage: item.used['2']
          ? { amount: item.used['2'], cost: item.used_amount['2'] }
          : undefined,
        network: item.used['3']
          ? { amount: item.used['3'], cost: item.used_amount['3'] }
          : undefined,
        port: item.used['4'] ? { amount: item.used['4'], cost: item.used_amount['4'] } : undefined,
        gpu: item.used['5'] ? { amount: item.used['5'], cost: item.used_amount['5'] } : undefined
      }
    }));
  }, [appBillingData, getAppTypeString]);

  const handleUsageClick = (item: PAYGData) => {
    setSelectedApp(item);
    setAppBillingPage(1); // Reset pagination when opening drawer
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
                {paygData.length > 0 && selectedRegion && (
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
              namespace={selectedApp?.namespace || ''}
              hasSubApps={false}
              data={appBillingDetails}
              appName={selectedApp?.appName || 'Unknown App'}
              appIcon={selectedApp?.avatarFallback ?? 'A'}
              region={currentRegionName || 'Unknown Region'}
              currentPage={appBillingPage}
              totalPages={appBillingTotalPage}
              pageSize={appBillingPageSize}
              totalCount={appBillingTotalItem}
              onPageChange={setAppBillingPage}
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
