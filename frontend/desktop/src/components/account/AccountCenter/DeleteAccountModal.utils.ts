import { WorkspacesPlansResponse } from '@/types/plan';
import {
  DeleteUserFinalStatusResponse,
  DELETE_USER_EXECUTION_STATUS
} from '@/types/response/deleteUser';
import { NamespaceDto, UserRole } from '@/types/team';

export enum DeleteFlowStep {
  BOOTSTRAP,
  SUBSCRIPTION_WARNING,
  FINAL_CONFIRM,
  REMAIN_RESOURCES,
  FORCE_DELETE,
  PENDING,
  SUCCESS,
  FAILED
}

export type SubscribedWorkspaceRow = {
  namespace: string;
  workspaceName: string;
  planName: string;
};

export const buildSubscribedWorkspaceRows = (
  namespaces: NamespaceDto[] = [],
  plans: WorkspacesPlansResponse['plans'] = []
): SubscribedWorkspaceRow[] => {
  const namespaceNameMap = new Map(
    namespaces.map((namespace) => [namespace.id, namespace.teamName || namespace.id])
  );
  const ownerNamespaceIds = new Set(
    namespaces
      .filter((namespace) => namespace.role === UserRole.Owner)
      .map((namespace) => namespace.id)
  );

  return plans
    .filter((plan) => {
      const normalizedPlanName = plan.planName?.trim().toUpperCase();
      return (
        ownerNamespaceIds.has(plan.namespace) &&
        Boolean(normalizedPlanName) &&
        normalizedPlanName !== 'PAYG' &&
        normalizedPlanName !== 'FREE'
      );
    })
    .map((plan) => ({
      namespace: plan.namespace,
      workspaceName: namespaceNameMap.get(plan.namespace) || plan.namespace,
      planName: plan.planName
    }));
};

export const getDeleteFlowStepFromStatus = (
  status: DeleteUserFinalStatusResponse['status']
): DeleteFlowStep => {
  if (status === DELETE_USER_EXECUTION_STATUS.SUCCESS) return DeleteFlowStep.SUCCESS;
  if (status === DELETE_USER_EXECUTION_STATUS.FAILED) return DeleteFlowStep.FAILED;
  return DeleteFlowStep.PENDING;
};
