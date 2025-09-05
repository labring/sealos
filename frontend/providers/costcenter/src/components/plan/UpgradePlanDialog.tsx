import { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Input,
  Label
} from '@sealos/shadcn-ui';
import { Checkbox } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { PlansDisplay } from './PlansDisplay';
import usePlanStore from '@/stores/plan';

interface UpgradePlanDialogProps {
  children: React.ReactNode;
  onSubscribe?: (plan: SubscriptionPlan | null, workspaceName?: string, isPayg?: boolean) => void;
  isSubscribing?: boolean;
  isCreateMode?: boolean;
  isUpgradeMode?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpgradePlanDialog({
  children,
  onSubscribe,
  isSubscribing = false,
  isCreateMode = false,
  isUpgradeMode = false,
  isOpen,
  onOpenChange
}: UpgradePlanDialogProps) {
  const plansData = usePlanStore((state) => state.plansData);
  const plans = useMemo(() => plansData?.plans || [], [plansData]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [stillChargeByVolume, setStillChargeByVolume] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Set default selected plan
  useEffect(() => {
    if (isCreateMode || isUpgradeMode) {
      // Set default selected plan to the most popular one (index 1)
      if (plans && plans.length > 1) {
        const mainPlans = plans.filter(
          (plan) => plan.Prices && plan.Prices.length > 0 && !plan.Tags.includes('more')
        );
        if (mainPlans.length > 1) {
          setSelectedPlanId(mainPlans[1].ID); // Most popular plan
        }
      }
    }
  }, [isCreateMode, isUpgradeMode, plans]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[1200px] py-12 px-14 bg-zinc-50">
        <DialogTitle className="sr-only">Choose Your Workspace Plan</DialogTitle>
        <div className="flex flex-col justify-center">
          <section>
            <h1 className="text-3xl font-semibold text-left">Choose Your Workspace Plan</h1>
          </section>

          {plans && plans.length > 0 ? (
            <PlansDisplay
              workspaceName={workspaceName}
              isSubscribing={isSubscribing}
              isCreateMode={isCreateMode}
              stillChargeByVolume={stillChargeByVolume}
              selectedPlanId={selectedPlanId}
              onPlanSelect={setSelectedPlanId}
            />
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">No plans available</div>
            </div>
          )}

          {isCreateMode && (
            <div className="mt-3 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charge-by-volume"
                  checked={stillChargeByVolume}
                  onCheckedChange={(checked) => {
                    setStillChargeByVolume(checked === true);
                  }}
                />
                <Label htmlFor="charge-by-volume" className="text-sm">
                  Still want to charge by volume?
                </Label>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4"></div>

              <div className="flex gap-8 items-center">
                <Label htmlFor="workspace-name" className="flex-shrink-0 mb-0!">
                  Workspace Name
                </Label>
                <Input
                  className="bg-white"
                  id="workspace-name"
                  placeholder="Enter Workspace Name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange?.(false);

                    setWorkspaceName('');
                    setStillChargeByVolume(false);
                    setSelectedPlanId('');
                  }}
                  disabled={isSubscribing}
                >
                  Cancel
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
                        onSubscribe?.(selectedPlan, workspaceName, false);
                      }
                    }
                  }}
                  disabled={
                    !workspaceName.trim() ||
                    isSubscribing ||
                    (!stillChargeByVolume && !selectedPlanId)
                  }
                >
                  {isSubscribing ? 'Creating...' : 'Create Workspace'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
