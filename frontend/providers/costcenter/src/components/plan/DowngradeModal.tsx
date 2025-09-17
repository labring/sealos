import { AlertTriangle } from 'lucide-react';
import { forwardRef, useCallback } from 'react';
import { Button, Dialog, DialogContent, DialogOverlay, Separator } from '@sealos/shadcn-ui';
import { SubscriptionPlan } from '@/types/plan';
import { getWorkspaceQuota } from '@/api/workspace';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import usePlanStore from '@/stores/plan';
import { UserQuotaItem } from '@/types/workspace';
import { useQuery } from '@tanstack/react-query';
import { formatTime } from '@/utils/format';

interface DowngradeModalProps {
  targetPlan?: SubscriptionPlan;
  isOpen?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DowngradeModal = forwardRef<never, DowngradeModalProps>((props, _ref) => {
  const { targetPlan, isOpen = false, onConfirm, onCancel } = props;

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

  const quotaData = quotaResponse?.data?.quota || [];

  const checkResourceExceeded = useCallback(
    (quota: UserQuotaItem[]) => {
      if (!targetPlan) return false;

      let targetResources: any = {};
      try {
        targetResources = JSON.parse(targetPlan.MaxResources);
      } catch (e) {
        return false;
      }

      // Check if current usage exceeds target plan limits
      return quota.some((item) => {
        let targetLimit = 0;

        switch (item.type) {
          case 'cpu':
            // Convert from millicores to cores for comparison
            targetLimit = parseInt(targetResources.cpu || '0') * 1000;
            break;
          case 'memory':
            // Convert from Gi to bytes for comparison
            const memoryGi = targetResources.memory?.replace('Gi', '') || '0';
            targetLimit = parseInt(memoryGi) * 1024 * 1024 * 1024;
            break;
          case 'storage':
            // Convert from Gi to bytes for comparison
            const storageGi = targetResources.storage?.replace('Gi', '') || '0';
            targetLimit = parseInt(storageGi) * 1024 * 1024 * 1024;
            break;
          case 'traffic':
            targetLimit = targetPlan.Traffic * 1024 * 1024; // Convert GB to bytes
            break;
          case 'nodeport':
            targetLimit = targetPlan.MaxSeats || 0;
            break;
          default:
            return false;
        }

        return item.used > targetLimit;
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

  // Helper function to format resource values
  const formatResourceValue = (type: string, value: number, isLimit = false) => {
    switch (type) {
      case 'cpu':
        return isLimit ? `${(value / 1000).toFixed(1)} Core` : `${(value / 1000).toFixed(1)} Core`;
      case 'memory':
        return isLimit
          ? `${(value / (1024 * 1024 * 1024)).toFixed(0)} GB`
          : `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      case 'storage':
        return isLimit
          ? `${(value / (1024 * 1024 * 1024)).toFixed(0)} GB`
          : `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      case 'traffic':
        return `${(value / (1024 * 1024)).toFixed(0)} GB`;
      case 'nodeport':
        return `${value} Port`;
      default:
        return `${value}`;
    }
  };

  // Get resource comparison data
  const getResourceComparison = () => {
    if (!currentPlan || !targetPlan || !quotaData.length) return [];

    let currentResources: any = {};
    let targetResources: any = {};

    try {
      currentResources = JSON.parse(currentPlan.MaxResources);
      targetResources = JSON.parse(targetPlan.MaxResources);
    } catch (e) {
      return [];
    }

    const comparisons = [];

    // CPU comparison
    const cpuQuota = quotaData.find((q: UserQuotaItem) => q.type === 'cpu');
    if (cpuQuota && currentResources.cpu && targetResources.cpu) {
      const currentLimit = parseInt(currentResources.cpu) * 1000;
      const targetLimit = parseInt(targetResources.cpu) * 1000;
      comparisons.push({
        type: 'CPU',
        current: formatResourceValue('cpu', currentLimit, true),
        target: formatResourceValue('cpu', targetLimit, true),
        used: formatResourceValue('cpu', cpuQuota.used),
        exceeded: cpuQuota.used > targetLimit
      });
    }

    // Memory comparison
    const memoryQuota = quotaData.find((q: UserQuotaItem) => q.type === 'memory');
    if (memoryQuota && currentResources.memory && targetResources.memory) {
      const currentMemGi = parseInt(currentResources.memory.replace('Gi', ''));
      const targetMemGi = parseInt(targetResources.memory.replace('Gi', ''));
      const currentLimit = currentMemGi * 1024 * 1024 * 1024;
      const targetLimit = targetMemGi * 1024 * 1024 * 1024;
      comparisons.push({
        type: 'RAM',
        current: formatResourceValue('memory', currentLimit, true),
        target: formatResourceValue('memory', targetLimit, true),
        used: formatResourceValue('memory', memoryQuota.used),
        exceeded: memoryQuota.used > targetLimit
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
          <h2 className="text-lg font-semibold text-gray-900">We are sorry to see you go</h2>
        </div>

        <div className="px-6 pb-6 pt-0">
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-gray-600">Loading resource usage...</div>
            </div>
          )}

          {/* Exceeded Resources Warning - only show if there are exceeded resources */}
          {!isLoading && (
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                {!hasExceededResources ? (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 mb-1">Exceeded Resources</h3>
                    <p className="text-sm text-orange-600">
                      Your current usage exceeds downgraded plan limits.
                    </p>
                    <p className="text-sm">
                      To continue service, free up excess resources by
                      {subscription?.CurrentPeriodEndAt && (
                        <span className="font-bold">
                          {formatTime(subscription?.CurrentPeriodEndAt, 'yyyy-MM-dd')}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm text-orange-600">
                      Please ensure your resource usage stays within the {currentPlan?.Name} Plan
                      limits
                    </span>
                    <p className="text-sm text-zinc-900">
                      before the next billing date
                      {subscription?.CurrentPeriodEndAt && (
                        <span className="font-bold px-1">
                          {formatTime(subscription?.CurrentPeriodEndAt, 'yyyy-MM-dd')}
                        </span>
                      )}
                      to avoid charges.
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-3">Downgrade Impact</h3>
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
                    Resources marked in red exceed the target plan limits
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Cancellation will take effect on next billing cycle (
              {subscription?.CurrentPeriodEndAt
                ? new Date(subscription.CurrentPeriodEndAt).toLocaleDateString()
                : 'N/A'}
              ).
              <br />
              Until then, your {currentPlan?.Name || 'current'} plan remains active.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="w-fit" onClick={handleClose}>
              Keep Plan
            </Button>
            <Button variant="outline" className="w-fit text-red-600" onClick={handleConfirm}>
              Downgrade Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

DowngradeModal.displayName = 'DowngradeModal';

export default DowngradeModal;
