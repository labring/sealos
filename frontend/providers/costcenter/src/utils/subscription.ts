type PlanTransition = {
  UpgradePlanList?: string[] | null;
  DowngradePlanList?: string[] | null;
};

type SubscriptionPeriod = {
  status?: string;
  currentPeriodEndAt?: string;
};

export type SubscriptionOperator = 'created' | 'upgraded' | 'downgraded';

const normalizeStatus = (status?: string) => status?.toLowerCase() || '';

export const canRecreateSubscription = (status?: string) => {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus === 'debt' || normalizedStatus === 'deleted';
};

export const isSubscriptionExpired = (subscription: SubscriptionPeriod, now = Date.now()) => {
  if (normalizeStatus(subscription.status) === 'deleted') return true;

  const periodEnd = subscription.currentPeriodEndAt
    ? new Date(subscription.currentPeriodEndAt).getTime()
    : 0;
  return !periodEnd || periodEnd <= now;
};

export const getSubscriptionOperator = (
  status: string | undefined,
  currentPlan: PlanTransition | undefined,
  targetPlanName: string
): SubscriptionOperator => {
  if (canRecreateSubscription(status) || !currentPlan) return 'created';
  if (currentPlan.UpgradePlanList?.includes(targetPlanName)) return 'upgraded';
  if (currentPlan.DowngradePlanList?.includes(targetPlanName)) return 'downgraded';
  return 'upgraded';
};
