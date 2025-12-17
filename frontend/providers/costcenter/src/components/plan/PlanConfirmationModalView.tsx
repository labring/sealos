import { CheckCircle, ArrowUpRight, HelpCircle, CreditCard, CircleCheck, Info } from 'lucide-react';
import { Button, Tooltip, TooltipTrigger, TooltipContent, Input } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethodInfo } from '@/types/plan';
import { displayMoney, formatMoney, formatTrafficAuto } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { BankCardIcon } from '../BankCardIcon';
import { BankCardBrand } from '../BankCardBrand';
import usePlanStore from '@/stores/plan';
import { useState, useEffect } from 'react';

interface PlanConfirmationModalViewProps {
  plan: SubscriptionPlan;
  workspaceName?: string;
  isCreateMode?: boolean;
  monthlyPrice: number;
  upgradeAmount?: number;
  amountLoading: boolean;
  paymentMethod?: PaymentMethodInfo | null;
  cardInfoLoading: boolean;
  manageCardLoading: boolean;
  onConfirm: () => void;
  onManageCards: () => void;
  onValidateRedeemCode?: (code: string) => Promise<void>;
  redeemCodeValidating?: boolean;
}

export function PlanConfirmationModalView({
  plan,
  workspaceName,
  isCreateMode = false,
  monthlyPrice,
  upgradeAmount,
  amountLoading,
  paymentMethod,
  cardInfoLoading,
  manageCardLoading,
  onConfirm,
  onManageCards,
  onValidateRedeemCode,
  redeemCodeValidating = false
}: PlanConfirmationModalViewProps) {
  const { t } = useTranslation();
  const isPaygType = usePlanStore((state) => state.isPaygType);
  const redeemCode = usePlanStore((state) => state.redeemCode);
  const redeemCodeDiscountRaw = usePlanStore((state) => state.redeemCodeDiscount);
  const redeemCodeValidated = usePlanStore((state) => state.redeemCodeValidated);

  const dueToday = upgradeAmount !== undefined ? upgradeAmount : monthlyPrice;
  const redeemCodeDiscount = redeemCodeDiscountRaw
    ? parseFloat(formatMoney(redeemCodeDiscountRaw).toFixed(2))
    : null;

  const [showRedeemInput, setShowRedeemInput] = useState(false);
  const [redeemInputValue, setRedeemInputValue] = useState('');

  useEffect(() => {
    if (redeemCode && !redeemCodeValidated) {
      setRedeemInputValue(redeemCode);
      setShowRedeemInput(true);
    }
  }, [redeemCode, redeemCodeValidated]);

  const hasCard = !!paymentMethod;
  const shouldShowTooltip = !isCreateMode && !isPaygType();

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

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

  let planResources: any = {};
  try {
    planResources = JSON.parse(plan.MaxResources || '{}');
  } catch (e) {
    planResources = {};
  }

  const handleApplyRedeemCode = () => {
    if (!redeemInputValue.trim() || !onValidateRedeemCode) return;
    onValidateRedeemCode(redeemInputValue.trim()).catch(() => {});
  };

  useEffect(() => {
    if (redeemCodeValidated) {
      setShowRedeemInput(false);
    }
  }, [redeemCodeValidated]);

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

          {/* Redeem Code Section */}
          <div className="flex flex-col gap-1">
            {!showRedeemInput && !redeemCodeValidated ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{t('common:discount')}</span>
                <button
                  type="button"
                  onClick={() => setShowRedeemInput(true)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
                >
                  <span>{t('common:enter_redeem_code')}</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ) : showRedeemInput && !redeemCodeValidated ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{t('common:discount')}</span>
                </div>
                <div className="flex gap-1 items-start">
                  <Input
                    type="text"
                    placeholder={t('common:enter_redeem_code')}
                    value={redeemInputValue}
                    onChange={(e) => setRedeemInputValue(e.target.value)}
                    className="flex-1 h-10"
                    disabled={redeemCodeValidating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyRedeemCode}
                    disabled={!redeemInputValue.trim()}
                    className="h-10 px-4"
                  >
                    {redeemCodeValidating ? t('common:calculating') : t('common:apply')}
                  </Button>
                </div>
                <div className="flex gap-1 items-center">
                  <Info size={16} className="text-zinc-500 shrink-0" />
                  <p className="text-sm text-zinc-500">
                    <span className="text-blue-600">{t('common:one_time_discount')}</span>{' '}
                    {t('common:renews_at_full_price')}
                  </p>
                </div>
              </div>
            ) : redeemCodeValidated ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{t('common:discount')}</span>
                  <span className="text-sm font-medium text-red-600">
                    -<CurrencySymbol />
                    {displayMoney(redeemCodeDiscount || 0)}
                  </span>
                </div>
                <div className="flex gap-1 items-center">
                  <CircleCheck size={16} className="text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-600">
                    {t('common:redeem_code_applied', { code: redeemCode })}
                  </p>
                </div>
              </div>
            ) : null}
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
                {shouldShowTooltip && (
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center cursor-help">
                      <HelpCircle size={16} className="text-zinc-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Prorated difference for the remainder of the current cycle. You will be
                        charged <CurrencySymbol />
                        {displayMoney(formatMoney(monthlyPrice))}/month starting next month.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {amountLoading ? (
                  t('common:calculating')
                ) : (
                  <>
                    <CurrencySymbol />
                    <span>{displayMoney(formatMoney(dueToday))}</span>
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
            <div className="bg-zinc-100 p-2 rounded-lg">
              {cardInfoLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-14 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : hasCard ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BankCardIcon brand={paymentMethod.card.brand} className="h-9 w-14 shrink-0" />
                    <BankCardBrand
                      brand={paymentMethod.card.brand}
                      className="text-sm font-medium text-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      •••• {paymentMethod.card.last4}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {t('common:expires')}:{' '}
                      {formatExpiryDate(paymentMethod.card.exp_month, paymentMethod.card.exp_year)}
                    </span>
                  </div>
                  <div className="bg-zinc-200 px-2 rounded-full">
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
