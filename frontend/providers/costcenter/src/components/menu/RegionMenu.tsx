import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types';
import { RegionClient } from '@/types/region';
import { FlexProps } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo } from 'react';
import BaseMenu from './BaseMenu';

export default function RegionMenu({
  isDisabled,
  innerWidth = '360px',
  ...props
}: {
  innerWidth?: string;
  isDisabled: boolean;
} & FlexProps) {
  const { setRegion, setRegionList, regionList, regionIdx } = useBillingStore();
  const { i18n } = useTranslation();
  const { data, isFetching } = useQuery({
    queryFn() {
      return request<any, ApiResp<RegionClient[]>>('/api/getRegions');
    },
    queryKey: ['regionList', 'menu']
  });
  useEffect(() => {
    setRegionList(data?.data || []);
    // setRegion(0);
  }, [data?.data]);
  const itemList = useMemo(
    () => regionList.map((v) => (i18n?.language === 'zh' ? v.name.zh : v.name.en)),
    [regionList, i18n?.language]
  );
  return (
    <BaseMenu
      itemIdx={regionIdx}
      isDisabled={isDisabled || isFetching}
      setItem={function (idx: number) {
        setRegion(idx);
      }}
      itemlist={itemList}
      innerWidth={innerWidth}
    />
  );
}
