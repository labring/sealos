import { SubscriptionPlan } from '@/types/plan';
import { StaticPlanCard } from './StaticPlanCard';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';

interface SubscriptionPlansPanelProps {
  plansData?: SubscriptionPlan[];
}

export function SubscriptionPlansPanel({ plansData }: SubscriptionPlansPanelProps) {
  const [selectedMorePlan, setSelectedMorePlan] = useState<string>('');

  if (!plansData || plansData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">No plans available</div>
      </div>
    );
  }

  // Filter out free plans and separate main plans from additional plans
  const paidPlans = plansData.filter((plan) => plan.Prices && plan.Prices.length > 0);
  const mainPlans = paidPlans.filter((plan) => !plan.Tags.includes('more'));
  const additionalPlans = paidPlans.filter((plan) => plan.Tags.includes('more'));

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
          <div className="max-w-md">
            <Select value={selectedMorePlan} onValueChange={setSelectedMorePlan}>
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

                  const monthlyPrice = (plan.Prices?.[0]?.Price || 0) / 1000000;
                  const trafficGB =
                    plan.Traffic > 1 ? (plan.Traffic / 1024).toFixed(0) : plan.Traffic;

                  return (
                    <SelectItem key={plan.ID} value={plan.ID}>
                      <div className="flex w-full items-center">
                        <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                        <div className="text-xs text-gray-500 ml-3">
                          {resources.cpu} vCPU + {resources.memory} RAM + {resources.storage} Disk +{' '}
                          {trafficGB} GB Traffic - ${monthlyPrice.toFixed(0)}
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
