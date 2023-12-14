import { ObjectId } from 'mongodb';

export enum ClusterType {
  Standard = 'Standard',
  Enterprise = 'Enterprise',
  Contact = 'Contact'
}

export type ClusterDB = {
  _id?: ObjectId; // cluster ID
  clusterId: string; // cluster ID
  uid: string; // user ID
  orderID?: string; // order ID
  type: ClusterType;
  createdAt: Date;
  updatedAt: Date;
  licenseID?: ObjectId; // license ID
  // v1 new
  displayName?: string;
  kubeSystemID?: string; // bind kube-system id
  kubeSystemUpdateAt?: Date;
  isDeleted?: boolean;
};

export type ClusterRecordPayload = {
  uid: string; // user ID
  orderID?: string; // order ID
  type: ClusterType; // cluster type
};

export type CreateClusterParams = {
  orderID?: string; // order ID
  type: ClusterType; // license type
};

export type ClusterResult = {
  clusterId: string; // cluster ID 唯一
  uid: string; // user ID 唯一
  orderID?: string; // order ID 唯一
  licenseID?: ObjectId; // license ID
  type: ClusterType; // license type
  createdAt: Date;
  updatedAt: Date;
  // v1 new
  displayName?: string;
  kubeSystemID?: string;
  kubeSystemUpdateAt?: Date;
  isDeleted?: boolean;
};

export type CommandFormType = {
  cloudVersion: string;
  imageRegistry: string;
  proxyPrefix: string;
  masterIP: string[];
  nodeIP: string[];
  sshPath: string;
  sshPassword: string;
  podSubnet: string;
  serviceSubnet: string;
  cloudDomain: string;
  cloudPort: string;
  certPath: string;
  certKeyPath: string;
};
