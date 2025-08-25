export type Payment = {
  paymentName: string;
  extra: {
    apiVersion: 'account.sealos.io/v1';
    kind: 'Payment';
    metadata: unknown;
    spec: {
      amount: number;
      paymentMethod: string;
      userID: string;
    };
  };
};
export type Pay = {
  codeURL: string;
  status?: 'Created' | 'SUCCESS';
  tradeNO: string;
};
