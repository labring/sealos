import { GET, POST } from '@/services/request';
import { PaymentParams, PaymentResultParams, StripePaymentData, WechatPaymentData } from '@/types';

export const createPayment = (payload: PaymentParams) =>
  POST<StripePaymentData & WechatPaymentData>('/api/payment/create', payload);

export const getPaymentResult = (payload: PaymentResultParams) =>
  POST('/api/payment/result', payload);
