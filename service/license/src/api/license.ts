import { GET, POST } from '@/services/request';
import { LicensePayStatus, LicensePayload, LicenseRecord, Payment } from '@/types';
import { number } from 'react-i18next/icu.macro';

export const licensePay = ({
  amount,
  quota,
  paymentMethod,
  hid
}: {
  amount: number;
  quota: number;
  paymentMethod: 'wechat' | 'stripe';
  hid: string;
}) =>
  POST<Payment>('/api/license/pay', {
    amount,
    quota,
    paymentMethod,
    hid
  });

export const createLicenseRecord = (payload: LicensePayload) =>
  POST('/api/license/createLicenseRecord', payload);

export const getLicenseResult = (paymentName: string) =>
  GET<LicensePayStatus>('/api/license/result', {
    paymentName: paymentName
  });

export const getLicenseRecord = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: LicenseRecord[] }>('/api/license/getLicenseRecord', {
    page,
    pageSize
  });
