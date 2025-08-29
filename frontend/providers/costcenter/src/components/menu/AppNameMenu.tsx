import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp } from '@/types';
import { AppListItem } from '@/types/app';
import { FlexProps } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo } from 'react';
import BaseMenu from './BaseMenu';

export default function AppNameMenu({
  isDisabled,
  innerWidth = '360px',
  ...props
}: {
  innerWidth?: string;
  isDisabled: boolean;
} & FlexProps) {
  const { setAppName, getNamespace, getRegion, getAppType, appNameIdx } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();
  const regionUid = getRegion()?.uid || '';
  const queryBody = {
    endTime,
    startTime,
    regionUid,
    appType: getAppType(),
    namespace: getNamespace()?.[0] || ''
  };
  const { t } = useTranslation('applist');
  const { data, isFetching, isStale } = useQuery({
    queryFn() {
      return request.post<any, ApiResp<{ apps: AppListItem[] }>>(
        '/api/billing/getAppNameList',
        queryBody
      );
    },
    queryKey: ['appNameList', 'menu', queryBody]
  });
  const { t: commonT } = useTranslation();
  const { appNameList, setAppNameList } = useBillingStore();
  useEffect(() => {
    const apps = (data?.data?.apps || []).filter((app) => !!app.appName).map((app) => app.appName);
    setAppNameList(apps);
    // setAppName(0);
  }, [data?.data?.apps, setAppNameList]);
  const tappNameList: string[] = useMemo(() => {
    return appNameList.map((app) => app || commonT('Other'));
  }, [appNameList, commonT]);
  return (
    <BaseMenu
      isDisabled={isDisabled || isFetching}
      setItem={function (idx: number): void {
        setAppName(idx);
      }}
      itemIdx={appNameIdx}
      itemlist={tappNameList}
      {...props}
      innerWidth={innerWidth}
      neeReset={isStale}
    />
  );
}
