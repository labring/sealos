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
import useOverviewStore from '@/stores/overview';
import { getPaymentList } from '@/api/plan';
import { Region } from '@/types/region';
import { ApiResp } from '@/types';
import { BillingNode, CostTree } from '@/components/billing/CostTree';
import { PAYGCostTable } from '@/components/billing/PAYGCostTable';
import {
  SubscriptionCostTable,
  SubscriptionData
} from '@/components/billing/SubscriptionCostTable';
import { CostPanel } from '@/components/billing/CostPanel';
import { AppBillingDrawer } from '@/components/billing/PAYGAppBillingDrawer';
import { PaymentRecord } from '@/types/plan';

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
    // Fallback to store region
    return selectedRegion ?? (getRegion()?.uid || '');
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

  // Use cached namespaces from store for current region
  const namespaceList = useBillingStore((s) => s.namespaceList);
  const nsListData = useMemo(() => ({ data: namespaceList }), [namespaceList]);

  // Query body for subscription payments (region scope)
  // We need this for calculating costs
  const paymentListQueryBodyBase = useMemo(
    () => ({
      endTime: effectiveEndTime,
      startTime: effectiveStartTime
    }),
    [effectiveEndTime, effectiveStartTime]
  );

  // Fetch payments for ALL regions and merge
  const regionUids = useMemo(() => (regionData?.data || []).map((r) => r.uid), [regionData]);
  const { data: allPaymentsData } = useQuery({
    queryFn: async () => {
      const entries = await Promise.all(
        (regionUids || []).map(async (uid) => {
          const payments = await getPaymentList({ ...paymentListQueryBodyBase, regionUid: uid })
            .then((res) => res?.data?.payments || [])
            .catch(() => [] satisfies PaymentRecord[]);
          return [uid, payments] as const;
        })
      );

      return entries.reduce<Record<string, PaymentRecord[]>>((acc, [uid, payments]) => {
        acc[uid] = payments;
        return acc;
      }, {});
    },
    queryKey: ['paymentListAllRegions', paymentListQueryBodyBase, regionUids],
    enabled: (regionUids?.length || 0) > 0
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

  // Fetch region-level PAYG consumption for ALL regions and map by region key
  // ! ============================================= Need to include workspace PAYG consumption data later!
  const { data: allRegionConsumptions } = useQuery({
    queryKey: ['regionConsumptionAll', regionUids, effectiveStartTime, effectiveEndTime],
    queryFn: async () => {
      const results = await Promise.all(
        (regionUids || []).map(async (uid) => {
          try {
            const body = {
              appType: '',
              namespace: '',
              startTime: effectiveStartTime,
              endTime: effectiveEndTime,
              regionUid: uid,
              appName: ''
            };
            const resp = await request.post<{ amount: number }>('/api/billing/consumption', body);
            return { regionKey: uid, amount: resp.data.amount };
          } catch (e) {
            return { regionKey: uid, amount: 0 };
          }
        })
      );
      return results.reduce<Record<string, number>>((acc, cur) => {
        acc[cur.regionKey] = cur.amount;
        return acc;
      }, {});
    },
    enabled: (regionUids?.length || 0) > 0
  });

  const { nodes, totalCost } = useMemo(() => {
    const regions = regionData?.data || [];
    const namespaces = (nsListData?.data || []) as [string, string][];
    const paymentsByRegion = allPaymentsData || {};
    const paymentList = Object.values(paymentsByRegion).flat();
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

    // Build region costs
    const regionConsumptions: Record<string, number> = allRegionConsumptions || {};
    const regionPayments: Record<string, number> = Object.entries(paymentsByRegion).reduce<
      Record<string, number>
    >((acc, [regionKey, payments]) => {
      const sum = (payments || []).reduce((s: number, p: any) => s + (p.Amount || 0), 0);
      acc[regionKey] = (acc[regionKey] || 0) + sum;
      return acc;
    }, {});

    const allRegionKeys = Array.from(
      new Set([...Object.keys(regionConsumptions), ...Object.keys(regionPayments)])
    );
    const regionCosts: Record<string, number> = allRegionKeys.reduce((acc, regionKey) => {
      return {
        ...acc,
        [regionKey]: (regionConsumptions[regionKey] || 0) + (regionPayments[regionKey] || 0)
      };
    }, {});

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
      const regionId = region.uid;
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
      dependsOn: selectedRegion || currentRegionUid || null
    }));

    // Merge nodes
    const nodes = [totalNode, ...regionNodes, ...workspaceNodes];

    return { nodes, totalCost };
  }, [
    regionData,
    nsListData,
    allPaymentsData,
    allRegionConsumptions,
    workspaceConsumptionResults,
    selectedRegion,
    currentRegionUid
  ]);

  // Transform query results for child components
  const subscriptionData = useMemo(() => {
    return (Object.values(allPaymentsData || {}).flat() || [])
      .filter((data: any) => {
        return selectedWorkspace ? data.Workspace === selectedWorkspace : true;
      })
      .map(
        (data: any) =>
          ({
            time: data.Time,
            plan: data.PlanName,
            cost: data.Amount
          }) satisfies SubscriptionData
      );
  }, [allPaymentsData, selectedWorkspace]);

  /** Sync date range with store values */
  useEffect(() => {
    setDateRange({
      from: new Date(startTime),
      to: new Date(endTime)
    });
  }, [startTime, endTime]);

  /** Reset pagination when filters change */
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
      const region = (regionData?.data || []).find((r) => r.uid === selectedRegion);
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
