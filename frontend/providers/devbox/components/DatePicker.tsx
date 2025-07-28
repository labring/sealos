'use client';

import { enUS, zhCN } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import { Calendar, RefreshCw } from 'lucide-react';
import { ChangeEventHandler, useMemo, useState } from 'react';
import { endOfDay, format, isAfter, isBefore, isMatch, isValid, parse, startOfDay } from 'date-fns';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { useDateTimeStore } from '@/stores/date';
import { formatTimeRange, parseTimeRange } from '@/utils/timeRange';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  isDisabled?: boolean;
  onClose?: () => void;
}

interface RecentDate {
  label: string;
  value: DateRange;
  compareValue: string;
}

const DatePicker = ({ isDisabled = false, onClose, className, ...props }: DatePickerProps) => {
  const t = useTranslations();
  const currentLang = useLocale();

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

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };
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
    handleClose();
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
        'flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white',
        className
      )}
      {...props}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex cursor-pointer items-center gap-2 px-4 py-2 select-none"
            onClick={onOpen}
          >
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className="text-sm/5 text-zinc-900">
              {format(startDateTime, 'HH:mm, MMM dd')} - {format(endDateTime, 'HH:mm, MMM dd')}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-105 p-0" align="start">
          <div className="flex h-100 w-80">
            <div className="flex flex-col">
              <DayPicker
                navLayout="around"
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeSelect}
                locale={currentLang === 'zh' ? zhCN : enUS}
                weekStartsOn={0}
              />
              <Separator className="bg-zinc-100" />
              {/* Start and End button */}
              <div className="flex flex-col gap-2 px-4 pt-2 pb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600">{t('date_start')}</span>
                  <div className="flex w-full gap-1">
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
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600">{t('date_end')}</span>
                  <div className="flex w-full gap-1">
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
            </div>
            <Separator orientation="vertical" className="bg-zinc-100" />
            {/* right date */}
            <div className="w-full px-2 py-3">
              {recentDateList.map((item) => (
                <Button
                  key={JSON.stringify(item.value)}
                  variant="ghost"
                  className={cn(
                    'h-9 w-31 justify-start rounded p-2 text-sm font-normal text-zinc-900',
                    recentDate.compareValue === item.compareValue && 'bg-blue-50 text-blue-600'
                  )}
                  onClick={() => handleRecentDateClick(item)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <Separator className="bg-zinc-100" />
          {/* bottom button group */}
          <div className="flex items-center justify-between p-2">
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger className="border-none bg-transparent px-3 text-xs text-zinc-600 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-zinc-900">
                <SelectItem value="local">Local (Asia/Shanghai)</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-2.5"
                onClick={() => {
                  setRecentDate(defaultRecentDate);
                  handleRecentDateClick(defaultRecentDate);
                }}
              >
                <RefreshCw className="h-4 w-4 text-neutral-500" />
              </Button>
              <Button variant="outline" className="h-8" onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button className="h-8" onClick={onSubmit}>
                {t('confirm')}
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
        'h-8 w-30 bg-white pl-2 text-xs text-zinc-900',
        error && 'border-red-500 hover:border-red-500',
        showError && 'animate-shake border-red-500 hover:border-red-500'
      )}
      value={value}
      onChange={onChange}
    />
  );
};

const getDateRange = (value: string): DateRange => {
  try {
    const { startTime: from, endTime: to } = parseTimeRange(value);
    return { from, to };
  } catch (error) {
    // If parsing fails, return a safe default of last 30 minutes
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    return { from: thirtyMinutesAgo, to: now };
  }
};

export default DatePicker;
