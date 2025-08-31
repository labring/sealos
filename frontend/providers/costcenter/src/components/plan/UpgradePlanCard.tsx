import { Button, cn } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck } from 'lucide-react';
import { SubscriptionPlan } from '@/types/plan';

interface UpgradePlanCardProps {
  plan: SubscriptionPlan;
  className?: string;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  isNextPlan?: boolean;
  currentPlan?: SubscriptionPlan;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
  isCreateMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function UpgradePlanCard({
  plan,
  className,
  isPopular = false,
  isCurrentPlan = false,
  isNextPlan = false,
  currentPlan,
  onSubscribe,
  isLoading = false,
  isCreateMode = false,
  isSelected = false,
  onSelect
}: UpgradePlanCardProps) {
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

  let resources: any = {};
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {};
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
        'flex flex-col border rounded-xl bg-white shadow-sm cursor-pointer',
        isCreateMode && isSelected ? 'border-zinc-900 border-2' : 'border-gray-200 border-2',
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
          <span className="text-4xl font-bold text-gray-900">
            ${(monthlyPrice / 1000000).toFixed(0)}
          </span>
          <span className="text-gray-600 ml-1">/month</span>
        </div>

        {isCreateMode ? (
          <div className="mb-4">
            <div className="border-t border-slate-200"></div>
          </div>
        ) : (
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
            onClick={() => {
              if (!isCurrentPlan && !isNextPlan && actionType !== 'contact' && onSubscribe) {
                onSubscribe(plan);
              }
            }}
          >
            {getButtonText()}
          </Button>
        )}
        <ul className="space-y-3">
          {resources.cpu && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.cpu === '16'
                  ? '1 vCPU'
                  : resources.cpu === '4'
                    ? '4 vCPU'
                    : resources.cpu === '8'
                      ? 'More vCPU'
                      : `${resources.cpu} CPU`}
              </span>
            </li>
          )}
          {resources.memory && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.memory === '32Gi'
                  ? '2GB RAM'
                  : resources.memory === '8Gi'
                    ? '8GB RAM'
                    : resources.memory === '16Gi'
                      ? 'More RAM'
                      : resources.memory}
              </span>
            </li>
          )}
          {resources.storage && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.storage === '500Gi'
                  ? '2GB Disk'
                  : resources.storage === '100Gi'
                    ? '2GB Disk'
                    : resources.storage === '200Gi'
                      ? 'More Disk'
                      : resources.storage}
              </span>
            </li>
          )}
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.Traffic === 50000
                ? '3GB Traffic'
                : plan.Traffic === 10000
                  ? '3GB Traffic'
                  : plan.Traffic === 20000
                    ? 'More Traffic'
                    : `${plan.Traffic}GB Traffic`}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.MaxSeats === 50
                ? '1 Port'
                : plan.MaxSeats === 10
                  ? '2 Port'
                  : plan.MaxSeats === 20
                    ? 'More Port'
                    : `${plan.MaxSeats} Port`}
            </span>
          </li>
          {plan.Name.includes('medium') && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">More Customized Services</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
