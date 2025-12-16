import { forwardRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethod } from '@/types/plan';
import { formatMoney } from '@/utils/format';
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

  const region = getRegion();
  const workspace = session?.user?.nsid || '';
  const regionDomain = region?.domain || '';
  const period = '1m';
  const payMethod: PaymentMethod = 'stripe';

  // For payg users, operator should always be 'created'
  const isPaygUser = isPaygType();
  const operator = isCreateMode || isPaygUser ? 'created' : 'upgraded';

  // Get upgrade amount (only for upgrade mode, not create mode, and not for payg users)
  const { data: upgradeAmountData, isLoading: amountLoading } = useQuery({
    queryKey: ['upgrade-amount', plan?.Name, workspace, regionDomain, period, payMethod, operator],
    queryFn: () => {
      if (!plan || !workspace || !regionDomain || operator !== 'upgraded' || isPaygUser)
        return null;
      return getUpgradeAmount({
        workspace,
        regionDomain,
        planName: plan.Name,
        period,
        payMethod,
        operator: 'upgraded'
      });
    },
    enabled:
      isOpen && !!(plan && workspace && regionDomain && operator === 'upgraded' && !isPaygUser)
  });

  // Query card info
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

  // Mutation for creating card management session
  const manageCardMutation = useMutation({
    mutationFn: createCardManageSession,
    onSuccess: (data) => {
      if (data?.data?.success && data?.data?.url) {
        // Open Stripe portal in new tab
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

  const handleManageCards = () => {
    if (!workspace || !regionDomain) {
      toast({
        title: t('common:error'),
        description: t('common:missing_workspace_or_region'),
        status: 'error'
      });
      return;
    }

    manageCardMutation.mutate({
      workspace,
      regionDomain
    });
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  if (!plan) return null;

  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === period)?.Price || 0;
  const upgradeAmount = upgradeAmountData?.data?.amount || 0;

  // For create mode or payg users, use full monthly price; otherwise use upgrade amount
  const dueToday = isCreateMode || isPaygUser ? monthlyPrice : upgradeAmount;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onCancel?.();
        }
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-15px" />
      <DialogContent className="max-w-4xl! pb-8 pt-0 px-10 gap-0">
        {/* Header */}
        <div className="flex justify-center items-center px-6 py-5">
          <h2 className="text-2xl font-semibold text-gray-900 text-center leading-none">
            {isCreateMode ? t('common:create_workspace') : t('common:subscribe_plan')}
          </h2>
        </div>

        {/* Main Content */}
        <PlanConfirmationModalView
          plan={plan}
          workspaceName={workspaceName}
          isCreateMode={isCreateMode}
          monthlyPrice={monthlyPrice}
          dueToday={dueToday}
          amountLoading={!(isCreateMode || isPaygUser) && amountLoading}
          paymentMethod={cardInfoData?.data?.payment_method}
          cardInfoLoading={cardInfoLoading}
          manageCardLoading={manageCardMutation.isLoading}
          onConfirm={handleConfirm}
          onManageCards={handleManageCards}
        />
      </DialogContent>
    </Dialog>
  );
});

PlanConfirmationModal.displayName = 'PlanConfirmationModal';

export default PlanConfirmationModal;
