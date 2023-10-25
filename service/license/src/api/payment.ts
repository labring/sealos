import { GET, POST } from '@/services/request';
import { PaymentData, PaymentParams, PaymentResult, PaymentResultParams } from '@/types';

export const createPayment = (payload: PaymentParams) =>
  POST<PaymentData>('/api/payment/create', payload);

export const handlePaymentResult = (payload: PaymentResultParams) =>
  POST<PaymentResult>('/api/payment/result', payload);

export const checkWechatPay = () => GET<PaymentResult>('/api/payment/checkWechat');
