import { forwardRef, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethod } from '@/types/plan';
import { getUpgradeAmount, getCardInfo, createCardManageSession } from '@/api/plan';
import { useQuery, useMutation } from '@tanstack/react-query';
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
}

const PlanConfirmationModal = forwardRef<never, PlanConfirmationModalProps>((props, _ref) => {
  const { plan, workspaceName, isCreateMode = false, isOpen = false, onConfirm, onCancel } = props;

  const { t } = useTranslation();
  const { toast } = useCustomToast();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const isPaygType = usePlanStore((state) => state.isPaygType);
  const redeemCode = usePlanStore((state) => state.redeemCode);
  const setRedeemCode = usePlanStore((state) => state.setRedeemCode);
  const setRedeemCodeDiscount = usePlanStore((state) => state.setRedeemCodeDiscount);
  const setRedeemCodeValidated = usePlanStore((state) => state.setRedeemCodeValidated);
  const clearRedeemCode = usePlanStore((state) => state.clearRedeemCode);

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
        discountCode: redeemCode || undefined
      });
    },
    enabled: isOpen && !!(plan && workspace && regionDomain),
    retry: (failureCount, error: any) => {
      if (error?.code === 404 || error?.response?.status === 404) return false;
      return failureCount < 3;
    }
  });

  const { data: cardInfoData, isLoading: cardInfoLoading } = useQuery({
    queryKey: ['card-info', workspace, regionDomain],
    queryFn: () =>
      getCardInfo({
        workspace,
        regionDomain
      }),
    enabled: isOpen && !!workspace && !!regionDomain,
    refetchOnMount: true
  });

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
      return;
    }

    if (!redeemCode) {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
      return;
    }

    const error = upgradeAmountError as any;
    const errorCode = error?.code || error?.response?.status || error?.response?.data?.code;

    if (upgradeAmountError && errorCode === 404) {
      setRedeemCodeDiscount(null);
      setRedeemCodeValidated(false);
      if (lastErrorRedeemCodeRef.current !== redeemCode) {
        lastErrorRedeemCodeRef.current = redeemCode;
        toast({
          title: t('common:error'),
          description: t('common:invalid_redeem_code'),
          status: 'error'
        });
      }
      return;
    }

    if (isUpgradeAmountError && upgradeAmountError && errorCode !== 404 && !amountLoading) {
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

  const lastErrorRedeemCodeRef = useRef<string | null>(null);
  const lastRetryFailedErrorRef = useRef<string | null>(null);

  if (!plan) {
    return null;
  }

  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === period)?.Price || 0;
  const upgradeAmount = upgradeAmountData?.data?.amount;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          clearRedeemCode();
          onCancel?.();
        }
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-15px" />
      <DialogContent className="max-w-4xl! pb-8 pt-0 px-10 gap-0">
        <div className="flex justify-center items-center px-6 py-5">
          <h2 className="text-2xl font-semibold text-gray-900 text-center leading-none">
            {isCreateMode ? t('common:create_workspace') : t('common:subscribe_plan')}
          </h2>
        </div>

        <PlanConfirmationModalView
          plan={plan}
          workspaceName={workspaceName}
          isCreateMode={isCreateMode}
          monthlyPrice={monthlyPrice}
          upgradeAmount={upgradeAmount}
          amountLoading={amountLoading}
          paymentMethod={cardInfoData?.data?.payment_method}
          cardInfoLoading={cardInfoLoading}
          manageCardLoading={manageCardMutation.isLoading}
          onConfirm={handleConfirm}
          onManageCards={handleManageCards}
          onValidateRedeemCode={handleValidateRedeemCode}
          redeemCodeValidating={amountLoading}
        />
      </DialogContent>
    </Dialog>
  );
});

PlanConfirmationModal.displayName = 'PlanConfirmationModal';

export default PlanConfirmationModal;
