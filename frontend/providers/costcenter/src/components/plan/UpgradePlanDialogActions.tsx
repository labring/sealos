import { Button, Input, Label } from '@sealos/shadcn-ui';
import { Checkbox } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';

interface UpgradePlanDialogActionsProps {
  isCreateMode?: boolean;
  isSubscribing?: boolean;
  workspaceName?: string;
  selectedPlanId?: string;
  stillChargeByVolume?: boolean;
  onSubscribe?: (plan: SubscriptionPlan | null, workspaceName?: string, isPayg?: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  plans?: SubscriptionPlan[];
  onWorkspaceNameChange?: (name: string) => void;
  onStillChargeByVolumeChange?: (checked: boolean) => void;
  onSelectedPlanIdChange?: (planId: string) => void;
  // For upgrade mode
  selectedAdditionalPlanId?: string;
  additionalPlans?: SubscriptionPlan[];
  currentPlan?: string;
  nextPlanName?: string | null;
  currentPlanObj?: SubscriptionPlan | undefined;
}

export function UpgradePlanDialogActions({
  isCreateMode = false,
  isSubscribing = false,
  workspaceName = '',
  selectedPlanId = '',
  stillChargeByVolume = false,
  onSubscribe,
  onOpenChange,
  plans = [],
  onWorkspaceNameChange,
  onStillChargeByVolumeChange,
  onSelectedPlanIdChange,
  selectedAdditionalPlanId = '',
  additionalPlans = [],
  currentPlan,
  nextPlanName,
  currentPlanObj
}: UpgradePlanDialogActionsProps) {
  const { t } = useTranslation();
  const showConfirmationModal = usePlanStore((state) => state.showConfirmationModal);

  // Upgrade mode: show upgrade button
  if (!isCreateMode) {
    return (
      <div className="mt-6">
        <UpgradeButton
          selectedPlan={selectedAdditionalPlanId}
          additionalPlans={additionalPlans}
          currentPlan={currentPlan}
          nextPlanName={nextPlanName}
          currentPlanObj={currentPlanObj}
          workspaceName={workspaceName}
          isSubscribing={isSubscribing}
          isCreateMode={isCreateMode}
        />
      </div>
    );
  }

  // Create mode: show form
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="charge-by-volume"
          checked={stillChargeByVolume}
          onCheckedChange={(checked) => {
            onStillChargeByVolumeChange?.(checked === true);
          }}
        />
        <Label htmlFor="charge-by-volume" className="text-sm">
          {t('common:still_want_to_charge_by_volume')}
        </Label>
      </div>

      <div className="border-t border-dashed border-slate-200 my-4"></div>

      <div className="flex gap-8 items-center">
        <Label htmlFor="workspace-name" className="flex-shrink-0 mb-0!">
          {t('common:workspace_name')}
        </Label>
        <Input
          className="bg-white"
          id="workspace-name"
          placeholder={t('common:enter_workspace_name')}
          value={workspaceName}
          onChange={(e) => onWorkspaceNameChange?.(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            onOpenChange?.(false);
            onWorkspaceNameChange?.('');
            onStillChargeByVolumeChange?.(false);
            onSelectedPlanIdChange?.('');
          }}
          disabled={isSubscribing}
        >
          {t('common:cancel')}
        </Button>
        <Button
          onClick={() => {
            if (stillChargeByVolume) {
              // Create PAYG workspace only - no subscription needed
              onSubscribe?.(null, workspaceName, true);
            } else if (selectedPlanId) {
              // Create workspace with selected plan
              const selectedPlan = plans?.find((p) => p.ID === selectedPlanId);
              if (selectedPlan) {
                showConfirmationModal(selectedPlan, { workspaceName, isCreateMode });
              }
            }
          }}
          disabled={
            !workspaceName.trim() || isSubscribing || (!stillChargeByVolume && !selectedPlanId)
          }
        >
          {isSubscribing ? t('common:creating') : t('common:create_workspace')}
        </Button>
      </div>
    </div>
  );
}

// Separate component for upgrade button
export function UpgradeButton({
  selectedPlan,
  additionalPlans,
  currentPlan,
  nextPlanName,
  currentPlanObj,
  workspaceName,
  isSubscribing,
  isCreateMode,
  onUpgradeClick
}: {
  selectedPlan: string;
  additionalPlans: SubscriptionPlan[];
  currentPlan?: string;
  nextPlanName?: string | null;
  currentPlanObj?: SubscriptionPlan | undefined;
  workspaceName?: string;
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  onUpgradeClick?: (plan: SubscriptionPlan) => void;
}) {
  const { t } = useTranslation();
  const showConfirmationModal = usePlanStore((state) => state.showConfirmationModal);
  const showDowngradeModal = usePlanStore((state) => state.showDowngradeModal);

  if (additionalPlans.length === 0 || !selectedPlan) return null;

  const plan = additionalPlans.find((p) => p.ID === selectedPlan);
  if (!plan) return null;

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick(plan);
    } else {
      // Fallback to default behavior
      const getOperator = () => {
        if (!currentPlanObj || isCreateMode) return 'created';
        if (currentPlanObj.UpgradePlanList?.includes(plan.Name)) return 'upgraded';
        if (currentPlanObj.DowngradePlanList?.includes(plan.Name)) return 'downgraded';
        return 'upgraded';
      };
      const operator = getOperator();
      if (operator === 'downgraded') {
        showDowngradeModal(plan, { workspaceName, isCreateMode });
      } else {
        showConfirmationModal(plan, { workspaceName, isCreateMode });
      }
    }
  };

  const selectedPlanName = plan.Name;
  const isCurrentPlan = selectedPlanName === currentPlan;
  const isNextPlan = selectedPlanName === nextPlanName;

  const getButtonText = () => {
    if (isSubscribing) return t('common:processing');
    if (isCurrentPlan) return t('common:your_current_plan');
    if (isNextPlan) return t('common:your_next_plan');

    // Determine if it's upgrade or downgrade based on plan relationships
    if (currentPlanObj && selectedPlanName) {
      if (currentPlanObj.UpgradePlanList?.includes(selectedPlanName)) return t('common:upgrade');
      if (currentPlanObj.DowngradePlanList?.includes(selectedPlanName))
        return t('common:downgrade');
    }

    return t('common:upgrade');
  };

  return (
    <Button
      disabled={!selectedPlan || isSubscribing || isCurrentPlan || isNextPlan}
      onClick={handleUpgradeClick}
    >
      {getButtonText()}
    </Button>
  );
}
