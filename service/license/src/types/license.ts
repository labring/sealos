// export type LicenseRecord = {
//   _id?: string;
//   uid: string; // user id
//   token: string; // license token
//   orderID: string; // order number
//   paymentMethod: 'wechat' | 'stripe';
//   service: {
//     quota: number; // 额度
//   };
//   iat: number; // 签发日期
//   exp: number; // 有效期
//   amount: number; // 消费金额
// };

export type LicensePayload = {
  uid: string;
  amount: number;
  orderID: string;
  quota: number;
  paymentMethod: 'wechat' | 'stripe';
};

// new
export type LicenseToken = {
  type: 'Account' | 'Cluster';
  data: {
    amount: number;
  };
};
