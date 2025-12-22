import { forwardRef, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethod } from '@/types/plan';
import { getUpgradeAmount, getCardInfo, createCardManageSession, cancelInvoice } from '@/api/plan';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';
import { useCustomToast } from '@/hooks/useCustomToast';
import { PlanConfirmationModalView } from './PlanConfirmationModalView';
import { PendingUpgradeDialog } from './PendingUpgradeDialog';
import { openInNewWindow } from '@/utils/windowUtils';

interface PlanConfirmationModalProps {
  plan?: SubscriptionPlan;
  workspaceName?: string;
  isCreateMode?: boolean;
  isOpen?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onPaymentSuccess?: () => void;
  isSubmitting?: boolean;
}

const PlanConfirmationModal = forwardRef<never, PlanConfirmationModalProps>((props, _ref) => {
  const {
    plan: planProp,
    workspaceName: workspaceNameProp,
    isCreateMode: isCreateModeProp,
    isOpen,
    onConfirm,
    onCancel,
    onPaymentSuccess,
    isSubmitting: isSubmittingProp
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
    subscriptionData,
    lastTransactionData,
    hideModal,
    resetConfirmationModal,
    pendingUpgrade,
    setPendingUpgrade,
    showPendingUpgradeDialog,
    setShowPendingUpgradeDialog,
    plansData,
    paymentWaitingInvoiceId,
    startPaymentWaiting,
    showConfirmationModal
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

  // Don't query upgrade-amount when payment is waiting
  const queryEnabled = isOpen && !!(plan && workspace && regionDomain) && !isPaymentWaiting;

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
    enabled: queryEnabled,
    retry: (failureCount, error: any) => {
      // Extract code from error object
      // When API uses jsonRes, response interceptor rejects response.data which contains { code, message, data }
      // So error is the response.data itself with code field
      const errorCode = error?.code;

      // Don't retry for 404, 410, 409 errors
      if (errorCode === 404 || errorCode === 410 || errorCode === 409) {
        return false;
      }

      return failureCount < 3;
    },
    onSuccess: (data) => {
      if (data?.data) {
        setUpgradeAmountData(data.data);
        setUpgradeAmount(data.data.amount);
      }
    },
    onError: (error: any) => {
      // Extract code and pending_upgrade from error object
      // When API uses jsonRes, response interceptor rejects response.data which contains { code, message, data }
      // So error is the response.data itself: { code: 409, message: "...", data: { pending_upgrade: {...} } }
      const errorCode = error?.code;
      const pendingUpgrade = error?.data?.pending_upgrade;

      // Handle 409 error with pending_upgrade
      if (errorCode === 409 && pendingUpgrade) {
        setPendingUpgrade(pendingUpgrade);
        setShowPendingUpgradeDialog(true);
        // Stop retrying (already handled in retry function, but ensure we don't process further)
        return;
      }
    }
  });

  // Sync loading state to store
  useEffect(() => {
    const shouldShowLoading =
      !queryEnabled ||
      amountLoading ||
      (queryEnabled && !amountLoading && !upgradeAmountData && !isUpgradeAmountError);
    setAmountLoading(shouldShowLoading);
  }, [amountLoading, queryEnabled, upgradeAmountData, isUpgradeAmountError, setAmountLoading]);

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
        hideModal();
        onCancel?.();
        openInNewWindow(data.data.url);
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
    const errorData = error?.response?.data || error?.data;

    // Skip promotion code error handling if it's a pending upgrade conflict
    if (errorStatus === 409 && errorData?.pending_upgrade) {
      // This is handled in onError callback, don't show promotion code error
      return;
    }

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

  // Handle cancel payment waiting invoice mutation
  const cancelPaymentWaitingMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: (data) => {
      // Show success toast
      toast({
        title: t('common:success'),
        description: t('common:cancel_invoice_success'),
        status: 'success'
      });
      // Reset payment waiting state and close modal after successful cancellation
      stopPaymentWaiting();
      handleModalClose(true); // Force close after successful cancellation
      onCancel?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description:
          error?.response?.data?.message ||
          error?.data?.message ||
          t('common:cancel_invoice_error'),
        status: 'error'
      });
      // Close modal even if cancel fails - always close after request completes
      stopPaymentWaiting();
      handleModalClose(true); // Force close after failed cancellation
      onCancel?.(); // Trigger Dialog close
    }
  });

  const handlePaymentCancel = () => {
    const invoiceId = paymentWaitingInvoiceId;

    // If there's an invoice ID, try to cancel it first
    if (invoiceId && workspace && regionDomain) {
      cancelPaymentWaitingMutation.mutate({
        workspace,
        regionDomain,
        invoiceID: invoiceId
      });
    } else {
      // No invoice ID, just close the modal
      stopPaymentWaiting();
      handleModalClose();
      onCancel?.();
    }
  };

  // Handle continue payment for pending upgrade
  const handleContinuePendingPayment = () => {
    if (!pendingUpgrade || !workspace || !regionDomain) return;

    // Find the plan by name
    const pendingPlanObj = plansData?.plans?.find((p) => p.Name === pendingUpgrade.plan_name);
    if (!pendingPlanObj) {
      toast({
        title: t('common:error'),
        description: `Plan ${pendingUpgrade.plan_name} not found`,
        status: 'error'
      });
      return;
    }

    // Update modal to show pending plan
    showConfirmationModal(pendingPlanObj, modalContext);

    // Calculate original amount
    // If original_amount is provided and > 0, use it
    // Otherwise, use total_amount if available, or fallback to amount_due
    const originalAmount =
      pendingUpgrade.original_amount !== undefined && pendingUpgrade.original_amount > 0
        ? pendingUpgrade.original_amount
        : pendingUpgrade.total_amount !== undefined && pendingUpgrade.total_amount > 0
          ? pendingUpgrade.total_amount
          : pendingUpgrade.amount_due;

    // Set discount information if available
    const hasDiscount = pendingUpgrade.has_discount ?? false;
    const discountAmount = pendingUpgrade.discount_amount ?? 0;
    const promotionCode = pendingUpgrade.promotion_code || '';

    // Set redeem code if promotion code exists
    if (promotionCode) {
      setRedeemCode(promotionCode);
      if (hasDiscount && discountAmount > 0) {
        setRedeemCodeDiscount(discountAmount);
        setRedeemCodeValidated(true);
      }
    }

    // Set the plan and amount from pending upgrade
    setUpgradeAmountData({
      amount: pendingUpgrade.amount_due,
      promotion_code: promotionCode,
      has_discount: hasDiscount,
      original_amount: originalAmount
    });
    setUpgradeAmount(pendingUpgrade.amount_due);
    // Set monthly price to original amount (before discount)
    setMonthlyPrice(originalAmount);
    setAmountLoading(false);

    // Start payment waiting mode with invoice ID
    startPaymentWaiting(
      workspace,
      regionDomain,
      pendingUpgrade.payment_url,
      pendingUpgrade.invoice_id
    );
    openInNewWindow(pendingUpgrade.payment_url);

    // Clear pending upgrade state
    setPendingUpgrade(null);
  };

  // Handle cancel invoice mutation
  const cancelInvoiceMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      // Close dialog and refresh upgrade amount
      toast({
        title: t('common:success'),
        description: t('common:cancel_invoice_success'),
        status: 'success'
      });

      setPendingUpgrade(null);
      setShowPendingUpgradeDialog(false);
      // Refetch upgrade amount
      queryClient.invalidateQueries({ queryKey: ['upgrade-amount'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description:
          error?.response?.data?.message ||
          error?.data?.message ||
          t('common:cancel_invoice_error'),
        status: 'error'
      });
    }
  });

  // Handle cancel and pay new order
  const handleCancelAndPayNew = () => {
    if (!pendingUpgrade || !workspace || !regionDomain) return;

    cancelInvoiceMutation.mutate({
      workspace,
      regionDomain,
      invoiceID: pendingUpgrade.invoice_id
    });
  };

  // Handle modal close - reset state and invalidate queries
  // allowForceClose: if true, close even when canceling invoice (used in mutation callbacks)
  const handleModalClose = (allowForceClose = false) => {
    // Prevent closing when canceling invoice (unless force close is allowed)
    if (!allowForceClose && cancelPaymentWaitingMutation.isLoading) {
      return;
    }

    // Reset confirmation modal state
    resetConfirmationModal();
    clearRedeemCode();
    stopPaymentWaiting();

    // Invalidate queries to refresh data (same as plan page)
    queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
    queryClient.invalidateQueries({ queryKey: ['upgrade-amount'] });
    queryClient.invalidateQueries({ queryKey: ['card-info'] });
    queryClient.invalidateQueries({ queryKey: ['payment-waiting-transaction'] });
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
    <>
      {/* Pending Upgrade Dialog */}
      {pendingUpgrade && (
        <PendingUpgradeDialog
          pendingUpgrade={pendingUpgrade}
          onContinuePayment={handleContinuePendingPayment}
          onCancelAndPayNew={handleCancelAndPayNew}
          isCanceling={cancelInvoiceMutation.isLoading}
        />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Prevent closing when payment is waiting or canceling invoice
          if (isPaymentWaiting || cancelPaymentWaitingMutation.isLoading) return;
          if (!open) {
            handleModalClose();
            onCancel?.();
          }
        }}
      >
        <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-15px" />
        <DialogContent
          className={`${
            shouldShowCardManagement ? 'max-w-4xl!' : 'max-w-lg!'
          } pb-8 pt-0 px-10 gap-0`}
          showCloseButton={!isPaymentWaiting && !cancelPaymentWaitingMutation.isLoading}
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
            isSubmitting={isSubmittingProp}
            isCancelingInvoice={cancelPaymentWaitingMutation.isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
});

PlanConfirmationModal.displayName = 'PlanConfirmationModal';

export default PlanConfirmationModal;
