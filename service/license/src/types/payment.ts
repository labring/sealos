export type PaymentDB = {
  uid: string;
  amount: number;
  // quota: number;
  codeURL?: string;
  currency: string;
  orderID: string;
  tradeNO?: string;
  sessionID?: string;
  payMethod: TPayMethod;
  status: PaymentStatus;
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Modification timestamp
};

export type TPayMethod = 'stripe' | 'wechat';

export enum PaymentStatus {
  PaymentNotPaid = 'notpaid', // 未支付
  PaymentProcessing = 'processing', // 支付中
  PaymentFailed = 'failed', // 支付失败
  PaymentExpired = 'expired', // 支付过期
  PaymentSuccess = 'success', // 支付成功
  PaymentUnknown = 'unknown' // 未知
}

export type PaymentParams = {
  amount: string;
  currency: 'CNY';
  payMethod: TPayMethod;
};

export type PaymentData = {
  amount: string;
  codeURL?: string;
  currency: string;
  message: string;
  orderID: string;
  tradeNO?: string;
  sessionID?: string;
};

export type PaymentResult = {
  message: string;
  orderID: string;
  status: PaymentStatus;
};

export type WechatPaymentData = {
  codeURL: string;
  tradeNO: string;
};
