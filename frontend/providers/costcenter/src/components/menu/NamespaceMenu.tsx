import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { cn } from '@sealos/shadcn-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';

export default function NamespaceMenu({
  isDisabled,
  className,
  ...selectProps
}: {
  isDisabled?: boolean;
  className?: {
    trigger?: string;
  };
} & React.ComponentProps<typeof Select>) {
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
    const namespaceList: [string, string][] = (nsListData?.data as [string, string][]) || [];
    setNamespaceList(namespaceList);
    // setNamespace(0);
  }, [nsListData, t, setNamespaceList]);

  return (
    <Select
      disabled={isDisabled || isFetching}
      value={namespaceIdx.toString() ?? undefined}
      onValueChange={(value) => {
        // We use index as value
        setNamespace(Number.isSafeInteger(Number(value)) ? Number(value) : 0);
      }}
      {...selectProps}
    >
      <SelectTrigger className={cn(className?.trigger)}>
        <SelectValue placeholder={t('common:region')} />
      </SelectTrigger>
      <SelectContent>
        {namespaceList.map((item, idx) => (
          <SelectItem key={idx} value={idx.toString()}>
            {item[1]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
