import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { FlexProps } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef } from 'react';
import BaseMenu from './BaseMenu';

export default function NamespaceMenu({
  isDisabled,
  innerWidth = '360px',
  defaultToPrivateTeam = false,
  ...props
}: { innerWidth?: string; isDisabled: boolean; defaultToPrivateTeam?: boolean } & FlexProps) {
  const startTime = useOverviewStore((s) => s.startTime);
  const endTime = useOverviewStore((s) => s.endTime);
  const { setNamespace, setNamespaceList, namespaceList, namespaceIdx } = useBillingStore();
  const { getRegion } = useBillingStore();
  const regionUid = getRegion()?.uid || '';
  const defaultedRegionRef = useRef<Record<string, boolean>>({});
  const queryBody = {
    startTime,
    endTime,
    regionUid
  };
  const { data: nsListData, isFetching } = useQuery({
    queryFn() {
      return request.post('/api/billing/getNamespaceList', queryBody);
    },
    queryKey: ['nsList', 'menu', queryBody]
  });
  const { t } = useTranslation();
  useEffect(() => {
    const namespaceList: [string, string][] = [
      ['', t('all_workspace')],
      ...((nsListData?.data as [string, string][]) || [])
    ];
    setNamespaceList(namespaceList);
    if (defaultToPrivateTeam && !defaultedRegionRef.current[regionUid]) {
      const privateTeamIdx = namespaceList.findIndex(
        (item) => item[1].trim().toLowerCase() === 'private team'
      );
      const firstWorkspaceIdx = namespaceList.findIndex((item) => !!item[0]);
      const defaultIdx = privateTeamIdx >= 0 ? privateTeamIdx : firstWorkspaceIdx;
      if (defaultIdx > 0) {
        setNamespace(defaultIdx);
        defaultedRegionRef.current[regionUid] = true;
      }
    }
    // setNamespace(0);
  }, [defaultToPrivateTeam, nsListData, regionUid, t]);

  return (
    <BaseMenu
      isDisabled={isDisabled || isFetching}
      setItem={function (idx: number): void {
        setNamespace(idx);
      }}
      itemIdx={namespaceIdx}
      itemlist={namespaceList.map((v) => v[1])}
      {...props}
      innerWidth={innerWidth}
    />
  );
}
