import request from '@/service/request';
import { ApiResp } from '@/types/api';
import {
  PlanListResponse,
  PlanListResponseSchema,
  SubscriptionInfoResponse,
  LastTransactionResponse,
  UpgradeAmountRequest,
  UpgradeAmountResponse,
  SubscriptionPayRequest,
  PaymentResponse,
  WorkspaceSubscriptionListResponse,
  PaymentListResponse,
  PaymentListRequest,
  PaymentStatusRequest,
  PaymentStatusResponse,
  WorkspaceSubscriptionCardInfoRequest,
  CardInfoResponse,
  WorkspaceSubscriptionManageCardRequest,
  PortalSessionResponse,
  InvoiceCancelRequest,
  InvoiceCancelResponse
} from '@/types/plan';

/** Fetches plan list and deserializes with Zod so MaxResources is Record<string, Quantity>. */
export const getPlanList = async () => {
  const res = await request<any, ApiResp<unknown>>('/api/plan/list', {
    method: 'POST'
  });
  const parsed = PlanListResponseSchema.safeParse(res?.data);
  if (!parsed.success) throw parsed.error;
  return { ...res, data: parsed.data } as ApiResp<PlanListResponse>;
};

/**
 * Get subscription payment records list.
 * @returns payment records
 */
export const getPaymentList = (data: PaymentListRequest) =>
  request<any, ApiResp<PaymentListResponse>>('/api/plan/payment-list', {
    method: 'POST',
    data
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
  request<any, ApiResp<UpgradeAmountResponse>>('/api/plan/upgrade-amount', {
    method: 'POST',
    data
  });

// Create subscription payment
export const createSubscriptionPayment = (data: SubscriptionPayRequest) =>
  request<any, ApiResp<PaymentResponse>>('/api/plan/pay', {
    method: 'POST',
    data
  });

// Get user all regions workspace subscription list
export const getWorkspaceSubscriptionList = () =>
  request<any, ApiResp<WorkspaceSubscriptionListResponse>>('/api/plan/subscription-list', {
    method: 'POST'
  });

// Get payment status by payId
export const getPaymentStatus = (data: PaymentStatusRequest) =>
  request<any, ApiResp<PaymentStatusResponse>>('/api/plan/status', {
    method: 'POST',
    data
  });

/**
 * Get workspace subscription card info
 * @param data - Card info request data
 * @returns Card info response
 */
export const getCardInfo = (data: WorkspaceSubscriptionCardInfoRequest) =>
  request<any, ApiResp<CardInfoResponse>>('/api/plan/card-info', {
    method: 'POST',
    data
  });

/**
 * Create card management portal session
 * @param data - Card management request data
 * @returns Portal session response with URL
 */
export const createCardManageSession = (data: WorkspaceSubscriptionManageCardRequest) =>
  request<any, ApiResp<PortalSessionResponse>>('/api/plan/manage-card', {
    method: 'POST',
    data
  });

/**
 * Cancel unpaid workspace subscription upgrade invoice
 * @param data - Invoice cancel request data
 * @returns Invoice cancel response
 */
export const cancelInvoice = (data: InvoiceCancelRequest) =>
  request<any, ApiResp<InvoiceCancelResponse>>('/api/plan/invoice-cancel', {
    method: 'POST',
    data
  });
