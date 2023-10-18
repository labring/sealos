import { enableSealosPay } from './enable';

export const getSealosPay = () => {
  if (!process.env.SEALOS_PAY_UEL || !process.env.SEALOS_PAY_ID || !process.env.SEALOS_PAY_KEY) {
    throw new Error('sealos payment has not been activated');
  }

  return {
    SEALOS_PAY_UEL: process.env.SEALOS_PAY_UEL,
    SEALOS_PAY_ID: process.env.SEALOS_PAY_ID,
    SEALOS_PAY_KEY: process.env.SEALOS_PAY_KEY
  };
};
