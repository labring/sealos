export enum PAYMENTSTATUS {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
  CANCEL = 'USER_CANCEL'
}

export interface EnterpriseAuthInfo {
  paymentStatus: PAYMENTSTATUS;
  key: string;
  accountBank: string;
  accountNo: string;
  keyName: string;
  usrName: string;
  contactInfo: string;
  remainingAttempts: number;
}

export interface AdditionalInfo {
  paymentStatus: PAYMENTSTATUS;
  key: string;
  accountBank: string;
  accountNo: string;
  keyName: string;
  usrName: string;
  contactInfo: string;
  transAmt: string;
  authTimes: number;
}
