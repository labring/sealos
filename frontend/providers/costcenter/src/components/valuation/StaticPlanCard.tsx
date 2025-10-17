import { SubscriptionPlan } from '@/types/plan';
import { CircleCheck } from 'lucide-react';
import { Badge } from '@sealos/shadcn-ui/badge';
import { formatMoney, formatTrafficAuto } from '@/utils/format';

interface StaticPlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
}

export function StaticPlanCard({ plan, isPopular = false }: StaticPlanCardProps) {
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
          <div className="flex items-baseline">
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
        </div>

        <div className="mb-6">
          <div className="border-t border-slate-200"></div>
        </div>

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
