import request from '@/service/request';
import { ApiResp } from '@/types/api';

export interface AccountBalanceResponse {
  deductionBalance: number;
  balance: number;
}

export interface AccountSummary {
  balance: number | null;
  expenditure: number | null;
  recharge: number | null;
}

export function getAccountSummary(account?: AccountBalanceResponse | null): AccountSummary {
  if (!account || !Number.isFinite(account.balance) || !Number.isFinite(account.deductionBalance)) {
    return { balance: null, expenditure: null, recharge: null };
  }

  return {
    balance: account.balance - account.deductionBalance,
    expenditure: account.deductionBalance,
    recharge: account.balance
  };
}

// Get account balance data
export const getAccountBalance = () =>
  request.post<any, ApiResp<AccountBalanceResponse>>('/api/account/getAmount');
