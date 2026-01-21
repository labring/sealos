import { useTranslation } from 'next-i18next';
import AdvancedSelect, { ListItem } from '../AdvancedSelect';
import DynamicTime from './Time';
import { REFRESH_INTERVAL_OPTIONS } from '@/constants/monitor';
import useDateTimeStore from '@/store/date';
import dynamic from 'next/dynamic';
import { Button } from '@sealos/shadcn-ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import { Separator } from '@sealos/shadcn-ui/separator';
import { RefreshCw } from 'lucide-react';
const DatePicker = dynamic(() => import('@/components/DatePicker'), { ssr: false });

export default function Header({
  podList,
  setPodList,
  refetchData,
  lastRefreshTime
}: {
  podList: ListItem[];
  setPodList: (val: ListItem[]) => void;
  refetchData: () => void;
  lastRefreshTime?: number;
}) {
  const { t } = useTranslation();
  const { refreshInterval, setRefreshInterval } = useDateTimeStore();

  return (
    <div className="flex flex-wrap lg:flex-nowrap gap-4 py-3 px-5 items-center w-full justify-between">
      <div className="flex gap-4 items-center">
        <h3 className="text-base font-medium text-zinc-900">{t('monitor')}</h3>
        <div className="flex items-center gap-4">
          <div className="">
            <DatePicker />
          </div>
          <div className="flex items-center gap-3">
            <AdvancedSelect
              minW={'200px'}
              height="40px"
              checkBoxMode
              leftIcon={<span className="text-sm font-normal text-zinc-500">{t('Pods')}</span>}
              title={t('pod_filtering')}
              width={'fit-content'}
              value={'hello-sql-postgresql-0'}
              list={podList}
              onCheckboxChange={(val) => {
                setPodList(val);
              }}
              placeholder={t('please_select')}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-10 rounded-lg shadow-none hover:bg-zinc-50"
                  onClick={() => {
                    refetchData();
                  }}
                >
                  <RefreshCw className="w-4 h-4 text-zinc-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refresh')}</TooltipContent>
            </Tooltip>

            <Select
              value={refreshInterval.toString()}
              onValueChange={(value: string) => {
                setRefreshInterval(Number(value));
              }}
            >
              <SelectTrigger className="!h-10 rounded-lg text-sm font-normal text-zinc-900 shadow-none hover:bg-zinc-50">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">
                    {refreshInterval > 0 ? (
                      <span className="text-zinc-900">
                        <SelectValue placeholder={t('please_select')} />
                      </span>
                    ) : (
                      t('no_auto_refresh')
                    )}
                  </span>
                  <Separator orientation="vertical" className="!h-3 bg-zinc-300" />
                </div>
              </SelectTrigger>
              <SelectContent className="w-[180px] border-[0.5px] border-zinc-200 rounded-xl p-1">
                <div className="px-1 pb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('set_automatic_refresh')}
                  </span>
                </div>
                {REFRESH_INTERVAL_OPTIONS.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value.toString()}
                    className="text-zinc-900 h-10 rounded-lg py-[10px] hover:bg-zinc-50 cursor-pointer"
                  >
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[124px] text-sm font-normal text-zinc-500 flex items-center">
            {t('Update Time')}&ensp;
            <DynamicTime lastRefreshTime={lastRefreshTime} />
          </div>
        </div>
      </div>
    </div>
  );
}
