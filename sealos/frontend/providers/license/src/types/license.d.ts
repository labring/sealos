export type LicenseRecord = {
  _id?: string;
  token: string;
  activationTime: string;
  claims: {
    type: string;
    data: {
      amount: number;
    };
    registeredclaims: {
      issuer: string;
      subject: string;
      audience: null | string[];
      expiresat: {
        time: Date;
      };
      notbefore: null | string;
      issuedat: {
        time: Date;
      };
      id: string;
    };
  };
};

export type LicenseCollection = {
  uid: string;
  license: License[];
};

export type LicenseYaml = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    type: string;
    token: string;
  };
};

export type LicenseCR = {
  apiVersion: string;
  kind: string;
  metadata: {
    annotations: {
      [key: string]: string;
    };
    creationTimestamp: string;
    generation: number;
    name: string;
    namespace: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    token: string;
    type: string;
  };
  status: {
    activationTime: string;
    expirationTime: string;
    phase: 'Active' | 'Failed';
    reason: string;
  };
};

export type LicenseToken = {
  iss: string;
  iat: number;
  exp: number;
  type: string;
  clusterID: string;
  data: {
    nodeCount: number;
    totalCPU: number;
    totalMemory: number;
  };
};
