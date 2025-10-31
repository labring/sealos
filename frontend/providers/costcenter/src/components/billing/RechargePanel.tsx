import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp, RechargeBillingData, RechargeBillingItem } from '@/types';
import RechargePanelView, { RechargeRow } from './RechargePanelView';

export default function RechargePanel() {
  const { startTime, endTime, setStartTime, setEndTime } = useOverviewStore();
  const { getRegion } = useBillingStore();
  const [orderIdFilter, setOrderIdFilter] = useState('');

  // Convert store dates to DateRange format
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startTime,
    to: endTime
  });

  // Sync dateRange with store when store changes
  useEffect(() => {
    setDateRange({
      from: startTime,
      to: endTime
    });
  }, [startTime, endTime]);

  // Calculate effective times for API calls
  const effectiveStartTime = useMemo(() => {
    return dateRange?.from ? dateRange.from : startTime;
  }, [dateRange?.from, startTime]);

  const effectiveEndTime = useMemo(() => {
    return dateRange?.to ? dateRange.to : endTime;
  }, [dateRange?.to, endTime]);

  // Fetch recharge billing data
  const { data, isFetching } = useQuery(
    ['billing', 'recharge', { startTime: effectiveStartTime, endTime: effectiveEndTime }],
    () => {
      const body = {
        startTime: formatISO(effectiveStartTime, { representation: 'complete' }),
        endTime: formatISO(effectiveEndTime, { representation: 'complete' }),
        regionUid: getRegion()?.uid || ''
      };
      return request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
        method: 'POST',
        data: body
      });
    }
  );

  // Transform data to rows format
  const rows: RechargeRow[] = useMemo(() => {
    const payments = data?.data?.payments || [];
    return payments.map((payment) => ({
      id: payment.ID,
      createdAt: payment.CreatedAt,
      gift: payment.Gift,
      amount: payment.Amount,
      raw: payment
    }));
  }, [data?.data?.payments]);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);

    // Update the overview store with new dates
    if (range?.from) {
      setStartTime(range.from);
    }
    if (range?.to) {
      setEndTime(range.to);
    }
  };

  return (
    <RechargePanelView
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={setOrderIdFilter}
      rows={rows}
      isLoading={isFetching}
    />
  );
}
