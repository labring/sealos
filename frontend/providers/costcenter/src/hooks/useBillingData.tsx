import request from '@/service/request';
import useOverviewStore from '@/stores/overview';
import { ApiResp } from '@/types/api';
import { BillingSpec, BillingData, BillingType } from '@/types/billing';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, formatISO } from 'date-fns';

export default function useBillingData(props?: {
  type?: BillingType;
  endTime?: Date;
  startTime?: Date;
  pageSize?: number;
}) {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  return useQuery({
    queryKey: ['billing', { startTime, endTime, pageSize: props?.pageSize }],
    queryFn: () => {
      const start = props?.startTime ?? startTime;
      const end = props?.endTime ?? endTime;
      const delta = differenceInDays(end, start);
      const spec: BillingSpec = {
        startTime: formatISO(start, { representation: 'complete' }),
        endTime: formatISO(end, { representation: 'complete' }),
        page: 1,
        pageSize: props?.pageSize ? props.pageSize : (delta + 1) * 48,
        type: -1,
        orderID: '',
        appType: '',
        namespace: ''
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
