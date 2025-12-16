import { CheckCircle, ArrowUpRight, HelpCircle, CreditCard } from 'lucide-react';
import { Button } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethodInfo } from '@/types/plan';
import { displayMoney, formatMoney, formatTrafficAuto } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

interface PlanConfirmationModalViewProps {
  plan: SubscriptionPlan;
  workspaceName?: string;
  isCreateMode?: boolean;
  monthlyPrice: number;
  dueToday: number;
  amountLoading: boolean;
  paymentMethod?: PaymentMethodInfo | null;
  cardInfoLoading: boolean;
  manageCardLoading: boolean;
  onConfirm: () => void;
  onManageCards: () => void;
}

export function PlanConfirmationModalView({
  plan,
  workspaceName,
  isCreateMode = false,
  monthlyPrice,
  dueToday,
  amountLoading,
  paymentMethod,
  cardInfoLoading,
  manageCardLoading,
  onConfirm,
  onManageCards
}: PlanConfirmationModalViewProps) {
  const { t } = useTranslation();

  const hasCard = !!paymentMethod;

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  // Format plan resources
  const formatCpu = (cpu: string) => {
    const cpuNum = parseFloat(cpu);
    return `${cpuNum} vCPU`;
  };

  const formatMemory = (memory: string) => {
    return memory.replace('Gi', 'GB RAM');
  };

  const formatStorage = (storage: string) => {
    return storage.replace('Gi', 'GB Disk');
  };

  // Parse plan resources
  let planResources: any = {};
  try {
    planResources = JSON.parse(plan.MaxResources || '{}');
  } catch (e) {
    planResources = {};
  }

  return (
    <div className="flex border border-zinc-200 rounded-xl overflow-hidden">
      {/* Left Section: Order Summary */}
      <div className="bg-zinc-50 flex flex-col gap-6 p-6 w-full">
        <h3 className="text-base font-semibold text-gray-900 leading-none">
          {t('common:order_summary')}
        </h3>

        <div className="flex flex-col gap-3">
          {/* Plan Info */}
          <div className="flex justify-between items-center">
            <span className="text-base font-medium text-gray-900">
              {plan.Name} {t('common:plan')}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              <CurrencySymbol />
              <span>{displayMoney(formatMoney(monthlyPrice))}/mo</span>
            </span>
          </div>

          {/* Plan Resources */}
          <div className="flex flex-col gap-2">
            {planResources.cpu && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-zinc-500">{formatCpu(planResources.cpu)}</span>
              </div>
            )}
            {planResources.memory && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-zinc-500">{formatMemory(planResources.memory)}</span>
              </div>
            )}
            {planResources.storage && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-zinc-500">
                  {formatStorage(planResources.storage)}
                </span>
              </div>
            )}
            {plan.Traffic && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-zinc-500">{formatTrafficAuto(plan.Traffic)}</span>
              </div>
            )}
            {planResources.nodeports && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm text-zinc-500">{planResources.nodeports} Nodeport</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-zinc-100" />

          {/* Billing Summary */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">
                {t('common:total_billed_monthly')}
              </span>
              <span className="text-sm font-medium text-gray-900">
                <CurrencySymbol />
                <span>{displayMoney(formatMoney(monthlyPrice))}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{t('common:due_today')}</span>
                <HelpCircle size={16} className="text-zinc-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {amountLoading ? (
                  t('common:calculating')
                ) : (
                  <>
                    <CurrencySymbol />
                    <span>{formatMoney(dueToday)}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Payment Method */}
      <div className="flex flex-col justify-between p-6 w-full">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-gray-900 leading-none">
            {t('common:payment_method')}
          </h3>

          <div className="flex flex-col gap-3">
            {/* Card Info */}
            <div className="bg-gradient-to-r from-zinc-100/10 to-zinc-200/10 p-2 rounded-lg">
              {cardInfoLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-14 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : hasCard ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-14 bg-white border border-zinc-200 rounded flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-zinc-900">
                        {formatCardBrand(paymentMethod.card.brand).slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-zinc-900">
                      {formatCardBrand(paymentMethod.card.brand)}
                    </span>
                    <span className="text-sm font-medium text-zinc-900">
                      •••• {paymentMethod.card.last4}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {t('common:expires')}:{' '}
                      {formatExpiryDate(paymentMethod.card.exp_month, paymentMethod.card.exp_year)}
                    </span>
                  </div>
                  <div className="bg-zinc-200 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium text-zinc-500 leading-none">
                      {t('common:default')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-14 bg-gray-100 border border-gray-200 rounded flex items-center justify-center shrink-0">
                    <CreditCard className="size-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900">
                    {t('common:no_payment_method')}
                  </span>
                </div>
              )}
            </div>

            {/* Manage Card Info Button */}
            <button
              onClick={onManageCards}
              disabled={!hasCard || manageCardLoading}
              className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700 disabled:opacity-50"
            >
              <span>{t('common:manage_card_info')}</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        {/* Subscribe & Pay Button */}
        <Button className="w-full h-10" onClick={onConfirm} disabled={amountLoading}>
          {amountLoading
            ? t('common:calculating')
            : isCreateMode
              ? t('common:create_workspace')
              : t('common:subscribe_and_pay')}
        </Button>
      </div>
    </div>
  );
}
