import { Button, Separator } from '@sealos/shadcn-ui';
import { CircleCheck, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '@/types/plan';
import { displayMoney, formatMoney } from '@/utils/format';
import { UpgradePlanDialog } from './UpgradePlanDialog';
import usePlanStore from '@/stores/plan';

export function getPlanBackgroundClass(planName: string, isPayg: boolean): string {
  if (isPayg) return 'bg-plan-payg';

  const normalizedPlanName = planName.toLowerCase();

  switch (normalizedPlanName) {
    case 'starter':
      return 'bg-plan-starter';
    case 'pro':
      return 'bg-plan-pro';
    case 'enterprise':
      return 'bg-plan-enterprise';
    case 'hobby':
      return 'bg-plan-hobby';
    case 'hobby plus':
    case 'hobby-plus':
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
  onSubscribe?: (plan: SubscriptionPlan | null, workspaceName?: string, isPayg?: boolean) => void;
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  isUpgradeMode?: boolean;
}

export function PlanHeader({
  onSubscribe,
  isSubscribing = false,
  isCreateMode = false,
  isUpgradeMode = false
}: PlanHeaderProps) {
  const plansData = usePlanStore((state) => state.plansData);
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const lastTransactionData = usePlanStore((state) => state.lastTransactionData);

  const plans = plansData?.plans;
  const subscription = subscriptionData?.subscription;
  const lastTransaction = lastTransactionData?.transaction;
  const planName = subscription?.PlanName || 'Free Plan';

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
    : 'N/A';
  const isPaygType = subscription?.type === 'PAYG';
  const planDisplayName = isPaygType ? 'PAYG' : planName;
  const backgroundClass = getPlanBackgroundClass(planName, isPaygType);

  // Find current plan details from plans list
  const currentPlan = plans?.find((plan) => plan.Name === subscription?.PlanName);
  const monthlyPrice = currentPlan?.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

  console.log('PlanHeader.currentPlan', currentPlan, monthlyPrice);

  // Parse plan resources
  let planResources: any = {};
  try {
    planResources = JSON.parse(currentPlan?.MaxResources || '{}');
  } catch (e) {
    planResources = {};
  }

  // Check if there's a downgrade and show next plan info
  const isDowngrade = lastTransaction?.Operator === 'downgraded';
  const nextPlanName = isDowngrade ? lastTransaction?.NewPlanName : null;

  if (isPaygType) {
    return (
      <div className="bg-white border p-2 rounded-2xl">
        <div
          className={`${backgroundClass} rounded-xl px-6 py-4 flex justify-between items-center`}
        >
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{planDisplayName}</h1>
          </div>

          <UpgradePlanDialog
            onSubscribe={onSubscribe}
            isSubscribing={isSubscribing}
            isCreateMode={isCreateMode}
            isUpgradeMode={isUpgradeMode}
          >
            <Button size="lg" variant="outline">
              <Sparkles />
              <span>{isCreateMode ? 'Create Workspace' : 'Subscribe Plan'}</span>
            </Button>
          </UpgradePlanDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border p-2 rounded-2xl">
      <div className={`${backgroundClass} rounded-xl p-6 flex flex-col gap-4`}>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{isPaygType ? 'PAYG' : planName}</h1>
          </div>

          <UpgradePlanDialog
            onSubscribe={onSubscribe}
            isSubscribing={isSubscribing}
            isCreateMode={isCreateMode}
            isUpgradeMode={isUpgradeMode}
          >
            <Button size="lg">
              <Sparkles />
              <span>{isCreateMode ? 'Create Workspace' : 'Upgrade Plan'}</span>
            </Button>
          </UpgradePlanDialog>
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
              <span className="text-gray-600 text-sm">Traffic: {currentPlan.Traffic}GB</span>
            </div>
          )}
        </div>
      </div>

      <div className={`px-6 py-5 grid ${isDowngrade ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Price/Month</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            ${displayMoney(formatMoney(monthlyPrice))}
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Renewal Time</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {renewalTime}
          </span>
        </div>

        {isDowngrade && (
          <div className="flex gap-2 flex-col">
            <span className="text-sm text-muted-foreground">Next Plan</span>
            <span className="bg-[#FFEDD5] text-orange-600 font-medium text-sm leading-none flex items-center gap-2 px-2 py-1 w-fit rounded-full">
              {nextPlanName} Plan
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
