import request from '@/service/request';
import { ApiResp } from '@/types/api';
import {
  PlanListResponse,
  SubscriptionInfoResponse,
  LastTransactionResponse,
  UpgradeAmountRequest,
  UpgradeAmountResponse,
  SubscriptionPayRequest,
  PaymentResponse
} from '@/types/plan';

// Get all subscription plans
export const getPlanList = () =>
  request<any, ApiResp<PlanListResponse>>('/api/plan/list', {
    method: 'POST'
  });

// Get current workspace subscription info
export const getSubscriptionInfo = (data: { workspace: string; regionDomain: string }) =>
  request<any, ApiResp<SubscriptionInfoResponse>>('/api/plan/info', {
    method: 'POST',
    data
  });

// Get last subscription transaction
export const getLastTransaction = (data: { workspace: string; regionDomain: string }) =>
  request<any, ApiResp<LastTransactionResponse>>('/api/plan/transaction', {
    method: 'POST',
    data
  });

// Calculate upgrade amount
export const getUpgradeAmount = (data: UpgradeAmountRequest) =>
  request<any, ApiResp<UpgradeAmountResponse>>('/api/plan/amount', {
    method: 'POST',
    data
  });

// Create subscription payment
export const createSubscriptionPayment = (data: SubscriptionPayRequest) =>
  request<any, ApiResp<PaymentResponse>>('/api/plan/pay', {
    method: 'POST',
    data
  });
