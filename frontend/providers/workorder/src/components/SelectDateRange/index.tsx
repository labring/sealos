import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@chakra-ui/react';
import { endOfDay, format, isAfter, isBefore, isValid, parse, startOfDay } from 'date-fns';
import { ChangeEventHandler, Dispatch, SetStateAction, useState } from 'react';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';

type SelectDateRangeProps = {
  isDisabled?: boolean;
  startTime: Date;
  setStartTime: Dispatch<SetStateAction<Date>>;
  endTime: Date;
  setEndTime: Dispatch<SetStateAction<Date>>;
};

export default function SelectDateRange({
  isDisabled,
  startTime,
  setStartTime,
  endTime,
  setEndTime
}: SelectDateRangeProps) {
  const initState = { from: startTime, to: endTime };

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initState);
  const [fromValue, setFromValue] = useState<string>(format(initState.from, 'y-MM-dd'));
  const [toValue, setToValue] = useState<string>(format(initState.to, 'y-MM-dd'));
  const [inputState, setInputState] = useState<0 | 1>(0);
  const onClose = () => {
    selectedRange?.from && setStartTime(startOfDay(selectedRange.from));
    selectedRange?.to && setEndTime(endOfDay(selectedRange.to));
  };

  const handleFromChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setFromValue(e.target.value);
    const date = parse(e.target.value, 'y-MM-dd', new Date());
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

  const handleToChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setToValue(e.target.value);
    const date = parse(e.target.value, 'y-MM-dd', new Date());

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
        if (from === selectedRange?.from) {
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
        setFromValue(format(from, 'y-MM-dd'));
      } else {
        setFromValue('');
      }
      if (to) {
        setToValue(format(to, 'y-MM-dd'));
      } else {
        setToValue(from ? format(from, 'y-MM-dd') : '');
      }
    } else {
      if (fromValue && selectedRange?.from) {
        setToValue(fromValue);
        setSelectedRange({
          ...selectedRange,
          to: selectedRange.from
        });
        setInputState(1);
      }
    }
  };

  const handleRangeSelectFrom: SelectRangeEventHandler = (range: DateRange | undefined) => {
    if (range) {
      let { from, to } = range;
      if (selectedRange?.to) {
        if (from) {
          if (!to) {
            to = from;
          } else if (from === selectedRange?.from) {
            from = to;
            to = selectedRange.to;
          }
          if (isBefore(from, selectedRange.to)) {
            setSelectedRange({
              ...selectedRange,
              from
            });
            setFromValue(format(from, 'y-MM-dd'));
          }
        }
      }
    }
  };

  const handleRangeSelectTo: SelectRangeEventHandler = (range: DateRange | undefined) => {
    console.log(range, selectedRange);
    if (range) {
      let { from, to } = range;
      if (selectedRange?.from) {
        if (to) {
          if (!from) {
            from = to;
          } else if (to === selectedRange?.to) {
            to = from;
            from = selectedRange.from;
          }
          if (isAfter(to, selectedRange.from)) {
            setSelectedRange({
              ...selectedRange,
              to
            });
            setToValue(format(to, 'y-MM-dd'));
          }
        }
      }
    } else {
      if (fromValue && selectedRange?.from) {
        setToValue(fromValue);
        setSelectedRange({
          ...selectedRange,
          to: selectedRange.from
        });
        setInputState(1);
      }
    }
  };

  return (
    <Flex
      w={'280px'}
      h={'32px'}
      bg="#F6F8F9"
      mr={'32px'}
      gap={'12px'}
      align={'center'}
      px={'12px'}
      justify={'space-between'}
      border={'1px solid #DEE0E2'}
      borderRadius="2px"
    >
      <Popover onClose={onClose}>
        <PopoverTrigger>
          <Button display={'flex'} variant={'unstyled'} isDisabled={isDisabled}>
            <Input
              isDisabled={!!isDisabled}
              variant={'unstyled'}
              flex={1}
              value={fromValue}
              minW="90px"
              onChange={handleFromChange}
              onBlur={() => {
                selectedRange?.from && setStartTime(startOfDay(selectedRange.from));
                console.log(selectedRange?.from);
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99} w="auto">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelectFrom}
            defaultMonth={startTime}
            styles={{
              day: {
                borderRadius: 'unset',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </PopoverContent>
      </Popover>
      <Box>-</Box>

      <Popover onClose={onClose}>
        <PopoverTrigger>
          <Button display={'flex'} variant={'unstyled'} isDisabled={isDisabled}>
            <Input
              isDisabled={!!isDisabled}
              variant={'unstyled'}
              value={toValue}
              flex={1}
              minW="90px"
              onChange={handleToChange}
              onBlur={() => {
                selectedRange?.to && setEndTime(endOfDay(selectedRange.to));
                console.log(selectedRange?.to);
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99} w="auto">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelectTo}
            defaultMonth={endTime}
            styles={{
              day: {
                borderRadius: 'unset',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </PopoverContent>
      </Popover>
      <Popover
        onClose={() => {
          setInputState(0);
          onClose();
        }}
      >
        <PopoverTrigger>
          <Button display={'flex'} variant={'unstyled'} isDisabled={isDisabled}>
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="17px"
              height="16px"
              viewBox="0 0 17 16"
              fill="none"
            >
              <path
                d="M4.07992 14.6666C3.71325 14.6666 3.39925 14.5362 3.13792 14.2753C2.87703 14.014 2.74658 13.7 2.74658 13.3333V3.99998C2.74658 3.63331 2.87703 3.31954 3.13792 3.05865C3.39925 2.79731 3.71325 2.66665 4.07992 2.66665H4.74658V1.98331C4.74658 1.79442 4.81036 1.63887 4.93792 1.51665C5.06592 1.39442 5.22436 1.33331 5.41325 1.33331C5.60214 1.33331 5.76058 1.39709 5.88858 1.52465C6.01614 1.65265 6.07992 1.81109 6.07992 1.99998V2.66665H11.4132V1.98331C11.4132 1.79442 11.4772 1.63887 11.6052 1.51665C11.7328 1.39442 11.891 1.33331 12.0799 1.33331C12.2688 1.33331 12.427 1.39709 12.5546 1.52465C12.6826 1.65265 12.7466 1.81109 12.7466 1.99998V2.66665H13.4132C13.7799 2.66665 14.0939 2.79731 14.3552 3.05865C14.6161 3.31954 14.7466 3.63331 14.7466 3.99998V13.3333C14.7466 13.7 14.6161 14.014 14.3552 14.2753C14.0939 14.5362 13.7799 14.6666 13.4132 14.6666H4.07992ZM4.07992 13.3333H13.4132V6.66665H4.07992V13.3333ZM4.07992 5.33331H13.4132V3.99998H4.07992V5.33331ZM4.07992 5.33331V3.99998V5.33331Z"
                fill="#7B838B"
              />
            </Icon>
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99} w="auto">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            styles={{
              day: {
                borderRadius: 'unset',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
