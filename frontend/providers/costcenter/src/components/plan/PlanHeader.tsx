import { Button, Separator, Tooltip, TooltipTrigger, TooltipContent } from '@sealos/shadcn-ui';
import { CircleCheck, Sparkles, HelpCircle } from 'lucide-react';
import { displayMoney, formatMoney, formatTrafficAuto } from '@/utils/format';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import CancelPlanModal from './CancelPlanModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscriptionPayment } from '@/api/plan';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useState } from 'react';

export function getPlanBackgroundClass(planName: string, isPayg: boolean, inDebt: boolean): string {
  if (inDebt) return 'bg-plan-debt';
  if (isPayg) return 'bg-plan-payg';

  const normalizedPlanName = planName.toLowerCase();

  switch (normalizedPlanName) {
    case 'starter':
      return 'bg-plan-starter';
    case 'pro':
      return 'bg-plan-pro';
    case 'enterprise':
      return 'bg-plan-enterprise';
    case 'free':
    case 'hobby':
      return 'bg-plan-hobby';
    case 'hobby plus':
    case 'hobby-plus':
    case 'standard':
      return 'bg-plan-hobby-plus';
    case 'team':
      return 'bg-plan-team';
    case 'customized':
      return 'bg-plan-customized';
    default:
      return 'bg-plan-starter'; // Default fallback
  }
}

interface PlanHeaderProps {
  children?: ({ trigger }: { trigger: React.ReactNode }) => React.ReactNode;
  onRenewSuccess?: () => void;
}

export function PlanHeader({ children, onRenewSuccess }: PlanHeaderProps) {
  const { t } = useTranslation();
  const { toast } = useCustomToast();
  const queryClient = useQueryClient();
  const plansData = usePlanStore((state) => state.plansData);
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const lastTransactionData = usePlanStore((state) => state.lastTransactionData);

  const plans = plansData?.plans;
  const subscription = subscriptionData?.subscription;
  const lastTransaction = lastTransactionData?.transaction;
  const planName = subscription?.PlanName || t('common:free_plan');
  const isFreePlan = (subscription?.PlanName || '').toLowerCase() === 'free';
  const isCancelled = !!subscription?.CancelAtPeriodEnd && !isFreePlan;
  const stateLower = subscription?.Status?.toLowerCase?.() || '';
  const isNormal = stateLower === 'normal';
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const cancelPlanMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: async (data) => {
      if (data?.code === 200) {
        toast({
          title: t('common:cancel_plan_success_title'),
          description: t('common:cancel_plan_success_desc'),
          variant: 'success'
        });
        setCancelModalOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['subscription-info'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['last-transaction'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['workspace-subscription-list'], exact: false })
        ]);
        return;
      }

      toast({
        title: t('common:cancel_plan_failed_title'),
        description: data?.message || data?.error || t('common:cancel_plan_failed_desc'),
        variant: 'destructive'
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:cancel_plan_failed_title'),
        description: error?.message || t('common:cancel_plan_failed_desc'),
        variant: 'destructive'
      });
    }
  });

  const resumePlanMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: async (data) => {
      if (data?.code === 200) {
        toast({
          title: t('common:resume_plan_success_title'),
          description: t('common:resume_plan_success_desc'),
          variant: 'success'
        });
        onRenewSuccess?.();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['subscription-info'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['last-transaction'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['workspace-subscription-list'], exact: false })
        ]);
        return;
      }

      toast({
        title: t('common:resume_plan_failed_title'),
        description: data?.message || data?.error || t('common:resume_plan_failed_desc'),
        variant: 'destructive'
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:resume_plan_failed_title'),
        description: error?.message || t('common:resume_plan_failed_desc'),
        variant: 'destructive'
      });
    }
  });

  const renewalTime = subscription?.CurrentPeriodEndAt
    ? new Date(subscription.CurrentPeriodEndAt)
        .toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        .replace(/\//g, '/')
        .replace(',', '')
    : '-';
  const expTime = subscription?.CurrentPeriodEndAt
    ? new Date(subscription.CurrentPeriodEndAt)
        .toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        .replace(/\//g, '/')
        .replace(',', '')
    : '-';
  const isPaygType = subscription?.type === 'PAYG';
  const planDisplayName = isPaygType ? 'PAYG' : planName;
  const inDebt = subscription?.Status?.toLowerCase() === 'debt';
  const backgroundClass = isCancelled
    ? 'bg-plan-cancelled'
    : getPlanBackgroundClass(planName, isPaygType, inDebt);

  // Find current plan details from plans list
  const currentPlan = plans?.find((plan) => plan.Name === subscription?.PlanName);
  const monthlyPrice = currentPlan?.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

  const planResources = currentPlan?.MaxResources ?? {};

  // Check if there's a downgrade and show next plan info
  const isDowngrade =
    lastTransaction?.Operator === 'downgraded' && lastTransaction?.Status === 'pending';
  const nextPlanName = isDowngrade ? lastTransaction?.NewPlanName : null;

  if (isPaygType) {
    return (
      <div className="bg-white border p-2 rounded-2xl">
        <div
          className={`${backgroundClass} rounded-xl px-6 py-4 flex justify-between items-center`}
        >
          <div>
            <span className="text-slate-500 text-sm">{t('common:current_workspace_plan')}</span>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-2xl">{planDisplayName}</h1>
              {inDebt && (
                <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
                  {t('common:expired')}
                </span>
              )}
            </div>
          </div>

          {children?.({
            trigger: (
              <Button size="lg" variant="outline">
                <span>{inDebt ? t('common:renew') : t('common:subscribe_plan')}</span>
              </Button>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border p-2 rounded-2xl">
      <div className={`${backgroundClass} rounded-xl p-6 flex flex-col gap-4`}>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">{t('common:current_workspace_plan')}</span>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-2xl">{isPaygType ? 'PAYG' : planName}</h1>
              {inDebt && (
                <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                  {t('common:expired')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isNormal && !isFreePlan && (
              <Button
                size="lg"
                variant="outline"
                disabled={isCancelled}
                onClick={() => {
                  if (isCancelled) return;
                  setCancelModalOpen(true);
                }}
              >
                <span>{isCancelled ? t('common:cancelled') : t('common:cancel_plan')}</span>
              </Button>
            )}
            {isCancelled && (
              <Button
                size="lg"
                disabled={resumePlanMutation.isLoading}
                onClick={() => {
                  if (!subscription) return;

                  const statusLower = subscription.Status?.toLowerCase?.() || '';
                  const isDeleted = statusLower === 'deleted';
                  const periodEndMs = subscription.CurrentPeriodEndAt
                    ? new Date(subscription.CurrentPeriodEndAt).getTime()
                    : 0;
                  const isExpired = !periodEndMs || periodEndMs <= Date.now();

                  if (isDeleted || isExpired) {
                    toast({
                      title: t('common:resume_plan_expired_title'),
                      description: t('common:resume_plan_expired_desc'),
                      variant: 'destructive'
                    });
                    return;
                  }

                  const payMethod =
                    subscription.PayMethod === 'balance' || subscription.PayMethod === 'stripe'
                      ? subscription.PayMethod
                      : 'stripe';

                  resumePlanMutation.mutate({
                    workspace: subscription.Workspace,
                    regionDomain: subscription.RegionDomain,
                    planName: subscription.PlanName,
                    payMethod,
                    operator: 'resumed'
                  });
                }}
              >
                <Sparkles />
                <span>{t('common:renew_plan')}</span>
              </Button>
            )}

            {/* Keep UpgradePlanDialog mounted even when cancelled, so message-driven open works */}
            {children?.({
              trigger: isCancelled ? (
                <span className="hidden" />
              ) : (
                <Button size="lg">
                  <Sparkles />
                  <span>{inDebt ? t('common:renew') : t('common:upgrade_plan')}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator className="border-slate-200" />

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(planResources).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <CircleCheck size={16} className="text-blue-600"></CircleCheck>
              <span className="text-gray-600 text-sm">
                {key}: {String(value) || 'N/A'}
              </span>
            </div>
          ))}
          {currentPlan?.Traffic && (
            <div className="flex gap-2 items-center">
              <CircleCheck size={16} className="text-blue-600"></CircleCheck>
              <span className="text-gray-600 text-sm">
                {formatTrafficAuto(currentPlan.Traffic)}
              </span>
            </div>
          )}
          {currentPlan?.AIQuota && (
            <div className="flex gap-2 items-center">
              <CircleCheck size={16} className="text-blue-600"></CircleCheck>
              <span className="text-gray-600 text-sm">
                {formatMoney(currentPlan.AIQuota * 100)} {t('common:valuation.ai_credits')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={`px-6 py-5 grid ${isDowngrade ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">{t('common:price_per_month')}</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            <CurrencySymbol />
            <span>{displayMoney(formatMoney(monthlyPrice))}</span>
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{t('common:quota_resets_on')}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('common:quota_resets_on_tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {isCancelled ? '-' : renewalTime}
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">
            {inDebt ? t('common:expired_on') : t('common:expiration_time')}
          </span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {expTime}
          </span>
        </div>

        {isDowngrade && (
          <div className="flex gap-2 flex-col">
            <span className="text-sm text-muted-foreground">{t('common:next_plan')}</span>
            <span className="bg-[#FFEDD5] text-orange-600 font-medium text-sm leading-none flex items-center gap-2 px-2 py-1 w-fit rounded-full">
              {nextPlanName} {t('common:plan')}
            </span>
          </div>
        )}
      </div>

      {subscription && (
        <CancelPlanModal
          isOpen={cancelModalOpen}
          workspaceName={subscription.Workspace}
          currentPeriodEndAt={subscription.CurrentPeriodEndAt}
          isSubmitting={cancelPlanMutation.isLoading}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={async () => {
            const payMethod =
              subscription.PayMethod === 'balance' || subscription.PayMethod === 'stripe'
                ? subscription.PayMethod
                : 'stripe';

            cancelPlanMutation.mutate({
              workspace: subscription.Workspace,
              regionDomain: subscription.RegionDomain,
              planName: subscription.PlanName,
              payMethod,
              operator: 'canceled'
            });
          }}
        />
      )}
    </div>
  );
}
