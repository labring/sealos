import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { PlansDisplay } from './PlansDisplay';
import { UpgradePlanDialogActions, UpgradeButton } from './UpgradePlanDialogActions';
import usePlanStore from '@/stores/plan';
import { useTranslation } from 'next-i18next';

interface UpgradePlanDialogProps {
  children: React.ReactNode;
  onSubscribe?: (plan: SubscriptionPlan | null, workspaceName?: string, isPayg?: boolean) => void;
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  isUpgradeMode?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSelectedPlan?: string;
  defaultWorkspaceName?: string;
}

export function UpgradePlanDialog({
  children,
  onSubscribe,
  isSubscribing = false,
  isCreateMode = false,
  isUpgradeMode = false,
  isOpen,
  onOpenChange,
  defaultSelectedPlan = '',
  defaultWorkspaceName = ''
}: UpgradePlanDialogProps) {
  const { t } = useTranslation();
  const plansData = usePlanStore((state) => state.plansData);
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const lastTransactionData = usePlanStore((state) => state.lastTransactionData);
  const plans = useMemo(() => plansData?.plans || [], [plansData]);
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspaceName);
  const [stillChargeByVolume, setStillChargeByVolume] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedAdditionalPlanId, setSelectedAdditionalPlanId] = useState<string>('');

  const subscription = subscriptionData?.subscription;
  const lastTransaction = lastTransactionData?.transaction;
  const currentPlan = subscription?.PlanName;

  const currentPlanObj = useMemo(() => {
    return plans.find((plan) => plan.Name === currentPlan);
  }, [plans, currentPlan]);

  const { nextPlanName } = useMemo(() => {
    const downgrade = lastTransaction?.Operator === 'downgraded';
    const nextPlan = downgrade ? lastTransaction?.NewPlanName : null;
    return { nextPlanName: nextPlan };
  }, [lastTransaction]);

  const additionalPlans = useMemo(() => {
    const paid = plans.filter((plan) => plan.Prices && plan.Prices.length > 0);
    return paid.filter((plan) => plan.Tags.includes('more')).sort((a, b) => a.Order - b.Order);
  }, [plans]);

  // Set default workspace name when defaultWorkspaceName changes
  useEffect(() => {
    if (defaultWorkspaceName) {
      setWorkspaceName(defaultWorkspaceName);
    }
  }, [defaultWorkspaceName]);

  // Set default selected plan
  useEffect(() => {
    if (isCreateMode || isUpgradeMode) {
      if (plans && plans.length > 0) {
        // If defaultSelectedPlan is provided, try to find a plan with that name
        if (defaultSelectedPlan) {
          const planByName = plans.find(
            (plan) => plan.Name.toLowerCase() === defaultSelectedPlan.toLowerCase()
          );
          if (planByName) {
            setSelectedPlanId(planByName.ID);
            return;
          }
        }

        // Fallback: Set default selected plan to the most popular one (index 1)
        if (plans.length > 1) {
          const mainPlans = plans.filter(
            (plan) => plan.Prices && plan.Prices.length > 0 && !plan.Tags.includes('more')
          );
          if (mainPlans.length > 1) {
            setSelectedPlanId(mainPlans[1].ID); // Most popular plan
          }
        }
      }
    }
  }, [isCreateMode, isUpgradeMode, plans, defaultSelectedPlan]);

  // Reset internal state when dialog closes to prevent duplicate opening
  useEffect(() => {
    if (!isOpen) {
      setWorkspaceName(defaultWorkspaceName || '');
      setSelectedPlanId('');
      setSelectedAdditionalPlanId('');
      setStillChargeByVolume(false);
    }
  }, [isOpen, defaultWorkspaceName]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[1200px] py-12 px-14 bg-zinc-50">
        <DialogTitle className="sr-only">{t('common:choose_your_workspace_plan')}</DialogTitle>
        <div className="flex flex-col justify-center">
          <section>
            <h1 className="text-3xl font-semibold text-left">
              {t('common:choose_your_workspace_plan')}
            </h1>
          </section>

          {plans && plans.length > 0 ? (
            <>
              <PlansDisplay
                workspaceName={workspaceName}
                isSubscribing={isSubscribing}
                isCreateMode={isCreateMode}
                stillChargeByVolume={stillChargeByVolume}
                selectedPlanId={selectedPlanId}
                onPlanSelect={setSelectedPlanId}
                onAdditionalPlanSelect={setSelectedAdditionalPlanId}
                upgradeButton={
                  !isCreateMode ? (
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
                  ) : undefined
                }
              />
              <UpgradePlanDialogActions
                isCreateMode={isCreateMode}
                isSubscribing={isSubscribing}
                workspaceName={workspaceName}
                selectedPlanId={selectedPlanId}
                stillChargeByVolume={stillChargeByVolume}
                onSubscribe={onSubscribe}
                onOpenChange={onOpenChange}
                plans={plans}
                onWorkspaceNameChange={setWorkspaceName}
                onStillChargeByVolumeChange={setStillChargeByVolume}
                onSelectedPlanIdChange={setSelectedPlanId}
              />
            </>
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">{t('common:no_plans_available')}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
