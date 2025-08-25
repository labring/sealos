import { GET, POST } from '@/services/request';
import {
  CheckWeChatType,
  PaymentData,
  PaymentParams,
  PaymentResult,
  PaymentResultParams
} from '@/types';

export const createPayment = (payload: PaymentParams) =>
  POST<PaymentData>('/api/payment/create', payload);

export const handlePaymentResult = (payload: PaymentResultParams) =>
  POST<PaymentResult>('/api/payment/result', payload);

export const checkWechatPay = (type: CheckWeChatType) =>
  GET<PaymentResult>('/api/payment/checkWechat', { type });
