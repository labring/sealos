export const getSealosPay = () => {
  if (!process.env.SEALOS_PAY_UEL || !process.env.SEALOS_PAY_ID || !process.env.SEALOS_PAY_KEY) {
    throw new Error('sealos payment has not been activated');
  }

  return {
    sealosPayUrl: process.env.SEALOS_PAY_UEL,
    sealosPayID: process.env.SEALOS_PAY_ID,
    sealosPayKey: process.env.SEALOS_PAY_KEY
  };
};
