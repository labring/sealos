import { Avatar, AvatarFallback, cn, TableCell, TableHead, TableRow } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import {
  getWorkspaceSubscriptionList,
  getPaymentList,
  createSubscriptionPayment
} from '@/api/plan';
import useBillingStore from '@/stores/billing';
import request from '@/service/request';
import { useMemo, useState } from 'react';
import { formatMoney } from '@/utils/format';
import { getPlanBackgroundClass } from './PlanHeader';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { Button } from '@sealos/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';
import { BadgeX, MoreHorizontal } from 'lucide-react';
import CancelPlanModal from './CancelPlanModal';
import { useCustomToast } from '@/hooks/useCustomToast';
import useSessionStore from '@/stores/session';
import { UpgradePlanDialog } from './UpgradePlanDialog';
import { MaxResourcesRecord } from '@/types/plan';

export function AllPlansSection({
  onRenewSuccess
}: {
  onRenewSuccess?: (payload: {
    planName: string;
    maxResources?: MaxResourcesRecord;
    traffic?: number;
  }) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useCustomToast();
  const queryClient = useQueryClient();
  const { regionList: regions } = useBillingStore();
  const { getRegion } = useBillingStore();
  const currentRegion = getRegion();
  const { session } = useSessionStore();
  const currentWorkspaceId = session?.user?.nsid || '';
  const { plansData } = usePlanStore();
  const [cancelTarget, setCancelTarget] = useState<{
    workspaceId: string;
    regionDomain: string;
    planName: string;
    payMethod: 'stripe' | 'balance';
    currentPeriodEndAt?: string;
  } | null>(null);
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

  const subscriptionActionMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: async (data, variables) => {
      if (data?.code === 200) {
        if (variables.operator === 'canceled') {
          toast({
            title: t('common:cancel_plan_success_title'),
            description: t('common:cancel_plan_success_desc'),
            variant: 'success'
          });
        } else if (variables.operator === 'resumed') {
          toast({
            title: t('common:resume_plan_success_title'),
            description: t('common:resume_plan_success_desc'),
            variant: 'success'
          });

          // Show congratulations modal for renewed subscription (best-effort: local data)
          const planName = variables.planName;
          const plan = plansData?.plans?.find((p) => p.Name === planName);
          onRenewSuccess?.({
            planName,
            maxResources: plan?.MaxResources,
            traffic: plan?.Traffic
          });
        } else {
          toast({ title: t('common:close'), variant: 'success' });
        }
        setCancelTarget(null);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['workspace-subscription-list'],
            exact: false
          }),
          queryClient.invalidateQueries({ queryKey: ['subscription-info'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['last-transaction'], exact: false })
        ]);
        return;
      }

      toast({
        title:
          variables.operator === 'canceled'
            ? t('common:cancel_plan_failed_title')
            : variables.operator === 'resumed'
            ? t('common:resume_plan_failed_title')
            : t('common:error'),
        description:
          data?.message ||
          data?.error ||
          (variables.operator === 'canceled'
            ? t('common:cancel_plan_failed_desc')
            : variables.operator === 'resumed'
            ? t('common:resume_plan_failed_desc')
            : undefined),
        variant: 'destructive'
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error?.message,
        variant: 'destructive'
      });
    }
  });

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
      const regionDomain = region?.domain || '';

      return {
        regionUid,
        regionName,
        regionDomain,
        workspaces: namespaces.map(([namespaceId, workspaceName]) => {
          const subscription = subscriptionsMap.get(namespaceId);

          if (subscription) {
            const monthlyPrice = planPricesMap.get(subscription.PlanName) ?? 0;
            const isFreePlan = (subscription.PlanName || '').toLowerCase() === 'free';
            return {
              namespaceId,
              workspaceName,
              plan: subscription.PlanName,
              renewalTime: subscription.CurrentPeriodEndAt,
              cancelAtPeriodEnd: !!subscription.CancelAtPeriodEnd && !isFreePlan,
              status: subscription.Status,
              payMethod: subscription.PayMethod,
              price: monthlyPrice
            };
          } else {
            return {
              namespaceId,
              workspaceName,
              plan: 'PAYG',
              renewalTime: null,
              cancelAtPeriodEnd: false,
              status: '',
              payMethod: '',
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
                <TableHead className="bg-transparent">{t('common:quota_resets_on')}</TableHead>
                <TableHead className="bg-transparent">{t('common:price')}</TableHead>
                <TableHead className="bg-transparent hidden">{t('common:actions')}</TableHead>
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
                        <div className="flex items-center gap-2">
                          <span>{workspace.workspaceName || t('common:unknown_workspace')}</span>
                          {(workspace.status || '').toLowerCase() === 'debt' && (
                            <Badge
                              className="bg-red-50 text-red-600 border border-red-300 rounded-full"
                              variant="destructive"
                            >
                              {t('common:in_debt')}
                            </Badge>
                          )}
                          {workspace.cancelAtPeriodEnd && (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-100 text-muted-foreground rounded-full"
                            >
                              {t('common:plan_cancelled')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="subscription"
                        className={cn(
                          // Not showing debt state in this badge
                          getPlanBackgroundClass(workspace.plan, workspace.plan === 'PAYG', false)
                        )}
                      >
                        {workspace.plan || t('common:unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workspace.cancelAtPeriodEnd
                        ? '-'
                        : workspace.renewalTime
                        ? formatDate(workspace.renewalTime)
                        : '---'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          {workspace.price ? (
                            <>
                              <CurrencySymbol />
                              <span>{formatMoney(workspace.price)}</span>
                            </>
                          ) : (
                            '---'
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden">
                      {(() => {
                        const statusLower = (workspace.status || '').toLowerCase();
                        const isPayg = workspace.plan === 'PAYG';
                        const isDebt = statusLower === 'debt';
                        const isCancelled = workspace.cancelAtPeriodEnd;

                        const payMethod: 'stripe' | 'balance' =
                          workspace.payMethod === 'balance' || workspace.payMethod === 'stripe'
                            ? (workspace.payMethod as 'stripe' | 'balance')
                            : 'stripe';

                        const canUseUpgradeDialog =
                          workspace.namespaceId === currentWorkspaceId &&
                          regionData.regionDomain === (currentRegion?.domain || '');

                        if (isPayg) return <span>---</span>;

                        if (isDebt) {
                          return canUseUpgradeDialog ? (
                            <UpgradePlanDialog isUpgradeMode>
                              <Button variant="outline" size="sm">
                                {t('common:renew')}
                              </Button>
                            </UpgradePlanDialog>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              {t('common:renew')}
                            </Button>
                          );
                        }

                        if (isCancelled) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={subscriptionActionMutation.isLoading}
                              onClick={() => {
                                if (!regionData.regionDomain) return;
                                subscriptionActionMutation.mutate({
                                  workspace: workspace.namespaceId,
                                  regionDomain: regionData.regionDomain,
                                  planName: workspace.plan,
                                  payMethod,
                                  operator: 'resumed'
                                });
                              }}
                            >
                              {t('common:renew_plan')}
                            </Button>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            {canUseUpgradeDialog ? (
                              <UpgradePlanDialog isUpgradeMode>
                                <Button variant="outline" size="sm">
                                  {t('common:upgrade')}
                                </Button>
                              </UpgradePlanDialog>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                {t('common:upgrade')}
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (!regionData.regionDomain) return;
                                    setCancelTarget({
                                      workspaceId: workspace.namespaceId,
                                      regionDomain: regionData.regionDomain,
                                      planName: workspace.plan,
                                      payMethod,
                                      currentPeriodEndAt: workspace.renewalTime || undefined
                                    });
                                  }}
                                >
                                  <BadgeX className="h-4 w-4" />
                                  <span>{t('common:unsubscribe')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableLayoutBody>
            </TableLayoutContent>
          </TableLayout>
        ))}
      </div>

      {cancelTarget && (
        <CancelPlanModal
          isOpen={!!cancelTarget}
          workspaceName={cancelTarget.workspaceId}
          currentPeriodEndAt={cancelTarget.currentPeriodEndAt}
          isSubmitting={subscriptionActionMutation.isLoading}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            subscriptionActionMutation.mutate({
              workspace: cancelTarget.workspaceId,
              regionDomain: cancelTarget.regionDomain,
              planName: cancelTarget.planName,
              payMethod: cancelTarget.payMethod,
              operator: 'canceled'
            });
          }}
        />
      )}
    </div>
  );
}
