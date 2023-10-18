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
  payMethod: 'stripe' | 'wechat';
};

export type StripePaymentData = {
  amount: string;
  currency: string;
  message: string;
  orderID: string;
  sessionID: string;
  user: string;
};

export type WechatPaymentData = {
  amount: string;
  codeURL: string;
  currency: string;
  message: string;
  orderID: string;
  tradeNO: string;
  user: string;
};

export type PaymentResultParams = {
  orderID: string;
  payMethod: 'stripe' | 'wechat';
  sessionID?: string;
};
