import { useState, useMemo, useEffect } from 'react';
import { PAYGAppBillingDrawerView } from './PAYGAppBillingDrawerView';
import { AppType } from '@/types/app';
import { APPBillingItem } from '@/types';
import useAppTypeStore from '@/stores/appType';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types/api';

export interface AppBillingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedApp: any | null;
  currentRegionUid: string;
  currentRegionName: string | null;
  effectiveStartTime: string;
  effectiveEndTime: string;
}

export function AppBillingDrawer({
  open,
  onOpenChange,
  selectedApp,
  currentRegionUid,
  currentRegionName,
  effectiveStartTime,
  effectiveEndTime
}: AppBillingDrawerProps) {
  const [appBillingPage, setAppBillingPage] = useState(1);
  const [appBillingPageSize] = useState(10);
  const [appDateRange, setAppDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(effectiveStartTime),
    to: new Date(effectiveEndTime)
  });

  const { getAppType: getAppTypeString } = useAppTypeStore();

  // App billing query for drawer
  const appBillingQueryBody = useMemo(() => {
    if (!selectedApp) return null;

    const drawerStartTime = appDateRange?.from
      ? appDateRange.from.toISOString()
      : effectiveStartTime;
    const drawerEndTime = appDateRange?.to ? appDateRange.to.toISOString() : effectiveEndTime;

    return {
      endTime: drawerEndTime,
      startTime: drawerStartTime,
      regionUid: currentRegionUid,
      appType: selectedApp.appType,
      appName: selectedApp.appName,
      namespace: selectedApp.namespace || '',
      page: appBillingPage,
      pageSize: appBillingPageSize
    };
  }, [
    selectedApp,
    appDateRange,
    effectiveStartTime,
    effectiveEndTime,
    currentRegionUid,
    appBillingPage,
    appBillingPageSize
  ]);

  // App billing data query
  const {
    data: appBillingData,
    isLoading,
    error
  } = useQuery({
    queryFn() {
      if (!appBillingQueryBody) throw new Error('No params provided');

      return request.post<
        any,
        ApiResp<{
          costs: APPBillingItem[];
          current_page: number;
          total_pages: number;
          total_records: number;
        }>
      >('/api/billing/appBilling', appBillingQueryBody);
    },
    queryKey: ['appBillingDrawer', appBillingQueryBody, appBillingPage, appBillingPageSize],
    enabled: !!appBillingQueryBody,
    keepPreviousData: true
  });

  // Transform app billing data
  const appBillingDetails = useMemo(() => {
    if (!appBillingData?.data?.costs) return [];

    return appBillingData.data.costs.map((item): any => ({
      appName: item.app_name,
      appType: getAppTypeString(item.app_type.toString()),
      time: new Date(item.time),
      orderId: item.order_id,
      namespace: item.namespace,
      amount: item.amount,
      usage: {
        // Map from used and used_amount arrays based on resource type indices
        // 0: cpu, 1: memory, 2: storage, 3: network, 4: port, 5: gpu
        cpu: item?.used?.['0']
          ? { amount: item.used['0'], cost: item.used_amount['0'] }
          : undefined,
        memory: item?.used?.['1']
          ? { amount: item.used['1'], cost: item.used_amount['1'] }
          : undefined,
        storage: item?.used?.['2']
          ? { amount: item.used['2'], cost: item.used_amount['2'] }
          : undefined,
        network: item?.used?.['3']
          ? { amount: item.used['3'], cost: item.used_amount['3'] }
          : undefined,
        port: item?.used?.['4']
          ? { amount: item.used['4'], cost: item.used_amount['4'] }
          : undefined,
        gpu: item?.used?.['5'] ? { amount: item.used['5'], cost: item.used_amount['5'] } : undefined
      }
    }));
  }, [appBillingData, getAppTypeString]);

  // Calculate pagination info
  const { total, totalPage } = useMemo(() => {
    if (!appBillingData?.data) {
      return { total: 0, totalPage: 1 };
    }

    const { total_records: total, total_pages: totalPage } = appBillingData.data;

    return {
      total: totalPage === 0 ? 1 : total,
      totalPage: totalPage === 0 ? 1 : totalPage
    };
  }, [appBillingData]);

  // Reset pagination when page exceeds total
  useEffect(() => {
    if (totalPage < appBillingPage) {
      setAppBillingPage(1);
    }
  }, [totalPage, appBillingPage]);

  if (!selectedApp) return null;

  return (
    <PAYGAppBillingDrawerView
      open={open}
      onOpenChange={onOpenChange}
      appType={selectedApp.appType || ''}
      namespace={selectedApp.namespace || ''}
      hasSubApps={selectedApp.appType === AppType.APP_STORE}
      data={appBillingDetails}
      appName={selectedApp.appName || 'Unknown App'}
      region={currentRegionName || 'Unknown Region'}
      currentPage={appBillingPage}
      totalPages={totalPage}
      pageSize={appBillingPageSize}
      totalCount={total}
      onPageChange={setAppBillingPage}
      dateRange={appDateRange}
      onDateRangeChange={setAppDateRange}
      onOpenApp={() => {
        // Handle open app logic
        console.log('Open app:', selectedApp?.appName);
      }}
    />
  );
}
