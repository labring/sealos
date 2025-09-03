import { SubscriptionPlan } from '@/types/plan';
import { CircleCheck } from 'lucide-react';
import { Badge } from '@sealos/shadcn-ui/badge';
import { formatMoney } from '@/utils/format';

interface StaticPlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
}

export function StaticPlanCard({ plan, isPopular = false }: StaticPlanCardProps) {
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

  let resources: any = {};
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {};
  }

  return (
    <section
      className="flex flex-col border border-gray-200 rounded-xl bg-white shadow-sm relative"
      style={{ width: '258px' }}
    >
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{plan.Name}</h3>
          {isPopular && (
            <Badge className="bg-blue-600 z-10 text-white text-xs px-2 py-1 rounded-full absolute -top-4 left-1/2 leading-[14px] -translate-x-1/2">
              Most popular
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{plan.Description}</p>

        <div className="mb-4">
          {plan.Name === 'Hobby' && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-400 line-through">$40</span>
              <span className="text-4xl font-bold text-gray-900">$14</span>
              <span className="text-gray-600 ml-1">/month</span>
            </div>
          )}
          {plan.Name !== 'Hobby' && (
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                ${formatMoney(monthlyPrice).toFixed(0)}
              </span>
              <span className="text-gray-600 ml-1">/month</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="border-t border-slate-200"></div>
        </div>

        <ul className="space-y-3">
          {resources.cpu && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.cpu === '16'
                  ? '4 vCPU'
                  : resources.cpu === '4'
                    ? '2 vCPU'
                    : resources.cpu === '8'
                      ? '8 vCPU'
                      : resources.cpu === '64'
                        ? '64 vCPU'
                        : `${resources.cpu} CPU`}
              </span>
            </li>
          )}
          {resources.memory && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.memory === '32Gi'
                  ? '4GB RAM'
                  : resources.memory === '8Gi'
                    ? '2GB RAM'
                    : resources.memory === '16Gi'
                      ? '16GB RAM'
                      : resources.memory === '128Gi'
                        ? '128GB RAM'
                        : resources.memory}
              </span>
            </li>
          )}
          {resources.storage && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.storage === '500Gi'
                  ? '1GB Disk'
                  : resources.storage === '100Gi'
                    ? '5GB Disk'
                    : resources.storage === '200Gi'
                      ? '50GB Disk'
                      : resources.storage === '250Gi'
                        ? '250GB Disk'
                        : resources.storage}
              </span>
            </li>
          )}
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.Traffic === 50000
                ? '? Traffic'
                : plan.Traffic === 10000
                  ? '1GB Traffic'
                  : plan.Traffic === 20000
                    ? '100GB Traffic'
                    : plan.Traffic === 1000000
                      ? '1T Traffic'
                      : `${plan.Traffic}GB Traffic`}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.MaxSeats === 50
                ? '? Traffic'
                : plan.MaxSeats === 10
                  ? '? Traffic'
                  : plan.MaxSeats === 20
                    ? '? Traffic'
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
