export enum PaymentStatus {
  PaymentNotPaid = 'notpaid', // 未支付
  PaymentProcessing = 'processing', // 支付中
  PaymentFailed = 'failed', // 支付失败
  PaymentExpired = 'expired', // 支付过期
  PaymentSuccess = 'success', // 支付成功
  PaymentUnknown = 'unknown' // 未知
}

export type PaymentParams = {
  // appID: number;
  // sign: string;
  amount: string;
  currency: string;
  // user: string;
  payMethod: 'stripe' | 'wechat';
};

export type PaymentRequest = {
  appID: number;
  sign: string;
  orderID: string;
  payMethod: string;
  user: string;
  sessionID: string;
};
