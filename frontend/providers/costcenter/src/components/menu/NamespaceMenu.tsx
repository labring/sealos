import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { FlexProps } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import BaseMenu from './BaseMenu';

export default function NamespaceMenu({
  isDisabled,
  innerWidth = '360px',
  ...props
}: { innerWidth?: string; isDisabled: boolean } & FlexProps) {
  const startTime = useOverviewStore((s) => s.startTime);
  const endTime = useOverviewStore((s) => s.endTime);
  const { setNamespace, setNamespaceList, namespaceList, namespaceIdx } = useBillingStore();
  const { getRegion } = useBillingStore();
  const queryBody = {
    startTime,
    endTime,
    regionUid: getRegion()?.uid || ''
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
    // setNamespace(0);
  }, [nsListData, t]);

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
