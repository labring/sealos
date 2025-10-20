import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types';
import { Region } from '@/types/region';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { cn } from '@sealos/shadcn-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';

export default function RegionMenu({
  isDisabled,
  className,
  ...selectProps
}: {
  isDisabled?: boolean;
  className?: {
    trigger?: string;
  };
} & React.ComponentProps<typeof Select>) {
  const { setRegion, setRegionList, regionList, regionIdx } = useBillingStore();
  const { t, i18n } = useTranslation();

  const { data, isFetching } = useQuery({
    queryFn() {
      return request<any, ApiResp<Region[]>>('/api/getRegions');
    },
    queryKey: ['regionList', 'menu'],
    onSuccess: (data) => {
      setRegionList(data?.data || []);
    }
  });

  const itemList = useMemo(
    () => regionList.map((v) => (i18n?.language === 'zh' ? v.name.zh : v.name.en)),
    [regionList, i18n?.language]
  );

  return (
    <Select
      disabled={isDisabled || isFetching}
      value={regionIdx.toString() ?? undefined}
      onValueChange={(value) => {
        // We use index as value
        setRegion(Number.isSafeInteger(Number(value)) ? Number(value) : 0);
      }}
      {...selectProps}
    >
      <SelectTrigger className={cn(className?.trigger)}>
        <SelectValue placeholder={t('common:region')} />
      </SelectTrigger>
      <SelectContent>
        {itemList.map((item, idx) => (
          <SelectItem key={idx} value={idx.toString()}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
