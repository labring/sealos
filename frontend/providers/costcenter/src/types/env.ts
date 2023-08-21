export type EnvData = {
  rechargeEnabled: boolean;
  transferEnabled: boolean;
  stripeEnabled: boolean;
  wechatEnabled: boolean;
  currency: 'shellCoin' | 'cny' | 'usd';
  invoiceEnabled: boolean;
  gpuEnabled: boolean;
  stripePub: string;
};
