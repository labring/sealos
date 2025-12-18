import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import { getRechargeBillingList } from '@/api/billing';
import useOverviewStore from '@/stores/overview';
import RechargePanelView, { RechargeRow } from './RechargePanelView';

export default function RechargePanel() {
  const { startTime, endTime, setStartTime, setEndTime } = useOverviewStore();
  const [orderIdFilter, setOrderIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

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

  // Fetch recharge billing data with pagination
  const { data, isFetching } = useQuery(
    [
      'billing',
      'recharge',
      { startTime: effectiveStartTime, endTime: effectiveEndTime, page, pageSize }
    ],
    () =>
      getRechargeBillingList({
        startTime: formatISO(effectiveStartTime, { representation: 'complete' }),
        endTime: formatISO(effectiveEndTime, { representation: 'complete' }),
        page,
        pageSize
      }),
    {
      keepPreviousData: true
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [orderIdFilter, effectiveStartTime, effectiveEndTime]);

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
      page={page}
      totalPages={data?.data?.totalPage || 1}
      totalItems={data?.data?.total || 0}
      pageSize={pageSize}
      onPageChange={setPage}
    />
  );
}
