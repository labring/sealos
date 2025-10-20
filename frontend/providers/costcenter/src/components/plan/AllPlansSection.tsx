import { Avatar, AvatarFallback, cn, TableCell, TableHead, TableRow } from '@sealos/shadcn-ui';
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
import useBillingStore from '@/stores/billing';
import request from '@/service/request';
import { useMemo } from 'react';
import { formatMoney } from '@/utils/format';
import { getPlanBackgroundClass } from './PlanHeader';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';

export function AllPlansSection() {
  const { t } = useTranslation();
  const { regionList: regions } = useBillingStore();
  const { plansData } = usePlanStore();
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
    queryFn: getWorkspaceSubscriptionList,
    refetchOnMount: true
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

  const { data: allPaymentsData, isLoading: allPaymentsLoading } = useQuery({
    queryFn: () =>
      getPaymentList({ ...paymentListQueryBodyBase }).then((res) => res?.data?.payments || []),
    queryKey: ['paymentList', paymentListQueryBodyBase]
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

  const subscriptions = useMemo(
    () => subscriptionListData?.data?.subscriptions || [],
    [subscriptionListData]
  );

  const allSubscriptions = useMemo(() => {
    // Pre-process data into Maps for O(1) lookups
    const regionsMap = new Map(regions.map((r) => [r.uid, r]));
    const subscriptionsMap = new Map(subscriptions.map((sub) => [sub.Workspace, sub]));
    const planPricesMap = new Map(
      (plansData?.plans ?? []).map((p) => [
        p.Name,
        p.Prices?.find((price) => price.BillingCycle === '1m')?.Price || 0
      ])
    );

    return Object.entries(nsListData ?? {}).map(([regionUid, namespaces]) => {
      const region = regionsMap.get(regionUid);
      const regionName = region?.name?.en || region?.name?.zh || region?.domain || regionUid;

      return {
        regionUid,
        regionName,
        workspaces: namespaces.map(([namespaceId, workspaceName]) => {
          const subscription = subscriptionsMap.get(namespaceId);

          if (subscription) {
            const monthlyPrice = planPricesMap.get(subscription.PlanName) ?? 0;
            return {
              namespaceId,
              workspaceName,
              plan: subscription.PlanName,
              renewalTime: subscription.CurrentPeriodEndAt,
              price: monthlyPrice
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
      };
    });
  }, [allPaymentsData, nsListData, regions, subscriptions, plansData]);

  if (subscriptionListLoading || nsListLoading || allPaymentsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div>{t('common:loading_subscriptions')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-black font-medium text-lg mb-4">{t('common:all_plans')}</div>
      <div className="space-y-6">
        {allSubscriptions.map((regionData) => (
          <TableLayout key={regionData.regionUid} className="shadow-none">
            <TableLayoutCaption className="font-medium text-base bg-zinc-50">
              {regionData.regionName}
            </TableLayoutCaption>

            <TableLayoutContent>
              <TableLayoutHeadRow>
                <TableHead className="bg-transparent">{t('common:workspace')}</TableHead>
                <TableHead className="bg-transparent">{t('common:plan')}</TableHead>
                <TableHead className="bg-transparent">{t('common:renewal_time')}</TableHead>
                <TableHead className="bg-transparent">{t('common:price')}</TableHead>
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
                        <div>{workspace.workspaceName || t('common:unknown_workspace')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="subscription"
                        className={cn(
                          getPlanBackgroundClass(workspace.plan, workspace.plan === 'PAYG')
                        )}
                      >
                        {workspace.plan || t('common:unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workspace.renewalTime ? formatDate(workspace.renewalTime) : '---'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{workspace.price ? `$${formatMoney(workspace.price)}` : '---'}</span>
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
