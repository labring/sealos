import { Stripe } from '@stripe/stripe-js';
import { AxiosInstance } from 'axios';

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
export type RechargeModalRef = {
  onOpen: () => void;
  onClose: () => void;
};
export type RechargeModalProps = {
  onPaySuccess?: () => void;
  onPayError?: () => void;
  onCreatedSuccess?: () => void;
  onCreatedError?: () => void;
  onCancel?: () => void;
  balance: number;
  stripePromise: Promise<Stripe | null>;
  request: AxiosInstance;
};
