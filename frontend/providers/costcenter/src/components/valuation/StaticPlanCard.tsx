import { SubscriptionPlan } from '@/types/plan';
import { CircleCheck } from 'lucide-react';
import { Badge } from '@sealos/shadcn-ui/badge';
import { formatMoney, formatTrafficAuto } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { PlanAdditionalFeaturesOverride } from '@/constants/plan';

interface StaticPlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
}

export function StaticPlanCard({ plan, isPopular = false }: StaticPlanCardProps) {
  const { t } = useTranslation();
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
  const originalPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.OriginalPrice || 0;

  const resources = plan.MaxResources;

  return (
    <section
      className="flex flex-col border border-gray-200 rounded-xl flex-1 bg-white shadow-sm relative"
      style={{ width: '258px' }}
    >
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{plan.Name}</h3>
          {isPopular && (
            <Badge className="bg-blue-600 z-10 text-white text-xs px-2 py-1 rounded-full absolute -top-4 left-1/2 leading-[14px] -translate-x-1/2">
              {t('common:most_popular')}
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed h-[3lh]">{plan.Description}</p>

        <div className="mb-4">
          <div className="flex items-baseline">
            {originalPrice > 0 && (
              <span className="text-4xl font-bold text-gray-400 line-through">
                <CurrencySymbol />
                <span>{formatMoney(originalPrice).toFixed(0)}</span>
              </span>
            )}
            <span className="text-4xl font-bold text-gray-900">
              <CurrencySymbol />
              <span>{formatMoney(monthlyPrice).toFixed(0)}</span>
            </span>
            <span className="text-gray-600 ml-1">/{t('common:month')}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-t border-slate-200"></div>
        </div>

        <ul className="space-y-3">
          {resources.cpu && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.cpu.formatForDisplay({ format: 'DecimalSI' })}{' '}
                {t('common:valuation.vcpu')}
              </span>
            </li>
          )}
          {resources.memory && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.memory.formatForDisplay({ format: 'BinarySI' })}{' '}
                {t('common:valuation.ram')}
              </span>
            </li>
          )}
          {resources.storage && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.storage.formatForDisplay({ format: 'BinarySI' })}{' '}
                {t('common:valuation.disk')}
              </span>
            </li>
          )}

          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">{formatTrafficAuto(plan.Traffic)}</span>
          </li>

          {resources.nodeports && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.nodeports.toString()} {t('common:valuation.nodeport')}
              </span>
            </li>
          )}
          {plan.AIQuota && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {formatMoney(plan.AIQuota * 100)} {t('common:valuation.ai_credits')}
              </span>
            </li>
          )}
          {(() => {
            const planName = plan.Name.toLowerCase();
            const matchedKey = Array.from(PlanAdditionalFeaturesOverride.keys()).find((key) =>
              planName.includes(key.toLowerCase())
            );
            const features = matchedKey ? PlanAdditionalFeaturesOverride.get(matchedKey) || [] : [];

            return features.map((featureKey, index) => (
              <li key={index} className="flex items-center gap-3">
                <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{t(featureKey)}</span>
              </li>
            ));
          })()}
        </ul>
      </div>
    </section>
  );
}
