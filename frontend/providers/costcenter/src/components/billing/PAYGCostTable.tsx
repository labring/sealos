import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp, AppOverviewBilling } from '@/types';
import useAppTypeStore from '@/stores/appType';
import { PAYGCostTableView, PAYGData } from './PAYGCostTableView';

type PAYGCostTableProps = {
  currentRegionUid: string;
  selectedRegion: string | null;
  selectedWorkspace: string | null;
  effectiveStartTime: string;
  effectiveEndTime: string;
  page: number;
  pageSize: number;
  onUsageClick?: (item: PAYGData) => void;
  onPageChange: (page: number) => void;
};

/**
 * PAYGCostTable container.
 * Fetches PAYG overview data and renders PAYGCostTableView.
 */
export function PAYGCostTable({
  currentRegionUid,
  selectedRegion,
  selectedWorkspace,
  effectiveStartTime,
  effectiveEndTime,
  page,
  pageSize,
  onUsageClick,
  onPageChange
}: PAYGCostTableProps) {
  const { getAppType: getAppTypeString } = useAppTypeStore();

  const appOverviewQueryBody = useMemo(
    () => ({
      endTime: effectiveEndTime,
      startTime: effectiveStartTime,
      regionUid: currentRegionUid,
      appType: '',
      appName: '',
      namespace: selectedWorkspace || '',
      page,
      pageSize
    }),
    [effectiveEndTime, effectiveStartTime, currentRegionUid, selectedWorkspace, page, pageSize]
  );

  const { data: appOverviewData } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          overviews: AppOverviewBilling[];
          total: number;
          totalPage: number;
        }>
      >('/api/billing/appOverview', appOverviewQueryBody);
    },
    queryKey: ['appOverviewBilling', appOverviewQueryBody, page, pageSize],
    enabled: !!currentRegionUid && !!selectedRegion
  });

  // Calculate pagination info
  const { total, totalPage } = useMemo(() => {
    if (!appOverviewData?.data) {
      return { total: 0, totalPage: 1 };
    }

    const { total, totalPage } = appOverviewData.data;

    return {
      total: totalPage === 0 ? 1 : total,
      totalPage: totalPage === 0 ? 1 : totalPage
    };
  }, [appOverviewData]);

  const paygData: PAYGData[] = useMemo(() => {
    const result: PAYGData[] = [];
    if (selectedRegion && appOverviewData?.data?.overviews) {
      appOverviewData.data.overviews.forEach((overview) => {
        result.push({
          appName: overview.appName,
          appType: getAppTypeString(overview.appType.toString()),
          cost: overview.amount,
          namespace: overview.namespace
        });
      });
    }
    return result;
  }, [appOverviewData, selectedRegion, getAppTypeString]);

  const timeRange = `${new Date(effectiveStartTime).toLocaleDateString()} – ${new Date(
    effectiveEndTime
  ).toLocaleDateString()}`;

  if (!selectedRegion) return null;

  return (
    <PAYGCostTableView
      data={paygData}
      timeRange={timeRange}
      onUsageClick={onUsageClick}
      currentPage={page}
      totalPages={totalPage}
      pageSize={pageSize}
      totalCount={total}
      onPageChange={onPageChange}
    />
  );
}
