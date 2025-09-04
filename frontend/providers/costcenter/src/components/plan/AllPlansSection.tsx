import { Avatar, AvatarFallback, TableCell, TableHead, TableRow } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { useQuery } from '@tanstack/react-query';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import { getWorkspaceSubscriptionList, getPaymentList } from '@/api/plan';
import { getWorkspacesConsumptions } from '@/api/billing';
import { PaymentRecord } from '@/types/plan';
import useBillingStore from '@/stores/billing';
import request from '@/service/request';
import { useMemo } from 'react';
import { formatMoney } from '@/utils/format';

export function AllPlansSection() {
  const { regionList: regions } = useBillingStore();

  // Set default time range: 31 days ago to now
  const effectiveStartTime = useMemo(() => {
    return new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  }, []);
  const effectiveEndTime = useMemo(() => {
    return new Date().toISOString();
  }, []);

  const regionUids = useMemo(() => (regions || []).map((r) => r.uid), [regions]);

  const { data: subscriptionListData, isLoading: subscriptionListLoading } = useQuery({
    queryKey: ['workspace-subscription-list'],
    queryFn: getWorkspaceSubscriptionList
  });

  // Query body for subscription payments (region scope)
  // We need this for calculating costs
  const paymentListQueryBodyBase = useMemo(
    () => ({
      endTime: effectiveEndTime,
      startTime: effectiveStartTime
    }),
    [effectiveEndTime, effectiveStartTime]
  );

  // Query namespaces for ALL regions to get workspace names across regions
  const { data: nsListData, isLoading: nsListLoading } = useQuery({
    queryFn: async () => {
      const entries = await Promise.all(
        (regionUids || []).map(async (uid) => {
          const namespaces = await request
            .post('/api/billing/getNamespaceList', {
              startTime: effectiveStartTime,
              endTime: effectiveEndTime,
              regionUid: uid
            })
            .then((res) => (res?.data as [string, string][]) || [])
            .catch(() => []);

          return [uid, namespaces] as const;
        })
      );

      return entries.reduce<Record<string, [string, string][]>>((acc, [uid, namespaces]) => {
        acc[uid] = namespaces;
        return acc;
      }, {});
    },
    queryKey: [
      'nsListAllRegions',
      'menu',
      { startTime: effectiveStartTime, endTime: effectiveEndTime, regionUids }
    ],
    enabled: (regionUids?.length || 0) > 0
  });

  // Fetch payments for ALL regions and merge
  const { data: allPaymentsData, isLoading: allPaymentsLoading } = useQuery({
    queryFn: async () => {
      const entries = await Promise.all(
        (regionUids || []).map(async (uid) => {
          const payments = await getPaymentList({ ...paymentListQueryBodyBase, regionUid: uid })
            .then((res) => res?.data?.payments || [])
            .catch(() => [] satisfies PaymentRecord[]);

          // This API will return both subscription and PAYG payments, we only need subscriptions
          const subscriptionPayments = payments.filter((p) => p.Type === 'SUBSCRIPTION');
          return [uid, subscriptionPayments] as const;
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr)
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      .replace(/\//g, '/')
      .replace(',', ' ');
  };

  const getPlanBadgeColor = (type?: string) => {
    switch (type) {
      case 'SUBSCRIPTION':
        return 'bg-blue-100 text-blue-600';
      case 'PAYG':
        return 'bg-plan-payg text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const subscriptions = useMemo(
    () => subscriptionListData?.data?.subscriptions || [],
    [subscriptionListData]
  );

  const allSubscriptions = useMemo(
    () =>
      Object.entries(nsListData ?? {}).map(([regionUid, namespaces]) => ({
        regionUid,
        regionName: (() => {
          const region = regions.find((r) => r.uid === regionUid);
          return region?.name?.en || region?.name?.zh || region?.domain || regionUid;
        })(),
        workspaces: namespaces.map(([namespaceId, workspaceName]) => {
          const subscription = subscriptions.find((sub) => sub.Workspace === namespaceId);
          if (subscription) {
            const paymentRecord = (allPaymentsData?.[regionUid] ?? []).find(
              (p) => p.Type === 'SUBSCRIPTION' && p.Workspace === namespaceId
            );

            return {
              namespaceId,
              workspaceName,
              plan: subscription.PlanName,
              renewalTime: subscription.CurrentPeriodStartAt,
              price: paymentRecord?.Amount ?? null
            };
          } else {
            return {
              namespaceId,
              workspaceName,
              plan: 'PAYG',
              renewalTime: null,
              price: null
            };
          }
        })
      })),
    [allPaymentsData, nsListData, regions, subscriptions]
  );

  if (subscriptionListLoading || nsListLoading || allPaymentsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div>Loading subscriptions...</div>
      </div>
    );
  }

  if (!subscriptions.length) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">No subscriptions found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-black font-medium text-lg mb-4">All Plans</div>
      <div className="space-y-6">
        {allSubscriptions.map((regionData) => (
          <TableLayout key={regionData.regionUid} className="shadow-none">
            <TableLayoutCaption className="font-medium text-base bg-zinc-50">
              {regionData.regionName}
            </TableLayoutCaption>

            <TableLayoutContent>
              <TableLayoutHeadRow>
                <TableHead className="bg-transparent">Workspace</TableHead>
                <TableHead className="bg-transparent">Plan</TableHead>
                <TableHead className="bg-transparent">Renewal Time</TableHead>
                <TableHead className="bg-transparent">Price</TableHead>
              </TableLayoutHeadRow>

              <TableLayoutBody>
                {regionData.workspaces.map((workspace) => (
                  <TableRow key={`${regionData.regionName}-${workspace.namespaceId}`}>
                    <TableCell className="h-14">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-5">
                          <AvatarFallback>
                            {workspace.workspaceName?.[0]?.toUpperCase() || 'W'}
                          </AvatarFallback>
                        </Avatar>
                        <div>{workspace.workspaceName || 'Unknown Workspace'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getPlanBadgeColor(
                          workspace.plan === 'PAYG' ? 'PAYG' : 'SUBSCRIPTION'
                        )} font-medium`}
                      >
                        {workspace.plan || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workspace.renewalTime ? formatDate(workspace.renewalTime) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{workspace.price ? `$${formatMoney(workspace.price)}` : '-'}</span>
                        <span className="text-gray-500">
                          {workspace.plan === 'PAYG' ? 'Pay-as-you-go' : 'Subscription'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableLayoutBody>
            </TableLayoutContent>
          </TableLayout>
        ))}
      </div>
    </div>
  );
}
