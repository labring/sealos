import { Button, cn } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck } from 'lucide-react';
import { SubscriptionPlan } from '@/types/plan';
import usePlanStore from '@/stores/plan';
import { formatMoney, formatTrafficAuto } from '@/utils/format';

interface UpgradePlanCardProps {
  plan: SubscriptionPlan;
  className?: string;
  isPopular?: boolean;
  isLoading?: boolean;
  isCreateMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  workspaceName?: string;
}

export function UpgradePlanCard({
  plan,
  className,
  isPopular = false,
  isLoading = false,
  isCreateMode = false,
  isSelected = false,
  onSelect,
  workspaceName
}: UpgradePlanCardProps) {
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const lastTransactionData = usePlanStore((state) => state.lastTransactionData);
  const getCurrentPlan = usePlanStore((state) => state.getCurrentPlan);
  const showConfirmationModal = usePlanStore((state) => state.showConfirmationModal);
  const showDowngradeModal = usePlanStore((state) => state.showDowngradeModal);

  const subscription = subscriptionData?.subscription;
  const lastTransaction = lastTransactionData?.transaction;
  const currentPlan = getCurrentPlan() || undefined;
  const isCurrentPlan = !isCreateMode && plan.Name === subscription?.PlanName;
  const isNextPlan =
    !isCreateMode &&
    plan.Name === lastTransaction?.NewPlanName &&
    lastTransaction?.Operator === 'downgraded';

  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
  const originalPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.OriginalPrice || 0;

  let resources: { cpu: string; memory: string; storage: string; nodeports: string } = {
    cpu: '',
    memory: '',
    storage: '',
    nodeports: ''
  };
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {
      cpu: '',
      memory: '',
      storage: '',
      nodeports: ''
    };
  }

  // Determine action type based on plan relationships
  const getActionType = () => {
    if (!currentPlan) return 'upgrade';
    if (currentPlan.UpgradePlanList?.includes(plan.Name)) return 'upgrade';
    if (currentPlan.DowngradePlanList?.includes(plan.Name)) return 'downgrade';
    if (plan.Name.includes('Enterprise')) return 'contact';
    return 'upgrade';
  };

  const actionType = getActionType();

  // Get operator for upgrade amount calculation
  const getOperator = () => {
    if (!currentPlan) return 'created';
    if (currentPlan.UpgradePlanList?.includes(plan.Name)) return 'upgraded';
    if (currentPlan.DowngradePlanList?.includes(plan.Name)) return 'downgraded';
    return 'upgraded';
  };

  const handleSubscribeClick = () => {
    if (isCurrentPlan || isNextPlan || actionType === 'contact') {
      return;
    }
    if (getOperator() === 'downgraded') {
      return showDowngradeModal(plan, { workspaceName, isCreateMode });
    }
    return showConfirmationModal(plan, { workspaceName, isCreateMode });
  };

  // Get button text based on action type
  const getButtonText = () => {
    if (isCreateMode) {
      if (isLoading) return 'Creating...';
      return 'Create Workspace';
    }

    if (isCurrentPlan) return 'Your current plan';
    if (isNextPlan) return 'Your next plan';
    if (isLoading) return 'Processing...';

    switch (actionType) {
      case 'upgrade':
        return 'Upgrade';
      case 'downgrade':
        return 'Downgrade';
      case 'contact':
        return 'Contact Us';
      default:
        return 'Subscribe';
    }
  };

  return (
    <section
      className={cn(
        'flex flex-col border rounded-xl bg-white cursor-pointer',
        isCreateMode && isSelected ? 'border-zinc-900' : 'border-gray-200',
        className
      )}
      style={{ width: '258px' }}
      onClick={isCreateMode ? onSelect : undefined}
    >
      <div className="p-6 pb-4 relative">
        <div className="flex justify-between items-start mb-2 ">
          <h3 className="text-xl font-semibold text-gray-900">{plan.Name}</h3>
          {isPopular && (
            <Badge className="bg-blue-600 z-10 text-white text-xs px-2 py-1 rounded-full absolute -top-4 left-1/2 leading-[14px] -translate-x-1/2">
              Most popular
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{plan.Description}</p>

        <div className="mb-4">
          {originalPrice > 0 && (
            <span className="text-4xl font-bold text-gray-400 line-through">
              ${formatMoney(originalPrice).toFixed(0)}
            </span>
          )}
          <span className="text-4xl font-bold text-gray-900">
            ${formatMoney(monthlyPrice).toFixed(0)}
          </span>
          <span className="text-gray-600 ml-1">/month</span>
        </div>

        {!isCreateMode && (
          <Button
            className={cn(
              'w-full mb-6 font-medium',
              isCurrentPlan || isNextPlan
                ? 'bg-gray-200 text-gray-600 cursor-not-allowed hover:bg-gray-200'
                : actionType === 'contact'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
            )}
            disabled={isCurrentPlan || isNextPlan || isLoading}
            onClick={handleSubscribeClick}
          >
            {getButtonText()}
          </Button>
        )}
        <ul className="space-y-3">
          {resources.cpu && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{resources.cpu} vCPU</span>
            </li>
          )}
          {resources.memory && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{resources.memory} RAM</span>
            </li>
          )}
          {resources.storage && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{resources.storage} Disk</span>
            </li>
          )}
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">{formatTrafficAuto(plan.Traffic)}</span>
          </li>
          {resources.nodeports && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{resources.nodeports} Nodeport</span>
            </li>
          )}
          {plan.AIQuota && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {formatMoney(plan.AIQuota * 100)} AI Credits
              </span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
