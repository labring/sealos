import { useState, useEffect, useMemo } from 'react';
import { Button, Separator } from '@sealos/shadcn-ui';
import { Checkbox } from '@sealos/shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { UpgradePlanCard } from './UpgradePlanCard';
import usePlanStore from '@/stores/plan';
import { formatMoney, formatTrafficAuto } from '@/utils/format';

interface PlansDisplayProps {
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  stillChargeByVolume?: boolean;
  selectedPlanId?: string;
  onPlanSelect?: (planId: string) => void;
  workspaceName?: string;
}

export function PlansDisplay({
  isSubscribing,
  isCreateMode = false,
  stillChargeByVolume = false,
  selectedPlanId,
  onPlanSelect,
  workspaceName
}: PlansDisplayProps) {
  const plansData = usePlanStore((state) => state.plansData);
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const lastTransactionData = usePlanStore((state) => state.lastTransactionData);
  const showConfirmationModal = usePlanStore((state) => state.showConfirmationModal);
  const showDowngradeModal = usePlanStore((state) => state.showDowngradeModal);

  const plans = useMemo(() => plansData?.plans || [], [plansData]);
  const subscription = subscriptionData?.subscription;
  const lastTransaction = lastTransactionData?.transaction;
  const currentPlan = subscription?.PlanName;

  const [showMorePlans, setShowMorePlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>(''); // plan id

  const { mainPlans, additionalPlans } = useMemo(() => {
    const paid = plans.filter((plan) => plan.Prices && plan.Prices.length > 0);
    const main = paid.filter((plan) => !plan.Tags.includes('more'));
    const additional = paid.filter((plan) => plan.Tags.includes('more'));

    const sortByOrder = (a: SubscriptionPlan, b: SubscriptionPlan) => a.Order - b.Order;

    return {
      mainPlans: main.sort(sortByOrder),
      additionalPlans: additional.sort(sortByOrder)
    };
  }, [plans]);

  const currentPlanObj = useMemo(() => {
    return plans.find((plan) => plan.Name === currentPlan);
  }, [plans, currentPlan]);

  const { nextPlanName, currentPlanInMore } = useMemo(() => {
    const downgrade = lastTransaction?.Operator === 'downgraded';
    const nextPlan = downgrade ? lastTransaction?.NewPlanName : null;
    const planInMore = currentPlanObj && currentPlanObj.Tags.includes('more');

    return {
      nextPlanName: nextPlan,
      currentPlanInMore: planInMore
    };
  }, [lastTransaction, currentPlanObj]);

  // Set initial state for More Plans checkbox and selection
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized && additionalPlans.length > 0) {
      if (currentPlanInMore) {
        setShowMorePlans(true);
        setSelectedPlan(currentPlanObj?.ID || '');
      } else {
        if (additionalPlans.length > 0) {
          setSelectedPlan(additionalPlans[0].ID);
        }
      }
      setHasInitialized(true);
    }
  }, [additionalPlans, currentPlanInMore, currentPlanObj, hasInitialized]);

  // When user selects "charge by volume", uncheck More Plans
  useEffect(() => {
    if (stillChargeByVolume) {
      setShowMorePlans(false);
    }
  }, [stillChargeByVolume]);

  return (
    <div className="pt-6 w-full">
      {/* Main Plans Grid */}
      <div
        className={`flex w-full gap-3 justify-between ${
          showMorePlans || (isCreateMode && stillChargeByVolume)
            ? 'opacity-30 pointer-events-none'
            : ''
        }`}
      >
        {mainPlans.map((plan, index) => (
          <UpgradePlanCard
            key={plan.ID}
            plan={plan}
            isPopular={index === 1}
            isLoading={isSubscribing}
            isCreateMode={isCreateMode}
            isSelected={isCreateMode && selectedPlanId === plan.ID}
            onSelect={isCreateMode ? () => onPlanSelect?.(plan.ID) : undefined}
            workspaceName={workspaceName}
          />
        ))}
      </div>

      {/* More Plans Section */}
      {additionalPlans.length > 0 && (
        <div
          className={`mt-6 flex items-center justify-start gap-4 ${
            isCreateMode && stillChargeByVolume ? 'opacity-30 pointer-events-none' : ''
          }`}
        >
          {isCreateMode === true && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Checkbox
                id="more-plans"
                checked={showMorePlans}
                onCheckedChange={(checked) => {
                  setShowMorePlans(checked === true);
                  if (checked && isCreateMode && onPlanSelect && additionalPlans.length > 0) {
                    const firstMorePlan = additionalPlans[0].ID;
                    setSelectedPlan(firstMorePlan);
                    onPlanSelect(firstMorePlan);
                  } else if (!checked && isCreateMode && onPlanSelect) {
                    onPlanSelect('');
                  }
                }}
              />
              <label htmlFor="more-plans" className="text-sm font-medium">
                More Plans
              </label>
            </div>
          )}

          <Select
            value={selectedPlan}
            onValueChange={(value) => {
              const currentPlan = additionalPlans.find((p) => p.ID === value);
              if (currentPlan?.Name === 'Customized' && currentPlan?.Description) {
                window.open(currentPlan?.Description, '_blank', 'noopener,noreferrer');
              } else {
                setSelectedPlan(value);
                if (isCreateMode && onPlanSelect) {
                  onPlanSelect(value);
                }
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {additionalPlans.map((plan) => {
                let resources: any = {};
                try {
                  resources = JSON.parse(plan.MaxResources);
                } catch (e) {
                  resources = {};
                }

                const monthlyPrice = formatMoney(plan.Prices?.[0]?.Price || 0);
                const isCurrentPlanInSelect = plan.Name === currentPlan;
                const isNextPlanInSelect = plan.Name === nextPlanName;

                if (plan.Name === 'Customized') {
                  return (
                    <SelectItem key={plan.ID} value={plan.ID} className="w-full">
                      <div className="flex w-full items-center">
                        <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                        <Separator
                          orientation="vertical"
                          style={{
                            height: '16px',
                            margin: '0 12px'
                          }}
                        />
                        <span>Contact us</span>
                      </div>
                    </SelectItem>
                  );
                }

                return (
                  <SelectItem key={plan.ID} value={plan.ID} className="w-full">
                    <div className="flex w-full items-center">
                      <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                      <Separator
                        orientation="vertical"
                        style={{
                          height: '16px',
                          margin: '0 12px'
                        }}
                      />
                      <div className="text-xs text-gray-500">
                        {resources.cpu} vCPU + {resources.memory} RAM + {resources.storage} Disk +
                        {formatTrafficAuto(plan.Traffic)} + {resources.nodeports} Nodeport
                      </div>
                      <Separator
                        orientation="vertical"
                        style={{
                          height: '16px',
                          margin: '0 12px'
                        }}
                      />
                      <span className="text-xs text-gray-500">${monthlyPrice.toFixed(0)}</span>
                      {isCurrentPlanInSelect && (
                        <span className="bg-blue-100 text-blue-600 font-medium text-xs px-2 py-1 rounded-full ml-2">
                          Your current plan
                        </span>
                      )}
                      {isNextPlanInSelect && (
                        <span className="bg-orange-100 text-orange-600 font-medium text-xs px-2 py-1 rounded-full ml-2">
                          Your next plan
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {isCreateMode === false && (
            <Button
              disabled={
                !selectedPlan ||
                isSubscribing ||
                (!isCreateMode &&
                  (additionalPlans.find((p) => p.ID === selectedPlan)?.Name === currentPlan ||
                    additionalPlans.find((p) => p.ID === selectedPlan)?.Name === nextPlanName))
              }
              onClick={() => {
                const plan = additionalPlans.find((p) => p.ID === selectedPlan);

                if (plan) {
                  // Determine operator type using the same logic as UpgradePlanCard
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
              }}
            >
              {(() => {
                if (isCreateMode) {
                  if (isSubscribing) return 'Creating...';
                  return 'Create Workspace';
                }

                if (isSubscribing) return 'Processing...';

                const selectedPlanName = additionalPlans.find((p) => p.ID === selectedPlan)?.Name;
                if (selectedPlanName === currentPlan) return 'Your current plan';
                if (selectedPlanName === nextPlanName) return 'Your next plan';

                // Determine if it's upgrade or downgrade based on plan relationships
                if (currentPlanObj && selectedPlanName) {
                  if (currentPlanObj.UpgradePlanList?.includes(selectedPlanName)) return 'Upgrade';
                  if (currentPlanObj.DowngradePlanList?.includes(selectedPlanName))
                    return 'Downgrade';
                }

                return 'Upgrade';
              })()}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
