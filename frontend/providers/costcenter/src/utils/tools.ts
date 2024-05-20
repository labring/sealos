import { NextApiRequest } from 'next';

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
  const regExp = /^\d+$/;
  return regExp.test(bankAccount);
};
export const isValidEmail = (email: string) => {
  const regExp = /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
  return regExp.test(email);
};
export function getClientIPFromRequest(req: NextApiRequest) {
  // try to get ip from x-forwarded-for
  const ips_str = req.headers['x-forwarded-for'] as string;
  if (ips_str) {
    const ips = ips_str.split(',');
    return ips[0];
  }

  // try to get ip from x-real-ip
  const ip = req.headers['x-real-ip'] as string;
  if (ip) {
    return ip;
  }

  return undefined;
}
