import { RESPONSE_MESSAGE } from './utils';

export const DELETE_USER_EXECUTION_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;

export type DeleteUserExecutionStatus =
  (typeof DELETE_USER_EXECUTION_STATUS)[keyof typeof DELETE_USER_EXECUTION_STATUS];

export type DeleteUserFailure = {
  workspaceUid: string;
  workspaceName: string;
  action: 'subscription-cancel';
  message: string;
};

export type DeleteUserFailedWorkspace = DeleteUserFailure;

export type DeleteUserFinalStatusResponse = {
  deleteId: string;
  status: DeleteUserExecutionStatus;
  failedWorkspaces?: DeleteUserFailure[];
};

export type DeleteUserInitiateResponse = DeleteUserFinalStatusResponse;

export const DELETE_USER_FLOW_STATUS = DELETE_USER_EXECUTION_STATUS;

export type DeleteUserStatusResult = DeleteUserFinalStatusResponse;

enum _DELETE_USERSTATUS {
  CODE_ERROR = 'CODE_ERROR'
}

export const DELETE_USER_STATUS = Object.assign({}, _DELETE_USERSTATUS, RESPONSE_MESSAGE);
export type DELETE_USER_STATUS = typeof DELETE_USER_STATUS;

export const buildDeleteUserPendingResult = (deleteId: string): DeleteUserFinalStatusResponse => ({
  deleteId,
  status: DELETE_USER_EXECUTION_STATUS.PENDING
});

export const buildDeleteUserSuccessResult = (deleteId: string): DeleteUserFinalStatusResponse => ({
  deleteId,
  status: DELETE_USER_EXECUTION_STATUS.SUCCESS
});

export const buildDeleteUserFailedResult = (
  failedWorkspaces: DeleteUserFailure[],
  deleteId = ''
): DeleteUserFinalStatusResponse => ({
  deleteId,
  status: DELETE_USER_EXECUTION_STATUS.FAILED,
  failedWorkspaces
});

export type DeleteUserFailureReason = {
  failedWorkspaces?: DeleteUserFailure[];
};

export const serializeDeleteUserFailureReason = (reason: DeleteUserFailureReason): string =>
  JSON.stringify(reason);

export const parseDeleteUserFailureReason = (
  reason?: string | null
): DeleteUserFailureReason | null => {
  if (!reason) return null;

  try {
    const parsed = JSON.parse(reason) as DeleteUserFailureReason;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.failedWorkspaces && !Array.isArray(parsed.failedWorkspaces)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
