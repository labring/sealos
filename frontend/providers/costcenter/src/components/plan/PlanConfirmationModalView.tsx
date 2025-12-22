import {
  CheckCircle,
  ArrowUpRight,
  HelpCircle,
  CreditCard,
  CircleCheck,
  Info,
  LoaderCircle
} from 'lucide-react';
import { Button, Tooltip, TooltipTrigger, TooltipContent, Input } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethodInfo } from '@/types/plan';
import { displayMoney, formatMoney, formatTrafficAuto } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { BankCardIcon } from '../BankCardIcon';
import { BankCardBrand } from '../BankCardBrand';
import usePlanStore from '@/stores/plan';
import { useState, useEffect, ReactNode, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLastTransaction } from '@/api/plan';
import { openInNewWindow } from '@/utils/windowUtils';

interface PlanConfirmationModalViewProps {
  plan: SubscriptionPlan;
  onConfirm: () => void;
  onManageCards: () => void;
  onValidateRedeemCode?: (code: string) => Promise<void>;
  manageCardLoading: boolean;
  onPaymentSuccess?: () => void;
  onPaymentCancel?: () => void;
  isSubmitting?: boolean;
}

// ==================== Plan Display Component ====================
interface PlanDisplayProps {
  plan: SubscriptionPlan;
  monthlyPrice: number;
}

function PlanDisplay({ plan, monthlyPrice }: PlanDisplayProps) {
  const { t } = useTranslation();

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

  return (
    <>
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
            <span className="text-sm text-zinc-500">{formatStorage(planResources.storage)}</span>
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
    </>
  );
}

// ==================== Promotion Code Component ====================
interface PromotionCodeProps {
  onValidateRedeemCode?: (code: string) => Promise<void>;
  redeemCodeValidating?: boolean;
  disabled?: boolean;
}

function PromotionCode({
  onValidateRedeemCode,
  redeemCodeValidating = false,
  disabled = false
}: PromotionCodeProps) {
  const { t } = useTranslation();
  const redeemCode = usePlanStore((state) => state.redeemCode);
  const redeemCodeDiscountRaw = usePlanStore((state) => state.redeemCodeDiscount);
  const redeemCodeValidated = usePlanStore((state) => state.redeemCodeValidated);
  const promotionCodeError = usePlanStore((state) => state.promotionCodeError);
  const setRedeemCode = usePlanStore((state) => state.setRedeemCode);

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

  // Clear input and show error state when there's an error
  useEffect(() => {
    if (promotionCodeError) {
      setRedeemInputValue('');
      setShowRedeemInput(true);
      setRedeemCode(null);
    }
  }, [promotionCodeError, setRedeemCode]);

  useEffect(() => {
    if (redeemCodeValidated) {
      setShowRedeemInput(false);
    }
  }, [redeemCodeValidated]);

  const handleApplyRedeemCode = () => {
    if (!redeemInputValue.trim() || !onValidateRedeemCode) return;
    onValidateRedeemCode(redeemInputValue.trim()).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-1">
      {!showRedeemInput && !redeemCodeValidated ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{t('common:discount')}</span>
          <button
            type="button"
            onClick={() => setShowRedeemInput(true)}
            disabled={disabled}
            className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{t('common:enter_promotion_code')}</span>
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
              placeholder={t('common:enter_promotion_code')}
              value={redeemInputValue}
              onChange={(e) => {
                setRedeemInputValue(e.target.value);
              }}
              className={`flex-1 h-10 ${
                promotionCodeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              disabled={redeemCodeValidating || disabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyRedeemCode}
              disabled={!redeemInputValue.trim() || disabled}
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
              {t('common:promotion_code_applied', { code: redeemCode })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ==================== Price Display Component ====================
interface PriceDisplayProps {
  monthlyPrice: number;
  upgradeAmount?: number;
  amountLoading: boolean;
  isCreateMode?: boolean;
}

function PriceDisplay({
  monthlyPrice,
  upgradeAmount,
  amountLoading,
  isCreateMode = false
}: PriceDisplayProps) {
  const { t } = useTranslation();
  const isPaygType = usePlanStore((state) => state.isPaygType);
  const shouldShowTooltip = !isCreateMode && !isPaygType();

  const hasUpgradeAmount = upgradeAmount !== undefined && upgradeAmount !== null;
  const dueToday = hasUpgradeAmount ? upgradeAmount : monthlyPrice;
  const shouldShowCalculating = amountLoading || !hasUpgradeAmount;

  return (
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
                  {t('common:prorated_difference_tooltip_part1')} <CurrencySymbol />
                  {displayMoney(formatMoney(monthlyPrice))}
                  {t('common:prorated_difference_tooltip_part2')}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {shouldShowCalculating ? (
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
  );
}

// ==================== Card Management Component ====================
interface CardManagementProps {
  paymentMethod?: PaymentMethodInfo | null;
  cardInfoLoading: boolean;
  manageCardLoading: boolean;
  onManageCards: () => void;
}

function CardManagement({
  paymentMethod,
  cardInfoLoading,
  manageCardLoading,
  onManageCards
}: CardManagementProps) {
  const { t } = useTranslation();
  const hasCard = !!paymentMethod;

  return (
    <div className="flex flex-col gap-3">
      {/* Card Info */}
      <div className="bg-zinc-100 p-2 rounded-lg">
        {cardInfoLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-9 w-14 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : hasCard ? (
          <div className="flex items-center gap-2">
            <BankCardIcon brand={paymentMethod.card.brand} className="h-9 w-14 shrink-0" />
            <BankCardBrand
              brand={paymentMethod.card.brand}
              className="text-sm font-medium text-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-900">
              •••• {paymentMethod.card.last4}
            </span>
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
  );
}

// ==================== Payment Waiting Section Component ====================
interface PaymentWaitingSectionProps {
  workspace?: string;
  regionDomain?: string;
  paymentUrl?: string | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

function PaymentWaitingSection({
  workspace,
  regionDomain,
  paymentUrl,
  onCancel,
  onSuccess
}: PaymentWaitingSectionProps) {
  const { t } = useTranslation();
  const {
    setLastTransactionData,
    stopPaymentWaiting,
    paymentWaitingTimeout,
    paymentWaitingShouldStopPolling,
    paymentWaitingFirstDataTime,
    setPaymentWaitingTimeout,
    setPaymentWaitingShouldStopPolling,
    setPaymentWaitingFirstDataTime
  } = usePlanStore();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Poll for last transaction
  const { data: transactionData, dataUpdatedAt } = useQuery({
    queryKey: ['payment-waiting-transaction', workspace, regionDomain],
    queryFn: () =>
      getLastTransaction({
        workspace: workspace || '',
        regionDomain: regionDomain || ''
      }),
    enabled:
      !!(workspace && regionDomain) && !paymentWaitingShouldStopPolling && !paymentWaitingTimeout,
    refetchInterval: paymentWaitingShouldStopPolling || paymentWaitingTimeout ? false : 3000, // Poll every 3 seconds
    refetchOnMount: true
  });

  // Sync to store and log when data is received
  useEffect(() => {
    if (transactionData?.data) {
      setLastTransactionData(transactionData.data);
      // Record the time when we first receive transaction data
      if (paymentWaitingFirstDataTime === null) {
        setPaymentWaitingFirstDataTime(Date.now());
      }
    }
  }, [
    transactionData,
    setLastTransactionData,
    paymentWaitingFirstDataTime,
    setPaymentWaitingFirstDataTime
  ]);

  // Check for payment timeout on every poll
  useEffect(() => {
    if (paymentWaitingFirstDataTime && !paymentWaitingTimeout && dataUpdatedAt > 0) {
      const firstDataTime = paymentWaitingFirstDataTime;
      const currentTime = Date.now();
      const timeDiff = currentTime - firstDataTime;

      const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (timeDiff > tenMinutesInMs) {
        setPaymentWaitingTimeout(true);
        setPaymentWaitingShouldStopPolling(true);
      }
    }
  }, [
    dataUpdatedAt,
    paymentWaitingTimeout,
    paymentWaitingFirstDataTime,
    setPaymentWaitingTimeout,
    setPaymentWaitingShouldStopPolling
  ]);

  // Handle transaction status changes
  useEffect(() => {
    const status = transactionData?.data?.transaction?.Status;
    if (status === 'completed') {
      // Stop polling
      setPaymentWaitingShouldStopPolling(true);
      // Show success animation
      setShowSuccessAnimation(true);
      // Call onSuccess callback after animation
      setTimeout(() => {
        stopPaymentWaiting();
        onSuccess?.();
      }, 2000);
    }
  }, [
    transactionData?.data?.transaction?.Status,
    onSuccess,
    stopPaymentWaiting,
    setPaymentWaitingShouldStopPolling
  ]);

  const transactionStatus = transactionData?.data?.transaction?.Status;
  const isPending = transactionStatus === 'pending';
  const isFailed = transactionStatus === 'failed';
  const isCompleted = transactionStatus === 'completed';

  const handleOpenPaymentPage = () => {
    if (paymentUrl) {
      openInNewWindow(paymentUrl);
    }
  };

  const handleCancel = () => {
    stopPaymentWaiting();
    onCancel?.();
  };

  const handleTimeoutCancel = () => {
    handleCancel();
  };

  // Timeout state
  if (paymentWaitingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <div className="relative">
          <div className="relative rounded-full p-4">
            <HelpCircle size={64} strokeWidth={1} className="text-orange-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">
          {t('common:payment_timeout')}
        </h3>
        <p className="text-sm text-gray-600 text-center px-4">
          {t('common:payment_timeout_message')}
        </p>
        <div className="flex items-center justify-center gap-2 w-full flex-col pt-2">
          <Button type="button" variant="default" onClick={handleTimeoutCancel}>
            {t('common:retry_payment')}
          </Button>
        </div>
      </div>
    );
  }

  // Success animation
  if (showSuccessAnimation || isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <div className="relative">
          <div className="animate-ping absolute inset-0 rounded-full bg-green-500/10 opacity-75"></div>
          <div className="relative rounded-full p-4">
            <CircleCheck size={64} strokeWidth={1} className="text-green-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">
          {t('common:payment_successful')}
        </h3>
        <p className="text-sm text-gray-600 text-center">
          {t('common:payment_completed_successfully')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-4">
      {/* Loading spinner */}
      {(isPending || !transactionStatus) && (
        <LoaderCircle className="animate-spin  text-blue-600" size={64} strokeWidth={1} />
      )}

      {/* Failed state - still show spinner but with error message */}
      {isFailed && (
        <>
          <LoaderCircle className="animate-spin text-blue-600" size={64} strokeWidth={1} />
          <div className="text-sm text-red-600 text-center px-4">
            {t('common:payment_error_retry')}
          </div>
        </>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 text-center">
        {t('common:waiting_for_payment')}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center">{t('common:please_complete_payment')}</p>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2 w-full flex-col">
        {paymentUrl && (
          <Button type="button" variant="default" onClick={handleOpenPaymentPage}>
            {t('common:open_payment_page_again')}
          </Button>
        )}
        <Button type="button" variant="link" onClick={handleCancel}>
          {t('common:cancel')}
        </Button>
      </div>
    </div>
  );
}

// ==================== Action Button Component ====================
interface ActionButtonProps {
  isCreateMode?: boolean;
  amountLoading: boolean;
  onConfirm: () => void;
  isPaymentWaiting?: boolean;
  isSubmitting?: boolean;
}

function ActionButton({
  isCreateMode = false,
  amountLoading,
  onConfirm,
  isPaymentWaiting = false,
  isSubmitting: isSubmittingProp = false
}: ActionButtonProps) {
  const { t } = useTranslation();
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  // Use prop if provided, otherwise use local state
  const isSubmitting = isSubmittingProp || isSubmittingLocal;

  // Reset submitting state when payment waiting starts (payment page opened)
  useEffect(() => {
    if (isPaymentWaiting) {
      setIsSubmittingLocal(false);
    }
  }, [isPaymentWaiting]);

  // Reset submitting state if payment fails (after a delay to allow for error handling)
  // Only reset if we're still submitting but payment waiting hasn't started
  useEffect(() => {
    if (isSubmittingLocal && !isPaymentWaiting && !isSubmittingProp) {
      const timer = setTimeout(() => {
        // Reset submitting state after delay if payment waiting hasn't started
        // This handles the case where payment fails
        setIsSubmittingLocal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSubmittingLocal, isPaymentWaiting, isSubmittingProp]);

  const handleClick = () => {
    // Prevent click if loading or submitting
    if (amountLoading || isSubmitting) {
      return;
    }
    if (!isSubmittingProp) {
      setIsSubmittingLocal(true);
    }
    onConfirm();
  };

  return (
    <Button className="w-full h-10" onClick={handleClick} disabled={amountLoading || isSubmitting}>
      {amountLoading || isSubmitting
        ? t('common:calculating')
        : isCreateMode
          ? t('common:create_workspace')
          : t('common:subscribe_and_pay')}
    </Button>
  );
}

// ==================== Left Section Component ====================
interface LeftSectionProps {
  children: ReactNode;
  actionButton?: ReactNode;
}

function LeftSection({ children, actionButton }: LeftSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-zinc-50 flex flex-col gap-6 p-6 w-full">
      <h3 className="text-base font-semibold text-gray-900 leading-none">
        {t('common:order_summary')}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
      {actionButton && <div className="mt-auto pt-4">{actionButton}</div>}
    </div>
  );
}

// ==================== Right Section Component ====================
interface RightSectionProps {
  children: ReactNode;
  actionButton?: ReactNode;
}

function RightSection({ children, actionButton }: RightSectionProps) {
  return (
    <div className="flex flex-col justify-between p-6 w-full">
      <div className="flex flex-col gap-3">{children}</div>
      {actionButton && <div className="mt-auto pt-4">{actionButton}</div>}
    </div>
  );
}

// ==================== Main Component ====================
export function PlanConfirmationModalView({
  plan,
  onConfirm,
  onManageCards,
  onValidateRedeemCode,
  manageCardLoading,
  onPaymentSuccess,
  onPaymentCancel,
  isSubmitting
}: PlanConfirmationModalViewProps) {
  const { t } = useTranslation();
  const {
    isPaygType,
    modalContext,
    monthlyPrice,
    upgradeAmount,
    amountLoading,
    cardInfoData,
    cardInfoLoading,
    isPaymentWaiting,
    paymentWaitingWorkspace,
    paymentWaitingRegionDomain,
    paymentUrl,
    subscriptionData
  } = usePlanStore();

  const isCreateMode = modalContext.isCreateMode ?? false;
  const paymentMethod = cardInfoData?.payment_method;
  const redeemCodeValidating = amountLoading;

  // Show card management only if not create mode, not PAYG, and current plan is not Free
  // Use same logic as PlanConfirmationModal for consistency
  const currentPlanName = subscriptionData?.subscription?.PlanName;
  const isFreePlan = !currentPlanName || currentPlanName.toLowerCase() === 'free';
  const shouldShowCardManagement = !isCreateMode && !isPaygType() && !isFreePlan;

  const actionButton = isPaymentWaiting ? (
    <PaymentWaitingSection
      workspace={paymentWaitingWorkspace}
      regionDomain={paymentWaitingRegionDomain}
      paymentUrl={paymentUrl}
      onCancel={onPaymentCancel}
      onSuccess={onPaymentSuccess}
    />
  ) : (
    <ActionButton
      isCreateMode={isCreateMode}
      amountLoading={amountLoading ?? true}
      onConfirm={onConfirm}
      isPaymentWaiting={isPaymentWaiting}
      isSubmitting={isSubmitting}
    />
  );

  const leftContent = (
    <>
      <PlanDisplay plan={plan} monthlyPrice={monthlyPrice ?? 0} />
      <div className="border-t border-zinc-100" />
      <PromotionCode
        onValidateRedeemCode={onValidateRedeemCode}
        redeemCodeValidating={redeemCodeValidating}
        disabled={isPaymentWaiting}
      />
      <div className="border-t border-zinc-100" />
      <PriceDisplay
        monthlyPrice={monthlyPrice ?? 0}
        upgradeAmount={upgradeAmount ?? undefined}
        amountLoading={amountLoading ?? true}
        isCreateMode={isCreateMode}
      />
    </>
  );

  // Single column layout without card management (create mode or PAYG)
  if (!shouldShowCardManagement) {
    return (
      <div className="flex flex-col border border-zinc-200 rounded-xl overflow-hidden">
        <LeftSection actionButton={actionButton}>{leftContent}</LeftSection>
      </div>
    );
  }

  // Two column layout with card management
  const rightContent = (
    <>
      <h3 className="text-base font-semibold text-gray-900 leading-none">
        {t('common:payment_method')}
      </h3>
      <CardManagement
        paymentMethod={paymentMethod}
        cardInfoLoading={cardInfoLoading}
        manageCardLoading={manageCardLoading}
        onManageCards={onManageCards}
      />
    </>
  );

  return (
    <div className="flex border border-zinc-200 rounded-xl overflow-hidden">
      <LeftSection>{leftContent}</LeftSection>
      <RightSection actionButton={actionButton}>{rightContent}</RightSection>
    </div>
  );
}
