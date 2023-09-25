export type LicenseCrd = {
  apiVersion: 'infostream.sealos.io/v1';
  kind: 'Payment';
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    userID: string;
    amount: number;
    paymentMethod: 'wechat' | 'stripe';
    service: {
      amt: number;
      objType: string; // 'external,internal'
    };
  };
  status: {
    tradeNO: string;
    codeURL: string;
    status: 'Created' | 'Completed';
    token: string;
  };
};

export type LicensePaymentForm = {
  paymentName: string;
  namespace: string;
  userId: string;
  amount: number;
  paymentMethod: 'wechat' | 'stripe';
  hashID: string;
  quota: number;
};

export type LicensePayStatus = {
  tradeNO: string;
  codeURL: string;
  status: 'Created' | 'Completed';
  token: string;
};

export type LicenseRecord = {
  _id?: string;
  uid: string; // user id
  token: string; // license token
  orderID: string; // order number
  paymentMethod: 'wechat' | 'stripe';
  service: {
    quota: number; // 额度
  };
  iat: number; // 签发日期
  exp: number; // 有效期
  amount: number; // 消费金额
};

export type LicensePayload = {
  uid: string;
  amount: number;
  token: string;
  orderID: string;
  quota: number;
  paymentMethod: 'wechat' | 'stripe';
};
