import { GET, POST } from '@/services/request';
import { PaymentData, PaymentParams, PaymentResult } from '@/types';

export const createPayment = (payload: PaymentParams) =>
  POST<PaymentData>('/api/payment/create', payload);

export const getPaymentResult = (payload: { orderID: string }) =>
  POST<PaymentResult>('/api/payment/result', payload);
