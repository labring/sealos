import request from '@/service/request';
import { ApiResp } from '@/types/api';

export interface AccountBalanceResponse {
  deductionBalance: number;
  balance: number;
}

// Get account balance data
export const getAccountBalance = () =>
  request.post<any, ApiResp<AccountBalanceResponse>>('/api/account/getAmount');
