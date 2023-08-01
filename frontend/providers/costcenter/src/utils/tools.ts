export const retrySerially = <T>(fn: () => Promise<T>, times: number) =>
  new Promise((res, rej) => {
    let retries = 0;
    const attempt = () => {
      fn()
        .then((_res) => {
          res(_res);
        })
        .catch((error) => {
          retries++;
          console.log(`Attempt ${retries} failed: ${error}`);
          retries < times ? attempt() : rej(error);
        });
    };
    attempt();
  });
import crypto from 'crypto';
export function genSign(secret: string, timestamp: number | string) {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', stringToSign);
  const signature = hmac.digest('base64');
  return signature;
}
export const isValidPhoneNumber = (phone: string) => {
  const regExp = /^1[3-9]\d{9}$/;
  return regExp.test(phone);
};
export const isValidCNTaxNumber = (taxNumber: string) => {
  return [15, 17, 18].includes(taxNumber.length);
};
export const isValidBANKAccount = (bankAccount: string) => {
  const regExp = /^[0-9]{12,22}$/;
  return regExp.test(bankAccount);
};
export const isValidEmail = (email: string) => {
  const regExp = /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
  return regExp.test(email);
};
