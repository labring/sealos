export type ValuationStandard = {
  name: string;
  unit: string;
  price: string;
};

export type ValuationData = {
    apiVersion: 'account.sealos.io/v1';
    kind: 'PriceQuery';
    metadata: any
    spec: {};
    status: {
      billingRecords: {
        price: number;
        resourceType: string;
      }[];
    };
};
