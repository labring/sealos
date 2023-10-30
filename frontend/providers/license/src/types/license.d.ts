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
