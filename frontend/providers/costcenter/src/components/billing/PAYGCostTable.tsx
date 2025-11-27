import { useMemo, useState, useEffect, useReducer, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp, AppOverviewBilling } from '@/types';
import useAppTypeStore from '@/stores/appType';
import { PAYGCostTableView, PAYGData } from './PAYGCostTableView';
import { AppType } from '@/types/app';

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

// Query filter state
export type QueryFilters = {
  currentRegionUid: string;
  selectedRegion: string | null;
  selectedWorkspace: string | null;
  effectiveStartTime: string;
  effectiveEndTime: string;
  selectedAppType: AppType | null;
};

type QueryState = {
  filters: QueryFilters;
  page: number;
  pageSize: number;
};

// Actions for managing query state
type QueryAction =
  | { type: 'SET_FILTERS'; payload: Partial<QueryFilters> }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'RESET_PAGE' };

// Reducer for managing query state
function queryReducer(state: QueryState, action: QueryAction): QueryState {
  switch (action.type) {
    case 'SET_FILTERS':
      // When filters change, reset page to 1
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        },
        page: 1
      };
    case 'SET_PAGE':
      // When page changes, keep filters unchanged
      return {
        ...state,
        page: action.payload
      };
    case 'RESET_PAGE':
      return {
        ...state,
        page: 1
      };
    default:
      return state;
  }
}

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

  // Initialize reducer state
  const [queryState, dispatch] = useReducer(queryReducer, {
    filters: {
      currentRegionUid,
      selectedRegion,
      selectedWorkspace,
      effectiveStartTime,
      effectiveEndTime,
      selectedAppType: null
    },
    page,
    pageSize
  });

  // Track if page change is from internal reducer or external
  const isInternalPageChangeRef = useRef(false);

  // Sync external filter changes to reducer state
  useEffect(() => {
    const externalFilters: Partial<QueryFilters> = {};
    let hasFilterChanged = false;

    if (queryState.filters.currentRegionUid !== currentRegionUid) {
      externalFilters.currentRegionUid = currentRegionUid;
      hasFilterChanged = true;
    }
    if (queryState.filters.selectedRegion !== selectedRegion) {
      externalFilters.selectedRegion = selectedRegion;
      hasFilterChanged = true;
    }
    if (queryState.filters.selectedWorkspace !== selectedWorkspace) {
      externalFilters.selectedWorkspace = selectedWorkspace;
      hasFilterChanged = true;
    }
    if (queryState.filters.effectiveStartTime !== effectiveStartTime) {
      externalFilters.effectiveStartTime = effectiveStartTime;
      hasFilterChanged = true;
    }
    if (queryState.filters.effectiveEndTime !== effectiveEndTime) {
      externalFilters.effectiveEndTime = effectiveEndTime;
      hasFilterChanged = true;
    }

    if (hasFilterChanged) {
      // Mark as internal change since SET_FILTERS will reset page to 1
      isInternalPageChangeRef.current = true;
      dispatch({ type: 'SET_FILTERS', payload: externalFilters });
    }
  }, [
    currentRegionUid,
    selectedRegion,
    selectedWorkspace,
    effectiveStartTime,
    effectiveEndTime,
    queryState.filters.currentRegionUid,
    queryState.filters.selectedRegion,
    queryState.filters.selectedWorkspace,
    queryState.filters.effectiveStartTime,
    queryState.filters.effectiveEndTime
  ]);

  // Sync reducer page state to parent component (only when changed by reducer)
  useEffect(() => {
    if (isInternalPageChangeRef.current && queryState.page !== page) {
      isInternalPageChangeRef.current = false;
      onPageChange(queryState.page);
    }
  }, [queryState.page, page, onPageChange]);

  // Sync external page changes to reducer state
  useEffect(() => {
    if (!isInternalPageChangeRef.current && page !== queryState.page) {
      dispatch({ type: 'SET_PAGE', payload: page });
    }
  }, [page, queryState.page]);

  // Handle page change from pagination component
  const handlePageChange = (newPage: number) => {
    isInternalPageChangeRef.current = true;
    dispatch({ type: 'SET_PAGE', payload: newPage });
  };

  const appOverviewQueryBody = useMemo(
    () => ({
      endTime: queryState.filters.effectiveEndTime,
      startTime: queryState.filters.effectiveStartTime,
      regionUid: queryState.filters.currentRegionUid,
      appType: queryState.filters.selectedAppType || '',
      appName: '',
      namespace: queryState.filters.selectedWorkspace || '',
      page: queryState.page,
      pageSize: queryState.pageSize
    }),
    [
      queryState.filters.effectiveEndTime,
      queryState.filters.effectiveStartTime,
      queryState.filters.currentRegionUid,
      queryState.filters.selectedWorkspace,
      queryState.filters.selectedAppType,
      queryState.page,
      queryState.pageSize
    ]
  );

  const [lastValidTotalPage, setLastValidTotalPage] = useState(1);

  const { data: appOverviewData, isFetching } = useQuery({
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
    queryKey: ['appOverviewBilling', appOverviewQueryBody, queryState.page, queryState.pageSize],
    enabled: !!queryState.filters.currentRegionUid && !!queryState.filters.selectedRegion
  });

  // Calculate pagination info and preserve last valid page count during loading
  const { total, totalPage } = useMemo(() => {
    if (!appOverviewData?.data) {
      // During loading, keep the last valid total page to prevent reset to 1
      return { total: 0, totalPage: lastValidTotalPage };
    }

    const { total, totalPage } = appOverviewData.data;
    const calculatedTotalPage = totalPage === 0 ? 1 : totalPage;

    // Update last valid total page when we get new data
    setLastValidTotalPage(calculatedTotalPage);

    return {
      total: totalPage === 0 ? 1 : total,
      totalPage: calculatedTotalPage
    };
  }, [appOverviewData, lastValidTotalPage]);

  const paygData: PAYGData[] = useMemo(() => {
    const result: PAYGData[] = [];
    if (queryState.filters.selectedRegion && appOverviewData?.data?.overviews) {
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
  }, [appOverviewData, queryState.filters.selectedRegion, getAppTypeString]);

  const timeRange = `${new Date(
    queryState.filters.effectiveStartTime
  ).toLocaleDateString()} – ${new Date(queryState.filters.effectiveEndTime).toLocaleDateString()}`;

  if (!queryState.filters.selectedRegion) return null;

  // Handle filter changes from view component
  const handleFiltersChange = (filters: Partial<QueryFilters>) => {
    isInternalPageChangeRef.current = true;
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  return (
    <PAYGCostTableView
      data={paygData}
      timeRange={timeRange}
      onUsageClick={onUsageClick}
      currentPage={queryState.page}
      totalPages={totalPage}
      pageSize={queryState.pageSize}
      totalCount={total}
      onPageChange={handlePageChange}
      isLoading={isFetching}
      filters={queryState.filters}
      onFiltersChange={handleFiltersChange}
    />
  );
}
