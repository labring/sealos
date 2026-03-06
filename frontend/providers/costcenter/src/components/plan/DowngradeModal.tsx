import { AlertTriangle } from 'lucide-react';
import { forwardRef, useCallback } from 'react';
import { Button, Dialog, DialogContent, DialogOverlay, Separator } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { getWorkspaceQuota } from '@/api/workspace';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import usePlanStore from '@/stores/plan';
import { UserQuotaItem, WorkspaceQuotaResponseSchema } from '@/types/workspace';
import { useQuery } from '@tanstack/react-query';
import { formatTime } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import { Quantity } from '@sealos/shared';

interface DowngradeModalProps {
  targetPlan?: SubscriptionPlan;
  isOpen?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DowngradeModal = forwardRef<never, DowngradeModalProps>((props, _ref) => {
  const { targetPlan, isOpen = false, onConfirm, onCancel } = props;

  const { t } = useTranslation();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  // 优化性能：只订阅需要的状态
  const getCurrentPlan = usePlanStore((state) => state.getCurrentPlan);
  const subscriptionData = usePlanStore((state) => state.subscriptionData);
  const region = getRegion();

  const currentPlan = getCurrentPlan();
  const subscription = subscriptionData?.subscription;

  // Use React Query to fetch workspace quota
  const { data: quotaResponse, isLoading } = useQuery({
    queryKey: ['workspace-quota', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getWorkspaceQuota({
        regionUid: region?.uid || '',
        workspace: session?.user?.nsid || ''
      }),
    enabled: isOpen && !!(session?.user?.nsid && region?.uid),
    staleTime: 30000 // Consider data fresh for 30 seconds
  });

  // Parse response data using Zod schema to ensure Quantity instances are created
  const parsedQuotaResponse = quotaResponse?.data
    ? WorkspaceQuotaResponseSchema.safeParse(quotaResponse.data)
    : null;
  const quotaData = parsedQuotaResponse?.success ? parsedQuotaResponse.data.quota : [];

  const checkResourceExceeded = useCallback(
    (quota: UserQuotaItem[]) => {
      if (!targetPlan) return false;

      const targetResources = targetPlan.MaxResources;

      return quota.some((item) => {
        const used = item.used;

        if (item.type === 'cpu' || item.type === 'memory' || item.type === 'storage') {
          const targetLimit = targetResources[item.type];
          if (!targetLimit) return false;
          return used.cmp(targetLimit) > 0;
        }

        if (item.type === 'traffic') {
          const targetLimit = Quantity.parse(`${targetPlan.Traffic}Gi`);
          return used.cmp(targetLimit) > 0;
        }

        if (item.type === 'nodeport') {
          const targetLimit = Quantity.newQuantity(BigInt(targetPlan.MaxSeats ?? 0), 'DecimalSI');
          return used.cmp(targetLimit) > 0;
        }

        return false;
      });
    },
    [targetPlan]
  );

  const hasExceededResources = checkResourceExceeded(quotaData);

  const handleClose = () => {
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  if (!currentPlan || !targetPlan) return null;

  const getResourceComparison = () => {
    if (!currentPlan || !targetPlan || !quotaData.length) return [];

    const currentResources = currentPlan.MaxResources;
    const targetResources = targetPlan.MaxResources;

    const comparisons = [];

    const cpuQuota = quotaData.find((q: UserQuotaItem) => q.type === 'cpu');
    if (cpuQuota && currentResources.cpu && targetResources.cpu) {
      const used = cpuQuota.used;
      comparisons.push({
        type: 'CPU',
        current: currentResources.cpu.formatForDisplay(),
        target: targetResources.cpu.formatForDisplay(),
        used: used.formatForDisplay(),
        exceeded: used.cmp(targetResources.cpu) > 0
      });
    }

    const memoryQuota = quotaData.find((q: UserQuotaItem) => q.type === 'memory');
    if (memoryQuota && currentResources.memory && targetResources.memory) {
      const used = memoryQuota.used;
      comparisons.push({
        type: 'RAM',
        current: currentResources.memory.formatForDisplay(),
        target: targetResources.memory.formatForDisplay(),
        used: used.formatForDisplay(),
        exceeded: used.cmp(targetResources.memory) > 0
      });
    }

    return comparisons;
  };

  const resourceComparisons = getResourceComparison();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onCancel?.();
        }
      }}
    >
      <DialogOverlay className="bg-[rgba(0,0,0,0.12)] backdrop-blur-sm" />
      <DialogContent className="max-w-[460px] p-0 gap-0">
        <div className="flex justify-between items-center px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('common:we_are_sorry_to_see_you_go')}
          </h2>
        </div>

        <div className="px-6 pb-6 pt-0">
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-gray-600">{t('common:loading_resource_usage')}</div>
            </div>
          )}

          {/* Exceeded Resources Warning - only show if there are exceeded resources */}
          {!isLoading && (
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                {hasExceededResources ? (
                  <div className="text-sm text-orange-600">
                    <h3 className="text-sm font-medium text-zinc-900 mb-1">
                      {t('common:exceeded_resources')}
                    </h3>
                    {t('common:your_current_usage_exceeds_downgraded_plan_limits')}
                    <span className="text-zinc-900">
                      {t('common:to_continue_service_free_up_excess_resources_by.0')}
                      {subscription?.CurrentPeriodEndAt && (
                        <span className="font-bold px-1">
                          {formatTime(subscription?.CurrentPeriodEndAt, 'yyyy-MM-dd')}
                        </span>
                      )}
                      {t('common:to_continue_service_free_up_excess_resources_by.1')}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-orange-600">
                    {t('common:please_ensure_your_resource_usage_stays_within_plan_limits')}
                    {t('common:before_the_next_billing_date')}
                    <span className="text-sm text-zinc-900">
                      {subscription?.CurrentPeriodEndAt && (
                        <span className="font-bold px-1">
                          {formatTime(subscription?.CurrentPeriodEndAt, 'yyyy-MM-dd')}
                        </span>
                      )}
                    </span>
                    {t('common:to_avoid_charges')}
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">
                  {t('common:downgrade_impact')}
                </h3>
                <ul className="space-y-2">
                  {resourceComparisons.map((comparison, index) => (
                    <li
                      key={index}
                      className={`flex items-center text-sm ${
                        comparison.exceeded ? 'text-red-600' : 'text-gray-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                          comparison.exceeded ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                      ></span>
                      <span>
                        {comparison.type}: {comparison.current} → {comparison.target}
                        {comparison.exceeded && (
                          <span className="ml-2 text-xs text-red-500">
                            (Used: {comparison.used})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {hasExceededResources && (
                  <div className="mt-3 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                    <AlertTriangle size={14} className="inline mr-1" />
                    {t('common:resources_marked_in_red_exceed_target_plan_limits')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {t('common:cancellation_will_take_effect_on_next_billing_cycle')} (
              {subscription?.CurrentPeriodEndAt
                ? new Date(subscription.CurrentPeriodEndAt).toLocaleDateString()
                : 'N/A'}
              ).
              <br />
              {t('common:until_then_your_current_plan_remains_active')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="w-fit" onClick={handleClose}>
              {t('common:keep_plan')}
            </Button>
            <Button variant="outline" className="w-fit text-red-600" onClick={handleConfirm}>
              {t('common:downgrade_plan')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

DowngradeModal.displayName = 'DowngradeModal';

export default DowngradeModal;
