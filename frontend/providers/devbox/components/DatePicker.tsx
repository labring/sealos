'use client';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { endOfDay, format, isAfter, isBefore, isMatch, isValid, parse, startOfDay } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { ChangeEventHandler, useMemo, useState } from 'react';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';
import useDateTimeStore from '@/stores/date';
import { formatTimeRange, parseTimeRange } from '@/utils/timeRange';
import { MySelect } from '@sealos/ui';
import { Calendar, RefreshCw } from 'lucide-react';

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  isDisabled?: boolean;
}

interface RecentDate {
  label: string;
  value: DateRange;
  compareValue: string;
}

const DatePicker = ({ isDisabled = false, className, ...props }: DatePickerProps) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [isOpen, setIsOpen] = useState(false);

  const { startDateTime, endDateTime, setStartDateTime, setEndDateTime, timeZone, setTimeZone } =
    useDateTimeStore();

  const initState = {
    from: startDateTime,
    to: endDateTime
  };

  const recentDateList = useMemo(
    () => [
      {
        label: `${t('recently')} 5 ${t('minute')}`,
        value: getDateRange('5m'),
        compareValue: '5m'
      },
      {
        label: `${t('recently')} 15 ${t('minute')}`,
        value: getDateRange('15m'),
        compareValue: '15m'
      },
      {
        label: `${t('recently')} 30 ${t('minute')}`,
        value: getDateRange('30m'),
        compareValue: '30m'
      },
      {
        label: `${t('recently')} 1 ${t('hour-singular')}`,
        value: getDateRange('1h'),
        compareValue: '1h'
      },
      {
        label: `${t('recently')} 3 ${t('hour')}`,
        value: getDateRange('3h'),
        compareValue: '3h'
      },
      {
        label: `${t('recently')} 6 ${t('hour')}`,
        value: getDateRange('6h'),
        compareValue: '6h'
      },
      {
        label: `${t('recently')} 24 ${t('hour')}`,
        value: getDateRange('24h'),
        compareValue: '24h'
      },
      {
        label: `${t('recently')} 2 ${t('day')}`,
        value: getDateRange('2d'),
        compareValue: '2d'
      },
      {
        label: `${t('recently')} 3 ${t('day')}`,
        value: getDateRange('3d'),
        compareValue: '3d'
      },
      {
        label: `${t('recently')} 7 ${t('day')}`,
        value: getDateRange('7d'),
        compareValue: '7d'
      }
    ],
    [t]
  );

  const defaultRecentDate = useMemo(() => {
    const currentTimeRange = formatTimeRange(startDateTime, endDateTime);
    return (
      recentDateList.find((item) => item.compareValue === currentTimeRange) ||
      recentDateList.find((item) => item.compareValue === '30m') ||
      recentDateList[0]
    );
  }, [startDateTime, endDateTime, recentDateList]);

  const [inputState, setInputState] = useState<0 | 1>(0);
  const [recentDate, setRecentDate] = useState<RecentDate>(defaultRecentDate);

  const [fromDateString, setFromDateString] = useState<string>(format(initState.from, 'y-MM-dd'));
  const [toDateString, setToDateString] = useState<string>(format(initState.to, 'y-MM-dd'));
  const [fromTimeString, setFromTimeString] = useState<string>(format(initState.from, 'HH:mm:ss'));
  const [toTimeString, setToTimeString] = useState<string>(format(initState.to, 'HH:mm:ss'));

  const [fromDateError, setFromDateError] = useState<string | null>(null);
  const [toDateError, setToDateError] = useState<string | null>(null);
  const [fromTimeError, setFromTimeError] = useState<string | null>(null);
  const [toTimeError, setToTimeError] = useState<string | null>(null);
  const [fromDateShake, setFromDateShake] = useState(false);
  const [toDateShake, setToDateShake] = useState(false);
  const [fromTimeShake, setFromTimeShake] = useState(false);
  const [toTimeShake, setToTimeShake] = useState(false);

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initState);

  const onClose = () => setIsOpen(false);
  const onOpen = () => setIsOpen(true);

  const onSubmit = () => {
    if (fromDateError || fromTimeError || toDateError || toTimeError) {
      if (fromDateError) setFromDateShake(true);
      if (toDateError) setToDateShake(true);
      if (fromTimeError) setFromTimeShake(true);
      if (toTimeError) setToTimeShake(true);
      setTimeout(() => {
        setFromDateShake(false);
        setToDateShake(false);
        setFromTimeShake(false);
        setToTimeShake(false);
      }, 300);

      return;
    }
    selectedRange?.from && setStartDateTime(selectedRange.from);
    selectedRange?.to && setEndDateTime(selectedRange.to);
    onClose();
  };

  const handleFromChange = (value: string, type: 'date' | 'time') => {
    let newDateTimeString;

    if (type === 'date') {
      setFromDateString(value);
      if (!isMatch(value, 'y-MM-dd')) {
        setFromDateError('Invalid date format');
        return;
      }
      setFromDateError(null);
      newDateTimeString = `${value} ${fromTimeString}`;
    } else {
      setFromTimeString(value);
      if (!isMatch(value, 'HH:mm:ss')) {
        setFromTimeError('Invalid time format');
        return;
      }
      setFromTimeError(null);
      newDateTimeString = `${fromDateString} ${value}`;
    }

    console.log(newDateTimeString);

    const date = parse(newDateTimeString, 'y-MM-dd HH:mm:ss', new Date());

    if (!isValid(date)) {
      return setSelectedRange({ from: undefined, to: selectedRange?.to });
    }

    if (selectedRange?.to) {
      if (isAfter(date, selectedRange.to)) {
        setSelectedRange({ from: selectedRange.to, to: date });
      } else {
        setSelectedRange({ from: date, to: selectedRange?.to });
      }
    } else {
      setSelectedRange({ from: date, to: date });
    }
  };

  const handleToChange = (value: string, type: 'date' | 'time') => {
    let newDateTimeString;

    if (type === 'date') {
      setToDateString(value);
      if (!isMatch(value, 'y-MM-dd')) {
        setToDateError('Invalid date format');
        return;
      }
      setToDateError(null);
      newDateTimeString = `${value} ${toTimeString}`;
    } else {
      setToTimeString(value);
      if (!isMatch(value, 'HH:mm:ss')) {
        setToTimeError('Invalid time format');
        return;
      }
      setToTimeError(null);
      newDateTimeString = `${toDateString} ${value}`;
    }

    const date = parse(newDateTimeString, 'y-MM-dd HH:mm:ss', new Date());

    if (!isValid(date)) {
      return setSelectedRange({ from: selectedRange?.from, to: undefined });
    }
    if (selectedRange?.from) {
      if (isBefore(date, selectedRange.from)) {
        setSelectedRange({ from: date, to: selectedRange.from });
      } else {
        setSelectedRange({ from: selectedRange?.from, to: date });
      }
    } else {
      setSelectedRange({ from: date, to: date });
    }
  };

  const handleRangeSelect: SelectRangeEventHandler = (range: DateRange | undefined) => {
    if (range) {
      let { from, to } = range;
      if (inputState === 0) {
        // from
        if (from === selectedRange?.from) {
          // when 'to' is changed
          from = to;
        } else {
          to = from;
        }
        setInputState(1);
      } else {
        setInputState(0);
      }
      setSelectedRange({
        from,
        to
      });
      if (from) {
        setFromDateString(format(startOfDay(from), 'y-MM-dd'));
        setFromTimeString(format(startOfDay(from), 'HH:mm:ss'));
      } else {
        setFromDateString(format(new Date(), 'y-MM-dd'));
        setFromTimeString(format(new Date(), 'HH:mm:ss'));
      }
      if (to) {
        setToDateString(format(endOfDay(to), 'y-MM-dd'));
        setToTimeString(format(endOfDay(to), 'HH:mm:ss'));
      } else {
        setToDateString(format(from ? from : new Date(), 'y-MM-dd'));
        setToTimeString(format(from ? from : new Date(), 'HH:mm:ss'));
      }
    } else {
      // default is cancel
      if (fromDateString && fromTimeString && selectedRange?.from) {
        setToDateString(fromDateString);
        setToTimeString(fromTimeString);
        setSelectedRange({
          ...selectedRange,
          to: selectedRange.from
        });
        setInputState(1);
      }
    }
  };

  const handleRecentDateClick = (item: RecentDate) => {
    setFromDateError(null);
    setFromTimeError(null);
    setToDateError(null);
    setToTimeError(null);

    setRecentDate(item);
    setSelectedRange(item.value);
    if (item.value.from) {
      setFromDateString(format(item.value.from, 'y-MM-dd'));
      setFromTimeString(format(item.value.from, 'HH:mm:ss'));
    }
    if (item.value.to) {
      setToDateString(format(item.value.to, 'y-MM-dd'));
      setToTimeString(format(item.value.to, 'HH:mm:ss'));
    }
  };

  return (
    <div
      className={cn(
        'flex h-8 items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-900',
        className
      )}
      {...props}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex cursor-pointer items-center gap-1" onClick={onOpen}>
            <span>{format(startDateTime, 'y-MM-dd HH:mm:ss')}</span>
            <span>{format(endDateTime, 'y-MM-dd HH:mm:ss')}</span>
            <Button variant="ghost" size="icon" disabled={isDisabled} className="min-w-fit p-0">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[402px] p-0" align="start">
          <div className="flex h-[382px]">
            <div className="flex w-[242px] flex-col">
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeSelect}
                locale={currentLang === 'zh' ? zhCN : enUS}
                weekStartsOn={0}
                className="p-3"
              />
              <Separator />
              <div className="flex flex-col gap-1.5 px-4 pt-2">
                <span className="mb-1 ml-0.5 text-xs text-gray-600">{t('start')}</span>
                <div className="flex w-full justify-center gap-1">
                  <DatePickerInput
                    value={fromDateString}
                    onChange={(e) => handleFromChange(e.target.value, 'date')}
                    error={!!fromDateError}
                    showError={fromDateShake}
                  />
                  <DatePickerInput
                    value={fromTimeString}
                    onChange={(e) => handleFromChange(e.target.value, 'time')}
                    error={!!fromTimeError}
                    showError={fromTimeShake}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 px-4 pt-2 pb-3">
                <span className="mb-1 ml-0.5 text-xs text-gray-600">{t('end')}</span>
                <div className="flex w-full justify-center gap-1">
                  <DatePickerInput
                    value={toDateString}
                    onChange={(e) => handleToChange(e.target.value, 'date')}
                    error={!!toDateError}
                    showError={toDateShake}
                  />
                  <DatePickerInput
                    value={toTimeString}
                    onChange={(e) => handleToChange(e.target.value, 'time')}
                    error={!!toTimeError}
                    showError={toTimeShake}
                  />
                </div>
              </div>
            </div>
            <Separator orientation="vertical" />
            <div className="flex-1">
              <div className="flex w-full flex-col gap-1 p-2">
                {recentDateList.map((item) => (
                  <Button
                    key={JSON.stringify(item.value)}
                    variant="ghost"
                    className={cn(
                      'h-8 justify-start text-xs font-normal text-gray-900',
                      recentDate.compareValue === item.compareValue &&
                        'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    )}
                    onClick={() => handleRecentDateClick(item)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2 pl-3">
            <MySelect
              height="32px"
              width={'fit-content'}
              border={'none'}
              boxShadow={'none'}
              backgroundColor={'transparent'}
              color={'grayModern.600'}
              value={timeZone}
              list={[
                { value: 'local', label: 'Local (Asia/Shanghai)' },
                { value: 'utc', label: 'UTC' }
              ]}
              onchange={(val: any) => setTimeZone(val)}
            />
            <div className="flex gap-2 px-2.5">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200"
                onClick={() => {
                  setRecentDate(defaultRecentDate);
                  handleRecentDateClick(defaultRecentDate);
                }}
              >
                <RefreshCw className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="outline" size="sm" className="border-gray-200" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button size="sm" onClick={onSubmit}>
                {t('Confirm')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface DatePickerInputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement> | undefined;
  error: boolean;
  showError: boolean;
}

const DatePickerInput = ({ value, onChange, error, showError }: DatePickerInputProps) => {
  return (
    <Input
      className={cn(
        'w-1/2 bg-white',
        error && 'border-red-500 hover:border-red-500',
        showError && 'animate-shake border-red-500 hover:border-red-500'
      )}
      value={value}
      onChange={onChange}
    />
  );
};

const getDateRange = (value: string): DateRange => {
  const { startTime: from, endTime: to } = parseTimeRange(value);
  return { from, to };
};

export default DatePicker;
