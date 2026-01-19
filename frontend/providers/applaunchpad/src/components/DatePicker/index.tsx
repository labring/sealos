'use client';

import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  isMatch,
  isValid,
  parse,
  startOfDay,
  subDays
} from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { ChangeEventHandler, useMemo, useState } from 'react';
import { DateRange, DayPicker } from 'react-day-picker';
import useDateTimeStore from '@/store/date';
import { parseTimeRange } from '@/utils/timeRange';
import { Button } from '@sealos/shadcn-ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import { Input } from '@sealos/shadcn-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@sealos/shadcn-ui/popover';
import { Separator } from '@sealos/shadcn-ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import { cn } from '@sealos/shadcn-ui';
import 'react-day-picker/style.css';

interface DatePickerProps {
  isDisabled?: boolean;
  className?: string;
}

interface RecentDate {
  label: string;
  value: DateRange;
  compareValue: string;
}

const DatePicker = ({ isDisabled = false, className }: DatePickerProps) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [isOpen, setIsOpen] = useState(false);

  const {
    startDateTime,
    endDateTime,
    setStartDateTime,
    setEndDateTime,
    timeZone,
    setTimeZone,
    setManualRange,
    setAutoRange
  } = useDateTimeStore();

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);

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

  const isExactMatch = (currentStart: Date, currentEnd: Date, presetRange: DateRange) => {
    if (!presetRange.from || !presetRange.to) return false;

    const tolerance = 1000; // 1秒
    const startDiff = Math.abs(currentStart.getTime() - presetRange.from.getTime());
    const endDiff = Math.abs(currentEnd.getTime() - presetRange.to.getTime());

    return startDiff <= tolerance && endDiff <= tolerance;
  };

  const defaultRecentDate = useMemo(() => {
    const exactMatch = recentDateList.find((item) =>
      isExactMatch(startDateTime, endDateTime, item.value)
    );

    if (exactMatch) {
      return exactMatch;
    }

    return null;
  }, [startDateTime, endDateTime, recentDateList]);

  const [inputState, setInputState] = useState<0 | 1>(0);
  const [recentDate, setRecentDate] = useState<RecentDate | null>(defaultRecentDate);

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
    setIsOpen(false);
  };

  const handleFromChange = (value: string, type: 'date' | 'time') => {
    setManualRange();
    let newDateTimeString;

    if (type === 'date') {
      setFromDateString(value);
      if (!isMatch(value, 'y-MM-dd')) {
        setFromDateError('Invalid date format');
        return;
      }
      newDateTimeString = `${value} ${fromTimeString}`;
    } else {
      setFromTimeString(value);
      if (!isMatch(value, 'HH:mm:ss')) {
        setFromTimeError('Invalid time format');
        return;
      }
      newDateTimeString = `${fromDateString} ${value}`;
    }

    const date = parse(newDateTimeString, 'y-MM-dd HH:mm:ss', new Date());

    if (!isValid(date)) {
      return setSelectedRange({ from: undefined, to: selectedRange?.to });
    }

    if (isBefore(date, sevenDaysAgo)) {
      if (type === 'date') {
        setFromDateError('start time cannot be before 7 days ago');
      } else {
        setFromTimeError('start time cannot be before 7 days ago');
      }
      return;
    }

    setFromDateError(null);
    setFromTimeError(null);

    setRecentDate(null);

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
    setManualRange();
    let newDateTimeString;

    if (type === 'date') {
      setToDateString(value);
      if (!isMatch(value, 'y-MM-dd')) {
        setToDateError('Invalid date format');
        return;
      }
      newDateTimeString = `${value} ${toTimeString}`;
    } else {
      setToTimeString(value);
      if (!isMatch(value, 'HH:mm:ss')) {
        setToTimeError('Invalid time format');
        return;
      }
      newDateTimeString = `${toDateString} ${value}`;
    }

    const date = parse(newDateTimeString, 'y-MM-dd HH:mm:ss', new Date());

    if (!isValid(date)) {
      return setSelectedRange({ from: selectedRange?.from, to: undefined });
    }

    if (isAfter(date, now)) {
      if (type === 'date') {
        setToDateError('end time cannot be after current time');
      } else {
        setToTimeError('end time cannot be after current time');
      }
      return;
    }

    setToDateError(null);
    setToTimeError(null);

    setRecentDate(null);

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

  const handleRangeSelect = (range: DateRange | undefined) => {
    setManualRange();
    if (range) {
      let { from, to } = range;

      if (from && isBefore(from, sevenDaysAgo)) {
        from = sevenDaysAgo;
      }
      if (to && isAfter(to, now)) {
        to = now;
      }

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

      setRecentDate(null);
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
    setAutoRange(item.compareValue);
    setFromDateError(null);
    setFromTimeError(null);
    setToDateError(null);
    setToTimeError(null);

    const nextRange = getDateRange(item.compareValue);
    setRecentDate({ ...item, value: nextRange });
    setSelectedRange(nextRange);
    if (nextRange.from) {
      setFromDateString(format(nextRange.from, 'y-MM-dd'));
      setFromTimeString(format(nextRange.from, 'HH:mm:ss'));
    }
    if (nextRange.to) {
      setToDateString(format(nextRange.to, 'y-MM-dd'));
      setToTimeString(format(nextRange.to, 'HH:mm:ss'));
    }
  };

  // format date time display
  const formatDateTimeDisplay = () => {
    const startDate = format(startDateTime, 'MMM dd');
    const endDate = format(endDateTime, 'MMM dd');
    const startTime = format(startDateTime, 'HH:mm');
    const endTime = format(endDateTime, 'HH:mm');

    // format: 10:15, Jan 20 - 10:45, Jan 21
    return `${startTime}, ${startDate} - ${endTime}, ${endDate}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 flex gap-2 items-center px-4 rounded-lg shadow-none hover:bg-zinc-50',
            className
          )}
          disabled={isDisabled}
        >
          <Calendar className="w-4 h-4 text-neutral-500" />
          <span className="whitespace-nowrap text-gray-900 text-sm font-normal ">
            {formatDateTimeDisplay()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-0 rounded-xl z-50 border-[0.5px] border-zinc-200"
        align="start"
      >
        <div className="w-[402px] h-[382px] flex">
          <div className="w-[242px] flex flex-col">
            <DayPicker
              mode="range"
              navLayout="around"
              selected={selectedRange}
              onSelect={handleRangeSelect}
              locale={currentLang === 'zh' ? zhCN : enUS}
              weekStartsOn={0}
              disabled={(date) => {
                return isAfter(date, now) || isBefore(date, sevenDaysAgo);
              }}
              formatters={{
                formatWeekdayName: (date) =>
                  format(date, 'EEE', { locale: currentLang === 'zh' ? zhCN : enUS })
              }}
              className="px-4 pb-2 pt-4"
            />
            <Separator />
            <div className="flex flex-col gap-2 px-4 pt-2">
              <span className="text-xs text-zinc-600 ml-1">{t('start')}</span>
              <div className="w-full flex justify-center gap-1">
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
              <span className="text-xs text-zinc-600 ml-1">{t('end')}</span>
              <div className="w-full flex justify-center gap-1">
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
          <Separator orientation="vertical" className="shrink-0" />
          <div className="flex-1">
            <div className="flex flex-col gap-0.5 py-3 px-2 w-full">
              {recentDateList.map((item) => (
                <Button
                  key={JSON.stringify(item.value)}
                  variant="ghost"
                  className={cn(
                    'h-8 px-2 text-gray-900 text-xs font-normal justify-start hover:bg-gray-50',
                    recentDate &&
                      recentDate.compareValue === item.compareValue &&
                      'bg-blue-50 text-blue-600 hover:bg-blue-50'
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
        <div className="flex justify-between pl-3 items-center py-2">
          <Select value={timeZone} onValueChange={(val) => setTimeZone(val as 'local' | 'utc')}>
            <SelectTrigger className="h-8 w-fit border-none rounded-lg bg-transparent shadow-none text-zinc-600 text-xs font-normal px-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="border-[0.5px] border-zinc-200 rounded-xl p-0.5"
            >
              <SelectItem value="local" className="text-sm rounded-lg py-[10px]">
                Local (Asia/Shanghai)
              </SelectItem>
              <SelectItem value="utc" className="text-sm rounded-lg py-[10px]">
                UTC
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 px-2.5">
            <Button
              variant="outline"
              className="border rounded-lg shadow-none h-9 w-9"
              onClick={() => {
                if (defaultRecentDate) {
                  setRecentDate(defaultRecentDate);
                  handleRecentDateClick(defaultRecentDate);
                } else {
                  const defaultOption =
                    recentDateList.find((item) => item.compareValue === '30m') || recentDateList[0];
                  setRecentDate(defaultOption);
                  handleRecentDateClick(defaultOption);
                }
              }}
            >
              <RefreshCw className="w-4 h-4 text-neutral-500" />
            </Button>
            <Button
              variant="outline"
              className="border rounded-lg shadow-none"
              onClick={() => setIsOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button className="rounded-lg" onClick={() => onSubmit()}>
              {t('Confirm')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
        'bg-white w-full h-8 !text-xs text-zinc-900 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-none hover:bg-zinc-900',
        error && 'border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-500',
        showError && 'border-red-500 hover:border-red-500 animate-shake'
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
