import { SubscriptionPlan } from '@/types/plan';
import { StaticPlanCard } from './StaticPlanCard';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';
import { formatMoney, formatTrafficAuto } from '@/utils/format';

interface SubscriptionPlansPanelProps {
  plansData?: SubscriptionPlan[];
}

export function SubscriptionPlansPanel({ plansData }: SubscriptionPlansPanelProps) {
  const [selectedMorePlan, setSelectedMorePlan] = useState<string>('');

  const { mainPlans, additionalPlans } = useMemo(() => {
    if (!plansData || plansData.length === 0) {
      return { mainPlans: [], additionalPlans: [] };
    }
    const paid = plansData.filter((plan) => plan.Prices && plan.Prices.length > 0);
    const main = paid.filter((plan) => !plan.Tags.includes('more'));
    const additional = paid.filter((plan) => plan.Tags.includes('more'));

    const sortByOrder = (a: SubscriptionPlan, b: SubscriptionPlan) => a.Order - b.Order;

    return {
      mainPlans: main.sort(sortByOrder),
      additionalPlans: additional.sort(sortByOrder)
    };
  }, [plansData]);

  if (!plansData || plansData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">No plans available</div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 bg-gray-50 min-h-full">
      {/* Main Plans Grid */}
      <div className="flex w-full gap-3 justify-between mb-6">
        {mainPlans.map((plan, index) => (
          <StaticPlanCard key={plan.ID} plan={plan} isPopular={index === 1} />
        ))}
      </div>

      {/* More Plans Section */}
      {additionalPlans.length > 0 && (
        <div>
          <div className="text-lg font-medium mb-4 text-black">More Plans</div>
          <div className="w-full">
            <Select
              value={selectedMorePlan}
              onValueChange={(value) => {
                const currentPlan = additionalPlans.find((p) => p.ID === value);
                if (currentPlan?.Name === 'Customized' && currentPlan?.Description) {
                  window.open(currentPlan?.Description, '_blank', 'noopener,noreferrer');
                } else {
                  setSelectedMorePlan(value);
                }
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {additionalPlans.map((plan) => {
                  let resources: any = {};
                  try {
                    resources = JSON.parse(plan.MaxResources);
                  } catch (e) {
                    resources = {};
                  }

                  const monthlyPrice = formatMoney(plan.Prices?.[0]?.Price || 0);

                  if (plan.Name === 'Customized') {
                    return (
                      <SelectItem key={plan.ID} value={plan.ID}>
                        <div className="flex w-full items-center">
                          <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                        </div>
                      </SelectItem>
                    );
                  }

                  return (
                    <SelectItem key={plan.ID} value={plan.ID}>
                      <div className="flex w-full items-center">
                        <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                        <div className="text-xs text-gray-500 ml-3">
                          {resources.cpu} vCPU + {resources.memory} RAM + {resources.storage} Disk +{' '}
                          {formatTrafficAuto(plan.Traffic)} - ${monthlyPrice.toFixed(0)}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
