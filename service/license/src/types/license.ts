import { TPayMethod } from './payment';

export type LicenseDB = {
  _id?: string;
  uid: string; // user id
  token: string; // license token
  orderID: string; // order number
  payMethod: TPayMethod;
  service: {
    quota: number; // 额度
  };
  iat: number; // 签发日期
  exp: number; // 有效期
  amount: number; // 消费金额
  type: LicenseType; // license type
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Modification timestamp
};

export type LicenseRecordPayload = {
  uid: string; // user id
  token: string; // license token
  orderID: string; // order number
  payMethod: TPayMethod;
  quota: number; // 额度
  amount: number; // 重置金额
  type: LicenseType;
};

export type LicensePayload = {
  amount: number;
  orderID: string;
  quota: number;
  payMethod: TPayMethod;
  type: LicenseType;
};

// new
export type LicenseToken = {
  type: LicenseType;
  data: {
    amount: number;
  };
};

export type LicenseType = 'Account' | 'Cluster';
