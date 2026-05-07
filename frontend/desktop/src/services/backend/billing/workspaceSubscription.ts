import { PaymentMethod, SubscriptionInfoResponse, WorkspaceSubscription } from '@/types/plan';
import { callBillingService } from '../auth';

const FALLBACK_PAY_METHOD: PaymentMethod = 'stripe';

const normalizeUpper = (value?: string | null) => value?.trim().toUpperCase() || '';

const isSupportedPaymentMethod = (value?: string | null): value is PaymentMethod =>
  value === 'stripe' || value === 'balance';

const isNonSubscriptionPlan = (subscription?: WorkspaceSubscription | null) => {
  if (!subscription) return true;

  const normalizedType = normalizeUpper(subscription.type);
  const normalizedPlanName = normalizeUpper(subscription.PlanName);

  return (
    normalizedType === 'PAYG' || normalizedPlanName === 'PAYG' || normalizedPlanName === 'FREE'
  );
};

const isDeletedOrExpiredSubscription = (subscription?: WorkspaceSubscription | null) => {
  if (!subscription) return true;

  const normalizedStatus = subscription.Status?.trim().toLowerCase() || '';
  if (normalizedStatus === 'deleted') return true;

  const periodEndAt = subscription.CurrentPeriodEndAt
    ? new Date(subscription.CurrentPeriodEndAt).getTime()
    : 0;

  return !periodEndAt || periodEndAt <= Date.now();
};

const canCancelWorkspaceSubscription = (subscription?: WorkspaceSubscription | null) => {
  if (!subscription) return false;
  if (isNonSubscriptionPlan(subscription)) return false;
  if (isDeletedOrExpiredSubscription(subscription)) return false;
  if (subscription.CancelAtPeriodEnd) return false;
  return true;
};

const buildCancelWorkspaceSubscriptionPayload = (subscription: WorkspaceSubscription) => ({
  workspace: subscription.Workspace,
  regionDomain: subscription.RegionDomain,
  planName: subscription.PlanName,
  payMethod: isSupportedPaymentMethod(subscription.PayMethod)
    ? subscription.PayMethod
    : FALLBACK_PAY_METHOD,
  operator: 'canceled' as const
});

export const getWorkspaceSubscriptionInfo = async (props: {
  userUid: string;
  userId: string;
  workspaceId: string;
}) =>
  callBillingService(
    '/account/v1alpha1/workspace-subscription/info',
    {
      userUid: props.userUid,
      userId: props.userId
    },
    {
      workspace: props.workspaceId
    }
  ) as Promise<SubscriptionInfoResponse>;

export const shouldCancelWorkspaceSubscription = async (props: {
  userUid: string;
  userId: string;
  workspaceId: string;
}) => {
  const info = await getWorkspaceSubscriptionInfo(props);
  return canCancelWorkspaceSubscription(info?.subscription);
};

export const cancelWorkspaceSubscription = async (props: {
  userUid: string;
  userId: string;
  workspaceId: string;
}) => {
  const info = await getWorkspaceSubscriptionInfo(props);
  const subscription = info?.subscription;

  if (!canCancelWorkspaceSubscription(subscription)) {
    return {
      skipped: true
    };
  }

  const cancelPayload = buildCancelWorkspaceSubscriptionPayload(subscription);
  console.info('[workspaceSubscription] cancel:request', {
    workspaceId: props.workspaceId,
    payload: cancelPayload
  });

  return callBillingService(
    '/account/v1alpha1/workspace-subscription/pay',
    {
      userUid: props.userUid,
      userId: props.userId
    },
    cancelPayload
  );
};
