import request from '@/service/request';
import useOverviewStore from '@/stores/overview';
import { ApiResp } from '@/types/api';
import { BillingSpec, BillingData } from '@/types/billing';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, formatISO } from 'date-fns';

export default function useBillingData(props?: { type: -1 | 0 | 1 | 2 | 3 }) {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  return useQuery({
    queryKey: ['billing', { startTime, endTime }],
    queryFn: () => {
      const start = startTime;
      const end = endTime;
      const delta = differenceInDays(end, start);
      const spec: BillingSpec = {
        startTime: formatISO(start, { representation: 'complete' }),
        endTime: formatISO(end, { representation: 'complete' }),
        page: 1,
        pageSize: (delta + 1) * 48,
        type: props?.type || -1,
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
