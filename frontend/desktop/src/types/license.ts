export type LicenseCR = {
  apiVersion: 'license.sealos.io/v1';
  kind: 'License';
  metadata: {
    annotations?: {
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
    type: 'Account' | 'Cluster';
  };
  status: {
    activationTime?: string;
    expirationTime?: string;
    phase: 'Pending' | 'Active' | 'Failed';
    reason?: string;
    validationCode?: number;
  };
};

// API response type for license check
export type LicenseCheckResponse = {
  hasLicense: boolean;
};
