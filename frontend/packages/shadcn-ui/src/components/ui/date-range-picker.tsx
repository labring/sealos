'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DateRangePickerProps {
  placeholder?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  buttonClassName?: React.ComponentProps<typeof Button>['className'];
  dateFormat?: string;
  className?: string;
  value?: DateRange;
  onChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  placeholder,
  variant = 'outline',
  buttonClassName,
  dateFormat = 'yyyy-MM-dd',
  className,
  value,
  onChange
}: DateRangePickerProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 20)
  });

  // Use controlled value if provided, otherwise use internal state
  const date = value !== undefined ? value : internalDate;

  const handleDateChange = (newDate: DateRange | undefined) => {
    // Normalize date to 00:00:00.000 to 23:59:59.999
    const fromDate = !!newDate?.from ? new Date(newDate?.from) : undefined;
    if (fromDate) {
      fromDate.setHours(0);
      fromDate.setMinutes(0);
      fromDate.setSeconds(0);
      fromDate.setMilliseconds(0);
    }

    const toDate = !!newDate?.to ? new Date(newDate.to) : undefined;
    if (toDate) {
      toDate.setHours(23);
      toDate.setMinutes(59);
      toDate.setSeconds(59);
      toDate.setMilliseconds(999);
    }

    const finalNewDate = newDate
      ? {
          from: fromDate,
          to: toDate
        }
      : undefined;

    if (onChange) {
      onChange(finalNewDate);
    } else {
      setInternalDate(finalNewDate);
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={variant}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              buttonClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, dateFormat)} - {format(date.to, dateFormat)}
                </>
              ) : (
                format(date.from, dateFormat)
              )
            ) : (
              <span>{placeholder ?? 'Pick a date'}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            showOutsideDays={false}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
