import { callBillingService } from '../auth';

type WorkspaceSubscriptionInfoResponse = {
  subscription?: {
    PlanName?: string;
    type?: string;
  } | null;
};

export const cancelWorkspaceSubscription = async (props: {
  userUid: string;
  userId: string;
  workspaceId: string;
}) =>
  callBillingService(
    '/account/v1alpha1/workspace-subscription/delete',
    {
      userUid: props.userUid,
      userId: props.userId
    },
    {
      workspace: props.workspaceId
    }
  );

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
  ) as Promise<WorkspaceSubscriptionInfoResponse>;

export const shouldCancelWorkspaceSubscription = async (props: {
  userUid: string;
  userId: string;
  workspaceId: string;
}) => {
  const info = await getWorkspaceSubscriptionInfo(props);
  const subscription = info?.subscription;

  if (!subscription) return false;

  return (
    subscription.type?.toUpperCase() !== 'PAYG' &&
    subscription.PlanName?.toUpperCase() !== 'PAYG' &&
    subscription.PlanName?.toUpperCase() !== 'FREE'
  );
};
