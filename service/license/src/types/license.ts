import { ObjectId } from 'mongodb';
import { TPayMethod } from './payment';

export type LicenseDB = {
  _id?: ObjectId; // 唯一
  uid: string; // user id 唯一
  token: string; // license token
  orderID: string; // order number 唯一
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
  // v1
  clusterId: string; // Bind to cluster id
};

export type LicenseRecordPayload = {
  uid: string; // user id
  token: string; // license token
  orderID: string; // order number
  payMethod: TPayMethod;
  quota: number; // 额度
  amount: number; // 重置金额
  type: LicenseType;
  clusterId: string;
};

// new
export type LicenseToken = {
  type: LicenseType;
  // In fact, the clusterID here should be the kube-system ID in the cluster record
  // ClusterDB kubeSystemID
  clusterID: string;
  data: {
    amount: number;
  };
};

export type LicenseType = 'Account' | 'Cluster';

export type CreateLicenseParams = {
  orderID: string;
  clusterId: string;
};
