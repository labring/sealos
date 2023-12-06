import { ApiResp } from '@/services/backend/response';
import request from '@/services/request';
import { BillingSpec, BillingData, BillingType } from '@/types/billing';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, formatISO, startOfDay } from 'date-fns';

export default function useBillingData() {
  const end = startOfDay(new Date());
  return useQuery({
    queryKey: ['billing', { end }],
    queryFn: () => {
      const spec: BillingSpec = {
        appType: 'OBJECT-STORAGE',
        startTime: formatISO(startOfDay(end), { representation: 'complete' }),
        endTime: formatISO(endOfDay(end), { representation: 'complete' }),
        page: 1,
        pageSize: 1,
        type: BillingType.CONSUME,
        orderID: ''
      };
      return request<any, ApiResp<BillingData>, { spec: BillingSpec }>('/api/billing', {
        method: 'POST',
        data: {
          spec
        }
      });
    }
  });
}
