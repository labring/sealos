import useOverviewStore from '@/stores/overview';
import clander_icon from '@/assert/clander.svg';
import {
  Flex,
  Input,
  Popover,
  PopoverTrigger,
  Img,
  PopoverContent,
  Button,
  Box
} from '@chakra-ui/react';
import { format, parse, isValid, isAfter, isBefore, endOfDay, startOfDay } from 'date-fns';
import { useState, ChangeEventHandler } from 'react';
import { DateRange, SelectRangeEventHandler, DayPicker } from 'react-day-picker';

export default function SelectRange({ isDisabled }: { isDisabled: boolean | undefined }) {
  let { startTime, endTime } = useOverviewStore();
  const setStartTime = useOverviewStore((state) => state.setStartTime);
  const setEndTime = useOverviewStore((state) => state.setEndTime);

  const initState = { from: startTime, to: endTime };
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initState);
  const [fromValue, setFromValue] = useState<string>(format(initState.from, 'y-MM-dd'));
  const [toValue, setToValue] = useState<string>(format(initState.to, 'y-MM-dd'));
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
    console.log(selectedRange);
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
      setSelectedRange(range);
      if (range?.from) {
        setFromValue(format(range.from, 'y-MM-dd'));
      } else {
        setFromValue('');
      }
      if (range?.to) {
        setToValue(format(range.to, 'y-MM-dd'));
      } else {
        setToValue(range.from ? format(range.from, 'y-MM-dd') : '');
      }
    } else {
      // 选了第一个日期，组件默认的行为是取消选择
      if (fromValue && selectedRange?.from) {
        setToValue(fromValue);
        setSelectedRange({
          ...selectedRange,
          to: selectedRange.from
        });
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
      <Box>-</Box>
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
      <Popover onClose={onClose}>
        <PopoverTrigger>
          <Button display={'flex'} variant={'unstyled'} isDisabled={isDisabled}>
            <Img src={clander_icon.src}></Img>
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99}>
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
