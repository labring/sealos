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
    if (onChange) {
      onChange(newDate);
    } else {
      setInternalDate(newDate);
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
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
