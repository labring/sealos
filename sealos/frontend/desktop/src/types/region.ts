export type Region = {
  domain: string;
  displayName: string;
  uid: string;
  location: string;
  description: {
    prices: {
      name: string;
      unit_price: number;
      unit: string;
    }[];
    serial: string;
    provider: string;
    description: {
      zh: string;
      en: string;
    };
  };
};
