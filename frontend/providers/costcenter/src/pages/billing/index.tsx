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
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRange } from 'react-day-picker';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useAppTypeStore from '@/stores/appType';
import useOverviewStore from '@/stores/overview';
import { getPaymentList } from '@/api/plan';
import { Region } from '@/types/region';
import { ApiResp, AppOverviewBilling } from '@/types';
import { BillingNode, CostTree } from '@/components/billing/CostTree';
import { PAYGCostTable } from '@/components/billing/PAYGCostTable';
import type { PAYGData } from '@/components/billing/PAYGCostTableView';
import {
  SubscriptionCostTable,
  SubscriptionData
} from '@/components/billing/SubscriptionCostTable';
import { CostPanel } from '@/components/billing/CostPanel';
import { AppBillingDrawer } from '@/components/billing/PAYGAppBillingDrawer';

/**
 * Billing page container.
 * Hosts filters, region/workspace selection, and renders cost trees and tables.
 */
function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getRegion } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Date range for the main billing view
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(startTime),
    to: new Date(endTime)
  });

  // Resolve current region UID from selection or store
  const currentRegionUid = useMemo(() => {
    if (selectedRegion) {
      // Extract region UID from selectedRegion (format: "region_<uid>")
      return selectedRegion.replace('region_', '');
    }
    // Fallback to store region
    return getRegion()?.uid || '';
  }, [selectedRegion, getRegion]);

  // Effective start/end time derived from picker or store
  const effectiveStartTime = dateRange?.from
    ? dateRange.from.toISOString()
    : new Date(startTime).toISOString();
  const effectiveEndTime = dateRange?.to
    ? dateRange.to.toISOString()
    : new Date(endTime).toISOString();

  // Query regions list
  const { data: regionData } = useQuery({
    queryFn: () => request<any, ApiResp<Region[]>>('/api/getRegions'),
    queryKey: ['regionList', 'menu']
  });

  // Query namespaces for current region
  const { data: nsListData } = useQuery({
    queryFn: () =>
      request.post('/api/billing/getNamespaceList', {
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        regionUid: currentRegionUid
      }),
    queryKey: [
      'nsList',
      'menu',
      { startTime: effectiveStartTime, endTime: effectiveEndTime, regionUid: currentRegionUid }
    ],
    enabled: !!currentRegionUid
  });

  // Query body for subscription payments (region scope)
  // We need this for calculating costs
  const paymentListQueryBody = useMemo(
    () => ({
      endTime: effectiveEndTime,
      startTime: effectiveStartTime,
      regionUid: currentRegionUid
    }),
    [effectiveEndTime, effectiveStartTime, currentRegionUid]
  );

  // ! ======================================= We need to query all regions and cache them for constructing the node tree
  const { data: paymentListData } = useQuery({
    queryFn: () => getPaymentList(paymentListQueryBody),
    queryKey: ['paymentList', paymentListQueryBody],
    enabled: !!currentRegionUid
  });

  // Query body for region-level PAYG consumption
  const regionConsumptionQueryBody = useMemo(
    () => ({
      appType: '',
      namespace: '', // empty namespace means entire region
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      regionUid: currentRegionUid,
      appName: ''
    }),
    [effectiveStartTime, effectiveEndTime, currentRegionUid]
  );

  // ! ============================================= We need to query all regions and cache them for constructing the node tree
  const { data: regionConsumptionData } = useQuery({
    queryKey: ['regionConsumption', regionConsumptionQueryBody],
    queryFn: () => {
      return request.post<{ amount: number }>(
        '/api/billing/consumption',
        regionConsumptionQueryBody
      );
    },
    enabled: !!currentRegionUid
  });

  // Build queries for workspace-level PAYG consumption
  // !=============================================== Probably do not need this later
  const workspaceConsumptionQueries = useMemo(() => {
    const namespaces = (nsListData?.data || []) as [string, string][];
    return namespaces.map(([namespaceId, namespaceName]) => ({
      namespaceId,
      namespaceName,
      queryBody: {
        appType: '',
        namespace: namespaceId,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        regionUid: currentRegionUid,
        appName: ''
      }
    }));
  }, [nsListData, effectiveStartTime, effectiveEndTime, currentRegionUid]);

  // Fetch consumption for each workspace in parallel
  const workspaceConsumptionResults = useQuery({
    queryKey: ['workspaceConsumptions', workspaceConsumptionQueries],
    queryFn: async () => {
      const results = await Promise.all(
        workspaceConsumptionQueries.map(async ({ namespaceId, queryBody }) => {
          try {
            const response = await request.post<{ amount: number }>(
              '/api/billing/consumption',
              queryBody
            );
            return { namespaceId, amount: response.data.amount };
          } catch (error) {
            console.error(`Failed to fetch consumption for namespace ${namespaceId}:`, error);
            return { namespaceId, amount: 0 };
          }
        })
      );
      return results;
    },
    enabled: !!currentRegionUid && workspaceConsumptionQueries.length > 0
  });

  const { nodes, totalCost } = useMemo(() => {
    const regions = regionData?.data || [];
    const namespaces = (nsListData?.data || []) as [string, string][];
    const paymentList = paymentListData?.data?.payments || [];
    const workspaceConsumptions = workspaceConsumptionResults?.data || [];

    // Build workspaceCosts using consumption and payments
    const workspaceCosts = [
      ...workspaceConsumptions.map((consumption) => ({
        namespace: consumption.namespaceId,
        cost: consumption.amount
      })),
      ...paymentList.map((payment) => ({
        namespace: payment.Workspace,
        cost: payment.Amount
      }))
    ].reduce<Record<string, number>>((acc, { namespace, cost }) => {
      return {
        ...acc,
        [namespace]: (acc[namespace] || 0) + cost
      };
    }, {});

    // Build regionCosts using consumption
    const regionId = `region_${currentRegionUid}`;
    const regionCost = regionConsumptionData?.data?.amount || 0;
    const regionCosts: Record<string, number> = {
      [regionId]: regionCost
    };

    // Compute total amount
    const totalCost = Object.values(regionCosts).reduce((sum, cost) => sum + cost, 0);

    // Total node
    const totalNode: BillingNode = {
      id: 'total_cost',
      name: 'Total Cost',
      cost: totalCost,
      type: 'total',
      dependsOn: null
    };

    // Region nodes
    const regionNodes: BillingNode[] = regions.map((region) => {
      const regionId = `region_${region.uid}`;
      return {
        id: regionId,
        name: region.name.en,
        cost: regionCosts[regionId] || 0,
        type: 'region',
        dependsOn: 'total_cost'
      };
    });

    // Workspace nodes
    const workspaceNodes: BillingNode[] = namespaces.map(([namespaceId, namespaceName]) => ({
      id: namespaceId,
      name: namespaceName,
      cost: workspaceCosts[namespaceId] || 0,
      type: 'workspace',
      dependsOn: selectedRegion || `region_${currentRegionUid}` || null
    }));

    // Merge nodes
    const nodes = [totalNode, ...regionNodes, ...workspaceNodes];

    return { nodes, totalCost };
  }, [
    regionData,
    nsListData,
    paymentListData,
    regionConsumptionData,
    workspaceConsumptionResults,
    selectedRegion,
    currentRegionUid
  ]);

  // Transform query results for child components
  const subscriptionData = useMemo(() => {
    // Transform subscription payments data
    const subscriptionData: SubscriptionData[] = [];
    if (paymentListData?.data?.payments) {
      paymentListData.data.payments
        .filter((data) => {
          return selectedWorkspace ? data.Workspace === selectedWorkspace : true;
        })
        .forEach((data) => {
          subscriptionData.push({
            time: data.Time,
            plan: data.PlanName,
            cost: data.Amount
          });
        });
    }

    return subscriptionData;
  }, [paymentListData, selectedWorkspace]);

  // Sync date range with store values when they change
  useEffect(() => {
    setDateRange({
      from: new Date(startTime),
      to: new Date(endTime)
    });
  }, [startTime, endTime]);

  // Reset pagination on search change
  useEffect(() => {
    setPage(1);
  }, [selectedRegion, selectedWorkspace, effectiveEndTime, effectiveStartTime]);

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
  };

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
      const workspace = (nsListData?.data || []).find(
        ([id]: [string, string]) => id === selectedWorkspace
      );
      return workspace?.[1];
    }
    return null; // No workspace selected
  }, [selectedWorkspace, nsListData]);

  const [selectedApp, setSelectedApp] = useState<any>(null);

  const handleUsageClick = (item: any) => {
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
              <DateRangePicker className="w-fit" value={dateRange} onChange={setDateRange} />
            </div>

            <CostTree
              nodes={nodes}
              selectedRegion={selectedRegion}
              selectedWorkspace={selectedWorkspace}
              onRegionSelect={handleRegionSelect}
              onWorkspaceSelect={handleWorkspaceSelect}
            >
              <CostPanel
                region={currentRegionName}
                workspace={currentWorkspaceName}
                totalCost={totalCost}
              >
                <SubscriptionCostTable data={subscriptionData} />

                {selectedRegion && (
                  <PAYGCostTable
                    currentRegionUid={currentRegionUid}
                    selectedRegion={selectedRegion}
                    selectedWorkspace={selectedWorkspace}
                    effectiveStartTime={effectiveStartTime}
                    effectiveEndTime={effectiveEndTime}
                    page={page}
                    pageSize={pageSize}
                    onUsageClick={handleUsageClick}
                  />
                )}
              </CostPanel>
            </CostTree>

            <AppBillingDrawer
              open={detailsDrawerOpen}
              onOpenChange={setDetailsDrawerOpen}
              selectedApp={selectedApp}
              currentRegionUid={currentRegionUid}
              currentRegionName={currentRegionName || null}
              effectiveStartTime={effectiveStartTime}
              effectiveEndTime={effectiveEndTime}
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
