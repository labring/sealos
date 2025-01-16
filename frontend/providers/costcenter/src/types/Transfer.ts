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
export type TransferModalRef = {
  onOpen: () => void;
  onClose: () => void;
};
export type TransferModalProps = {
  onTransferSuccess?: () => void;
  onTransferError?: () => void;
  onCancel?: () => void;
  balance: number;
  k8s_username: string;
};
