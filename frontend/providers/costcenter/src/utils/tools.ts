import { NextApiRequest } from 'next';
import { AxiosInstance } from 'axios';
import crypto from 'crypto';

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

type RealNameInfoResponse = {
  data: {
    userID: string;
    isRealName: boolean;
  };
  error?: string;
  message: string;
};

export const checkSealosUserIsRealName = async (client: AxiosInstance): Promise<boolean> => {
  try {
    if (!global.AppConfig.costCenter.realNameRechargeLimit) {
      return true;
    }

    const response = await client.post('/account/v1alpha1/real-name-info');
    const realNameInfoData: RealNameInfoResponse = await response.data;

    if (realNameInfoData.error) {
      console.error(realNameInfoData.error);
      return false;
    }

    return realNameInfoData.data.isRealName;
  } catch (error) {
    console.error(error);
    return false;
  }
};
