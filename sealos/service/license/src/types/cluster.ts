import { ObjectId } from 'mongodb';

export enum ClusterType {
  Standard = 'Standard',
  Enterprise = 'Enterprise',
  ScaledStandard = 'ScaledStandard',
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
  // v1.1
  cpu: number;
  memory: number;
  months: string;
};

export type ClusterRecordPayload = {
  uid: string; // user ID
  orderID?: string; // order ID
  type: ClusterType; // cluster type
} & ClusterFormType;

export type CreateClusterParams = {
  orderID?: string; // order ID
  type: ClusterType; // license type
} & ClusterFormType;

export type CommandFormType = {
  cloudVersion: string;
  useImageRegistry: boolean;
  imageRegistry: string;
  useProxyPrefix: boolean;
  proxyPrefix: string;
  masterIP: {
    ip: string;
  }[];
  nodeIP: { ip: string }[];
  ssh: {
    useKey: boolean;
    path: string;
    password: string;
  };
  k8sVersion: string;
  podSubnet: string;
  serviceSubnet: string;
  cloudDomain: string;
  cloudPort: string;
  selfSigned: boolean;
  certPath: string;
  certKeyPath: string;
};

export type ClusterFormType = {
  cpu: number;
  memory: number;
  months: string;
  name?: string;
  systemId?: string;
};
