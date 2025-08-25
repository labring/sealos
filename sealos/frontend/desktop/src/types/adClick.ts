export type AdClickData = {
  clickId: string;
} & (
  | {
      source: 'Baidu';
      additionalData: {
        newType: number[];
      };
    }
  | {
      source: 'Bing';
      additionalData: {
        timestamp: number;
      };
    }
);
