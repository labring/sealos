import { useState, useEffect, useRef } from 'react';
import { Button, Separator } from '@sealos/shadcn-ui';
import { Checkbox } from '@sealos/shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { UpgradePlanCard } from './UpgradePlanCard';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import PlanConfirmationModal from './PlanConfirmationModal';

interface PlansDisplayProps {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  lastTransaction?: any;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  stillChargeByVolume?: boolean;
  selectedPlanId?: string;
  onPlanSelect?: (planId: string) => void;
  workspaceName?: string;
}

export function PlansDisplay({
  plans,
  currentPlan,
  lastTransaction,
  onSubscribe,
  isSubscribing,
  isCreateMode = false,
  stillChargeByVolume = false,
  selectedPlanId,
  onPlanSelect,
  workspaceName
}: PlansDisplayProps) {
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const region = getRegion();
  const confirmationModalRef = useRef<{ onOpen: () => void; onClose: () => void }>(null);

  const [showMorePlans, setShowMorePlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);

  // Filter out free plans and separate main plans from additional plans
  const paidPlans = plans.filter((plan) => plan.Prices && plan.Prices.length > 0);

  // Move plans with 'more' tag to additional plans
  const mainPlans = paidPlans.filter((plan) => !plan.Tags.includes('more'));

  const additionalPlans = paidPlans.filter((plan) => plan.Tags.includes('more'));

  // Find the current plan object
  const currentPlanObj = plans.find((plan) => plan.Name === currentPlan);

  // Check if there's a downgrade and determine next plan
  const isDowngrade = lastTransaction?.Operator === 'downgraded';
  const nextPlanName = isDowngrade ? lastTransaction?.NewPlanName : null;

  // Check if current plan is in more plans (has 'more' tag)
  const currentPlanInMore = currentPlanObj && currentPlanObj.Tags.includes('more');

  // Set initial state for More Plans checkbox and selection
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized && additionalPlans.length > 0) {
      if (currentPlanInMore) {
        setShowMorePlans(true);
        setSelectedPlan(currentPlanObj.ID);
      } else {
        const hobbyPlusPlan = additionalPlans.find((plan) => plan.Name === 'Hobby+');
        if (hobbyPlusPlan) {
          setSelectedPlan(hobbyPlusPlan.ID);
        }
      }
      setHasInitialized(true);
    }
  }, [additionalPlans, currentPlanInMore, currentPlanObj, hasInitialized]);

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
            isCurrentPlan={!isCreateMode && plan.Name === currentPlan}
            isNextPlan={!isCreateMode && plan.Name === nextPlanName}
            currentPlan={currentPlanObj}
            onSubscribe={onSubscribe}
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
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Checkbox
              id="more-plans"
              checked={showMorePlans}
              onCheckedChange={(checked) => setShowMorePlans(checked === true)}
            />
            <label htmlFor="more-plans" className="text-sm font-medium">
              More Plans
            </label>
          </div>

          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
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

                const monthlyPrice = (plan.Prices?.[0]?.Price || 0) / 1000000;
                const trafficGB =
                  plan.Traffic > 1 ? (plan.Traffic / 1024).toFixed(0) : plan.Traffic;

                const isCurrentPlanInSelect = plan.Name === currentPlan;
                const isNextPlanInSelect = plan.Name === nextPlanName;

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
                        {trafficGB} GB Traffic
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
          {showMorePlans && (
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
                  if (isCreateMode) {
                    onSubscribe?.(plan);
                  } else {
                    setPendingPlan(plan);
                    confirmationModalRef.current?.onOpen();
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

      {/* Plan Confirmation Modal for More Plans */}
      <PlanConfirmationModal
        ref={confirmationModalRef}
        plan={pendingPlan || undefined}
        workspace={session?.user?.nsid}
        regionDomain={region?.domain}
        period="1m"
        payMethod="stripe"
        operator="upgraded"
        workspaceName={workspaceName}
        isCreateMode={isCreateMode}
        onConfirm={() => {
          if (pendingPlan) {
            onSubscribe?.(pendingPlan);
            setPendingPlan(null);
          }
        }}
        onCancel={() => {
          setPendingPlan(null);
          confirmationModalRef.current?.onClose();
        }}
      />
    </div>
  );
}
