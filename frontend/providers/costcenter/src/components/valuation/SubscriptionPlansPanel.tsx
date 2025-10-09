import { SubscriptionPlan } from '@/types/plan';
import { StaticPlanCard } from './StaticPlanCard';
import { useMemo } from 'react';
import { formatMoney, formatTrafficAuto } from '@/utils/format';

interface SubscriptionPlansPanelProps {
  plansData?: SubscriptionPlan[];
}

export function SubscriptionPlansPanel({ plansData }: SubscriptionPlansPanelProps) {
  const { mainPlans, additionalPlans } = useMemo(() => {
    if (!plansData || plansData.length === 0) {
      return { mainPlans: [], additionalPlans: [] };
    }
    const paid = plansData.filter((plan) => plan.Prices && plan.Prices.length > 0);
    const main = paid.filter((plan) => !plan.Tags.includes('more'));
    const additional = paid.filter(
      (plan) => plan.Tags.includes('more') && plan.Name !== 'Customized'
    );

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
          <div className="flex w-full gap-3 justify-start">
            {additionalPlans.slice(0, 2).map((plan) => {
              let resources: any = {};
              try {
                resources = JSON.parse(plan.MaxResources);
              } catch (e) {
                resources = {};
              }
              const monthlyPrice = formatMoney(plan.Prices?.[0]?.Price || 0);

              return (
                <div
                  key={plan.ID}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex-1"
                >
                  <div className="flex w-full flex-col justify-between">
                    <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {resources.cpu} vCPU + {resources.memory} RAM + {resources.storage} Disk +{' '}
                      {formatTrafficAuto(plan.Traffic)} + {resources.nodeports} Nodeport +{' '}
                      {formatMoney(plan.AIQuota * 100)} AI Credits - ${monthlyPrice.toFixed(0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
