import { forwardRef, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethod } from '@/types/plan';
import { getUpgradeAmount, getCardInfo, createCardManageSession } from '@/api/plan';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';
import { useCustomToast } from '@/hooks/useCustomToast';
import { PlanConfirmationModalView } from './PlanConfirmationModalView';

interface PlanConfirmationModalProps {
  plan?: SubscriptionPlan;
  workspaceName?: string;
  isCreateMode?: boolean;
  isOpen?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onPaymentSuccess?: () => void;
}

const PlanConfirmationModal = forwardRef<never, PlanConfirmationModalProps>((props, _ref) => {
  const {
    plan: planProp,
    workspaceName: workspaceNameProp,
    isCreateMode: isCreateModeProp,
    isOpen,
    onConfirm,
    onCancel,
    onPaymentSuccess
  } = props;

  const { t } = useTranslation();
  const { toast } = useCustomToast();
  const queryClient = useQueryClient();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const {
    isPaygType,
    redeemCode,
    setRedeemCode,
    setRedeemCodeDiscount,
    setRedeemCodeValidated,
    clearRedeemCode,
    pendingPlan,
    modalContext,
    setUpgradeAmountData,
    setCardInfoData,
    setMonthlyPrice,
    setUpgradeAmount,
    setAmountLoading,
    setCardInfoLoading,
    isPaymentWaiting,
    setPromotionCodeError,
    stopPaymentWaiting,
    paymentUrl,
    subscriptionData
  } = usePlanStore();

  // Get plan and context from store (props take precedence for backward compatibility)
  const plan = planProp || pendingPlan || undefined;
  const workspaceName = workspaceNameProp || modalContext.workspaceName;
  const isCreateMode = isCreateModeProp ?? modalContext.isCreateMode ?? false;

  const region = getRegion();
  const workspace = session?.user?.nsid || '';
  const regionDomain = region?.domain || '';
  const period = '1m';
  const payMethod: PaymentMethod = 'stripe';

  const isPaygUser = isPaygType();
  const operator = isCreateMode || isPaygUser ? 'created' : 'upgraded';

  const {
    data: upgradeAmountData,
    isLoading: amountLoading,
    isError: isUpgradeAmountError,
    error: upgradeAmountError
  } = useQuery({
    queryKey: [
      'upgrade-amount',
      plan?.Name,
      workspace,
      regionDomain,
      period,
      payMethod,
      operator,
      redeemCode
    ],
    queryFn: () => {
      if (!plan || !workspace || !regionDomain) return null;
      return getUpgradeAmount({
        workspace,
        regionDomain,
        planName: plan.Name,
        period,
        payMethod,
        operator,
        promotionCode: redeemCode || undefined
      });
    },
    enabled: isOpen && !!(plan && workspace && regionDomain),
    retry: (failureCount, error: any) => {
      const errorStatus = error?.code || error?.response?.status;
      // Don't retry for 404, 410, 409 errors
      if (errorStatus === 404 || errorStatus === 410 || errorStatus === 409) return false;
      return failureCount < 3;
    },
    onSuccess: (data) => {
      if (data?.data) {
        setUpgradeAmountData(data.data);
        setUpgradeAmount(data.data.amount);
      }
    }
  });

  // Sync loading state to store
  useEffect(() => {
    setAmountLoading(amountLoading);
  }, [amountLoading, setAmountLoading]);

  const { data: cardInfoData, isLoading: cardInfoLoading } = useQuery({
    queryKey: ['card-info', workspace, regionDomain],
    queryFn: () =>
      getCardInfo({
        workspace,
        regionDomain
      }),
    enabled: isOpen && !!workspace && !!regionDomain,
    refetchOnMount: true,
    onSuccess: (data) => {
      if (data?.data) {
        setCardInfoData(data.data);
      }
    }
  });

  // Sync loading state to store
  useEffect(() => {
    setCardInfoLoading(cardInfoLoading);
  }, [cardInfoLoading, setCardInfoLoading]);

  // Show card management only if not create mode, not PAYG, and current plan is not Free
  // Use store data to ensure consistency with PlanConfirmationModalView
  const currentPlanName = subscriptionData?.subscription?.PlanName;
  const isFreePlan = !currentPlanName || currentPlanName.toLowerCase() === 'free';
  const shouldShowCardManagement = !isCreateMode && !isPaygUser && !isFreePlan;

  const manageCardMutation = useMutation({
    mutationFn: createCardManageSession,
    onSuccess: (data) => {
      if (data?.data?.success && data?.data?.url) {
        window.open(data.data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast({
          title: t('common:error'),
          description: t('common:failed_to_create_portal_session'),
          status: 'error'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error?.response?.data?.message || t('common:failed_to_create_portal_session'),
        status: 'error'
      });
    }
  });

  useEffect(() => {
    if (!isOpen || !plan) {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
      setPromotionCodeError(null);
      return;
    }

    if (!redeemCode) {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
      setPromotionCodeError(null);
      return;
    }

    const error = upgradeAmountError as any;
    const errorCode = error?.code || error?.response?.status || error?.response?.data?.code;
    const errorStatus = error?.response?.status || error?.code;

    // Handle different error status codes
    if (upgradeAmountError && errorStatus) {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
      setPromotionCodeError(errorStatus);

      if (lastErrorRedeemCodeRef.current !== redeemCode) {
        lastErrorRedeemCodeRef.current = redeemCode;

        let errorMessage = t('common:invalid_promotion_code');
        if (errorStatus === 404) {
          errorMessage = t('common:promotion_code_not_found');
        } else if (errorStatus === 410) {
          errorMessage = t('common:promotion_code_expired');
        } else if (errorStatus === 409) {
          errorMessage = t('common:promotion_code_exhausted');
        }

        toast({
          title: t('common:error'),
          description: errorMessage,
          status: 'error'
        });
      }
      return;
    }

    // Clear error when validation succeeds
    if (!upgradeAmountError) {
      setPromotionCodeError(null);
    }

    if (isUpgradeAmountError && upgradeAmountError && !errorStatus && !amountLoading) {
      const errorKey = `${redeemCode}-${errorCode || 'unknown'}`;
      if (lastRetryFailedErrorRef.current !== errorKey) {
        lastRetryFailedErrorRef.current = errorKey;
        toast({
          title: t('common:error'),
          description: t('common:error_calculating_prices'),
          status: 'error'
        });
        setRedeemCodeDiscount(null);
        setRedeemCodeValidated(false);
      }
      return;
    }

    if (!upgradeAmountError) {
      lastErrorRedeemCodeRef.current = null;
      lastRetryFailedErrorRef.current = null;
    }

    if (amountLoading) return;
    // Use data from query (which is synced to store via onSuccess)
    if (!upgradeAmountData?.data) return;

    const responseData = upgradeAmountData.data;

    if (responseData.has_discount) {
      const discountRaw = responseData.original_amount - responseData.amount;
      setRedeemCodeDiscount(discountRaw);
      setRedeemCodeValidated(true);
    } else {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    plan,
    redeemCode,
    upgradeAmountData,
    upgradeAmountError,
    amountLoading,
    isUpgradeAmountError
  ]);

  const handleValidateRedeemCode = async (code: string) => {
    if (!plan) return;
    setRedeemCode(code);
  };

  const handleManageCards = () => {
    if (!workspace || !regionDomain) {
      toast({
        title: t('common:error'),
        description: t('common:missing_workspace_or_region'),
        status: 'error'
      });
      return;
    }

    const urlParams = new URLSearchParams({
      mode: operator === 'created' ? 'create' : 'upgrade',
      plan: plan?.Name ?? '',
      showPaymentConfirmation: 'true'
    });

    if (workspaceName) {
      urlParams.set('workspaceName', workspaceName);
    }

    if (redeemCode) {
      urlParams.set('redeem', redeemCode);
    }

    const desktopUrl = new URL(
      `https://${regionDomain}/?openapp=system-costcenter?${encodeURIComponent(
        urlParams.toString()
      )}`
    );

    manageCardMutation.mutate({
      workspace,
      regionDomain,
      redirectUrl: desktopUrl.toString()
    });
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handlePaymentSuccess = () => {
    clearRedeemCode();
    onPaymentSuccess?.();
    onCancel?.(); // Close the modal
  };

  const handlePaymentCancel = () => {
    // Reset payment waiting state and allow user to retry
    stopPaymentWaiting();
    // Refetch upgrade amount to recalculate prices
    queryClient.invalidateQueries({ queryKey: ['upgrade-amount'] });
  };

  const lastErrorRedeemCodeRef = useRef<string | null>(null);
  const lastRetryFailedErrorRef = useRef<string | null>(null);

  // Calculate and sync monthly price to store
  useEffect(() => {
    if (plan) {
      const price = plan.Prices?.find((p) => p.BillingCycle === period)?.Price || 0;
      setMonthlyPrice(price);
    } else {
      setMonthlyPrice(null);
    }
  }, [plan, period, setMonthlyPrice]);

  if (!plan) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent closing when payment is waiting
        if (isPaymentWaiting) return;
        if (!open) {
          clearRedeemCode();
          onCancel?.();
        }
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-15px" />
      <DialogContent
        className={`${shouldShowCardManagement ? 'max-w-4xl!' : 'max-w-lg!'} pb-8 pt-0 px-10 gap-0`}
        showCloseButton={!isPaymentWaiting}
      >
        <div className="flex justify-center items-center px-6 py-5">
          <h2 className="text-2xl font-semibold text-gray-900 text-center leading-none">
            {isCreateMode ? t('common:create_workspace') : t('common:subscribe_plan')}
          </h2>
        </div>

        <PlanConfirmationModalView
          plan={plan}
          onConfirm={handleConfirm}
          onManageCards={handleManageCards}
          onValidateRedeemCode={handleValidateRedeemCode}
          manageCardLoading={manageCardMutation.isLoading}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={handlePaymentCancel}
        />
      </DialogContent>
    </Dialog>
  );
});

PlanConfirmationModal.displayName = 'PlanConfirmationModal';

export default PlanConfirmationModal;
