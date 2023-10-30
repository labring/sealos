import { ObjectId } from 'mongodb';

export enum ClusterType {
  Standard = 'Standard',
  Enterprise = 'Enterprise',
  Contact = 'Contact'
}

export type ClusterDB = {
  _id?: ObjectId; // cluster ID 唯一
  clusterId: string; // cluster ID 唯一
  uid: string; // user ID 唯一
  orderID?: string; // order ID 唯一
  licenseID?: ObjectId; // license ID
  // amount: number;
  type: ClusterType; // license type
  // ossUrl?: {
  //   tar: string;
  //   md5: string;
  // creationTime: Date;
  // expirationTime: Date;
  // };
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Modification timestamp
};

export type ClusterRecordPayload = {
  uid: string; // user ID
  orderID?: string; // order ID
  licenseID?: ObjectId; // license ID
  // amount: number;
  // tar: string;
  // md5: string;
  type: ClusterType; // license type
};

export type CreateClusterParams = {
  orderID: string; // order ID
  type: ClusterType; // license type
};

export type ClusterResult = {
  clusterId: string; // cluster ID 唯一
  uid: string; // user ID 唯一
  orderID?: string; // order ID 唯一
  licenseID?: ObjectId; // license ID
  type: ClusterType; // license type
};
