import { CheckCircle } from 'lucide-react';
import { forwardRef } from 'react';
import { Button, Dialog, DialogContent, DialogOverlay } from '@sealos/shadcn-ui';
import { SubscriptionPlan, PaymentMethod } from '@/types/plan';
import { displayMoney, formatMoney, formatTrafficAuto } from '@/utils/format';
import { getUpgradeAmount } from '@/api/plan';
import { useQuery } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import usePlanStore from '@/stores/plan';

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

  const handleConfirm = () => {
    onConfirm?.();
  };

  if (!plan) return null;

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
      <DialogContent className="max-w-[400px] pb-8 pt-0 px-10 gap-0">
        {/* Header */}
        <div className="flex justify-center items-center px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 text-center">
            {isCreateMode ? 'Create Workspace' : 'Subscribe Plan'}
          </h2>
        </div>

        <div className="p-6 border border-zinc-200 rounded-xl">
          {/* Order Summary */}
          <h3 className="text-base font-semibold text-gray-900 mb-6 leading-4">Order summary</h3>

          {/* Plan Info */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-medium text-gray-900">{plan.Name} Plan</span>
            <span className="text-base font-medium text-gray-900">
              ${displayMoney(formatMoney(monthlyPrice))}/mo
            </span>
          </div>

          {/* Plan Resources */}
          <div className="flex flex-col gap-2 mb-6">
            {planResources.cpu && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} color="#3B82F6" />
                <span className="text-sm text-gray-600">{formatCpu(planResources.cpu)}</span>
              </div>
            )}
            {planResources.memory && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} color="#3B82F6" />
                <span className="text-sm text-gray-600">{formatMemory(planResources.memory)}</span>
              </div>
            )}
            {planResources.storage && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} color="#3B82F6" />
                <span className="text-sm text-gray-600">
                  {formatStorage(planResources.storage)}
                </span>
              </div>
            )}
            {plan.Traffic && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} color="#3B82F6" />
                <span className="text-sm text-gray-600">{formatTrafficAuto(plan.Traffic)}</span>
              </div>
            )}
            {planResources.nodeports && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} color="#3B82F6" />
                <span className="text-sm text-gray-600">{planResources.nodeports} Nodeport</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 mb-5" />

          {/* Billing Summary */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total billed monthly</span>
              <span className="text-sm font-medium text-gray-900">
                ${displayMoney(formatMoney(monthlyPrice))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Due today</span>
              <span className="text-sm font-semibold text-gray-900">
                {isCreateMode || isPaygUser || amountLoading
                  ? isCreateMode || isPaygUser
                    ? `$${displayMoney(formatMoney(dueToday))}`
                    : 'Calculating...'
                  : `$${displayMoney(formatMoney(dueToday))}`}
              </span>
            </div>
          </div>

          {/* Workspace Name Display for Create Mode */}
          {isCreateMode && workspaceName && (
            <>
              <div className="border-t border-gray-100 mb-5" />
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-900 mb-2">Workspace Name</div>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-sm text-gray-700">{workspaceName}</span>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Checkout Button */}
        <Button
          className="w-full mt-5"
          size="lg"
          onClick={handleConfirm}
          disabled={!(isCreateMode || isPaygUser) && amountLoading}
        >
          {!(isCreateMode || isPaygUser) && amountLoading
            ? 'Calculating...'
            : isCreateMode
              ? 'Create Workspace'
              : 'Checkout'}
        </Button>
      </DialogContent>
    </Dialog>
  );
});

PlanConfirmationModal.displayName = 'PlanConfirmationModal';

export default PlanConfirmationModal;
