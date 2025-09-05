import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
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
import { BillingNode, CostTree } from '@/components/billing/CostTree';
import { PAYGCostTable } from '@/components/billing/PAYGCostTable';
import {
  SubscriptionCostTable,
  SubscriptionData
} from '@/components/billing/SubscriptionCostTable';
import { CostPanel } from '@/components/billing/CostPanel';
import { AppBillingDrawer } from '@/components/billing/PAYGAppBillingDrawer';
import { PaymentRecord } from '@/types/plan';
import { getWorkspacesConsumptions } from '@/api/billing';

/**
 * Billing page container.
 * Hosts filters, region/workspace selection, and renders cost trees and tables.
 */
function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getRegion, regionList: regions } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Separate pagination state for PAYG table
  const [paygPage, setPaygPage] = useState(1);
  const [paygPageSize] = useState(10);

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

  // Still need regionUids for region consumption queries
  const regionUids = useMemo(() => (regions || []).map((r) => r.uid), [regions]);

  // Create region UID to name mapping
  const regionUidToName = useMemo(() => {
    const map = new Map<string, string>();
    (regions || []).forEach((r) => map.set(r.uid, r.name?.en || r.uid));
    return map;
  }, [regions]);

  // Fetch namespace data for all regions
  const { data: allNamespaces } = useQuery({
    queryKey: ['allNamespacesForBilling', regionUids, effectiveStartTime, effectiveEndTime],
    enabled: (regionUids?.length || 0) > 0,
    queryFn: async () => {
      const results = await Promise.all(
        (regionUids || []).map(async (uid) => {
          try {
            const res = await request.post('/api/billing/getNamespaceList', {
              startTime: effectiveStartTime,
              endTime: effectiveEndTime,
              regionUid: uid
            });
            return {
              regionUid: uid,
              data: res.data as [string, string][]
            };
          } catch (e) {
            return null;
          }
        })
      );

      return results.reduce<Array<{ regionUid: string; namespace: string; workspaceName: string }>>(
        (acc, data) => {
          if (!data) return acc;

          return acc.concat(
            data.data.map(([namespace, workspaceName]) => ({
              regionUid: data.regionUid,
              namespace,
              workspaceName
            }))
          );
        },
        []
      );
    }
  });

  // Query namespaces for current region (for backward compatibility)
  const nsListData = useMemo(() => {
    if (!allNamespaces || !currentRegionUid) return null;

    const currentRegionNamespaces = allNamespaces
      .filter((item) => item.regionUid === currentRegionUid)
      .map((item) => [item.namespace, item.workspaceName] as [string, string]);

    return { data: currentRegionNamespaces };
  }, [allNamespaces, currentRegionUid]);

  // Query body for subscription payments (region scope)
  // We need this for calculating costs
  const paymentListQueryBodyBase = useMemo(
    () => ({
      endTime: effectiveEndTime,
      startTime: effectiveStartTime
    }),
    [effectiveEndTime, effectiveStartTime]
  );

  // Fetch payments - now gets all regions data in single API call
  const { data: allPaymentsData } = useQuery({
    queryFn: () =>
      getPaymentList({ ...paymentListQueryBodyBase }).then((res) => res?.data?.payments || []),
    queryKey: ['paymentList', paymentListQueryBodyBase]
  });

  // Fetch workspace-level PAYG consumption using new API
  const { data: workspaceConsumptionData } = useQuery({
    queryKey: ['workspacesConsumptions', currentRegionUid, effectiveStartTime, effectiveEndTime],
    queryFn: async () => {
      try {
        const response = await getWorkspacesConsumptions({
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
          regionUid: currentRegionUid
        });

        // Fail silently
        if (!response.data) throw new Error('No response data');

        return response.data.amount;
      } catch (error) {
        console.error('Failed to fetch workspaces consumption:', error);
        return {} as Record<string, number>;
      }
    },
    enabled: !!currentRegionUid
  });

  // Fetch region-level PAYG consumption for ALL regions and map by region key
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
    const namespaces = (nsListData?.data || []) as [string, string][];
    const paymentList = (allPaymentsData || []).filter((p) => p.Type === 'SUBSCRIPTION');
    const workspaceConsumptions = workspaceConsumptionData || {};

    // Build workspaceCosts using consumption and payments
    const workspaceCosts = [
      // Convert consumption data from Record<string, number> to array format
      ...Object.entries(workspaceConsumptions).map(([namespaceId, amount]) => ({
        namespace: namespaceId,
        cost: amount
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

    // Map payments to regions using namespace-region association (following OrderList.tsx pattern)
    const regionPayments: Record<string, number> = paymentList.reduce<Record<string, number>>(
      (acc, payment) => {
        // Find the region for this payment's workspace using allNamespaces
        const workspaceInfo = allNamespaces?.find(
          ({ namespace }) => payment.Workspace === namespace
        );
        const regionUid = workspaceInfo?.regionUid;

        if (regionUid) {
          acc[regionUid] = (acc[regionUid] || 0) + payment.Amount;
        }

        return acc;
      },
      {}
    );

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

    // Workspace nodes - only show when a region is selected
    const workspaceNodes: BillingNode[] = selectedRegion
      ? namespaces.map(([namespaceId, namespaceName]) => ({
          id: namespaceId,
          name: namespaceName,
          cost: workspaceCosts[namespaceId] || 0,
          type: 'workspace',
          dependsOn: selectedRegion
        }))
      : [];

    // Merge nodes
    const nodes = [totalNode, ...regionNodes, ...workspaceNodes];

    return { nodes, totalCost };
  }, [
    regions,
    nsListData,
    allPaymentsData,
    allRegionConsumptions,
    workspaceConsumptionData,
    selectedRegion,
    allNamespaces
  ]);

  // Calculate the cost to display based on current selection
  const displayCost = useMemo(() => {
    // If workspace is selected, find the workspace node
    if (selectedWorkspace) {
      const workspaceNode = nodes.find(
        (node) => node.id === selectedWorkspace && node.type === 'workspace'
      );
      return workspaceNode?.cost || 0;
    }
    // If region is selected, find the region node
    if (selectedRegion) {
      const regionNode = nodes.find((node) => node.id === selectedRegion && node.type === 'region');
      return regionNode?.cost || 0;
    }
    // Default to total cost
    return totalCost;
  }, [selectedRegion, selectedWorkspace, nodes, totalCost]);

  // Transform query results for child components
  const subscriptionData = useMemo(() => {
    return (allPaymentsData || [])
      .filter((data: PaymentRecord) => {
        // Filter only SUBSCRIPTION type payments
        if (data.Type !== 'SUBSCRIPTION') return false;

        console.log(selectedRegion, selectedWorkspace);

        // Display all entries if no filter
        if (!selectedRegion && !selectedWorkspace) {
          return true;
        }

        // Filter by region if selected
        if (selectedRegion && !selectedWorkspace) {
          return allNamespaces
            ?.filter((ns) => ns.regionUid === selectedRegion)
            .some((ns) => ns.namespace === data.Workspace);
        }

        // Filter by workspace if selected
        if (selectedRegion && selectedWorkspace) {
          return data.Workspace === selectedWorkspace;
        }

        return false;
      })
      .map(
        (data: PaymentRecord) =>
          ({
            time: data.Time,
            plan: data.PlanName,
            cost: data.Amount
          }) satisfies SubscriptionData
      );
  }, [allPaymentsData, selectedWorkspace, allNamespaces, selectedRegion]);

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
    setPaygPage(1);
  }, [selectedRegion, selectedWorkspace, effectiveEndTime, effectiveStartTime]);

  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegion(regionId);
    setPage(1);
    setPaygPage(1);
    setSelectedApp(null);
    if (!regionId) {
      setSelectedWorkspace(null);
    }
  };

  const handleWorkspaceSelect = (workspaceId: string | null) => {
    setSelectedWorkspace(workspaceId);
    setPage(1);
    setPaygPage(1);
    setSelectedApp(null);
  };

  // Get current region and workspace names for display
  const currentRegionName = useMemo(() => {
    if (selectedRegion) {
      const region = regions.find((r) => r.uid === selectedRegion);
      return region?.name.en;
    }
    return null; // No region selected
  }, [selectedRegion, regions]);

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
                totalCost={displayCost}
              >
                <SubscriptionCostTable data={subscriptionData} />

                {selectedRegion && (
                  <PAYGCostTable
                    currentRegionUid={currentRegionUid}
                    selectedRegion={selectedRegion}
                    selectedWorkspace={selectedWorkspace}
                    effectiveStartTime={effectiveStartTime}
                    effectiveEndTime={effectiveEndTime}
                    page={paygPage}
                    pageSize={paygPageSize}
                    onUsageClick={handleUsageClick}
                    onPageChange={setPaygPage}
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
              nsListData={nsListData?.data || null}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="flex flex-col gap-4 overflow-auto">
          <OverviewTrend />
          <TrendOverviewBar />
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
