export enum TransferState {
  TransferStatePending,
  TransferStateInProgress,
  TransferStateCompleted,
  TransferStateFailed
}

export type transferStatus = {
  status: {
    progress: TransferState;
    reason?: string;
  };
  spec: {
    amount: number;
    to: string;
  };
};
