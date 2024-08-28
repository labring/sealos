import clander_icon from '@/assert/clander.svg';
import to_icon from '@/assert/to.svg';
import useOverviewStore from '@/stores/overview';
import {
  Box,
  Button,
  Flex,
  FlexProps,
  Img,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@chakra-ui/react';
import { endOfDay, format, isAfter, isBefore, isValid, parse, startOfDay } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { ChangeEventHandler, useState } from 'react';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';

export default function SelectRange({
  isDisabled,
  ...props
}: { isDisabled: boolean | undefined } & FlexProps) {
  const { setStartTime, setEndTime, startTime, endTime } = useOverviewStore();
  const initState = { from: startTime, to: endTime };
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initState);
  const [fromValue, setFromValue] = useState<string>(format(initState.from, 'y/MM/dd'));
  const [toValue, setToValue] = useState<string>(format(initState.to, 'y/MM/dd'));
  const [inputState, setInputState] = useState<0 | 1>(0);
  const onClose = () => {
    selectedRange?.from && setStartTime(startOfDay(selectedRange.from));
    selectedRange?.to && setEndTime(endOfDay(selectedRange.to));
  };
  const handleFromChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setFromValue(e.target.value);
    const date = parse(e.target.value, 'y/MM/dd', new Date());
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
    const date = parse(e.target.value, 'y/MM/dd', new Date());

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
        setFromValue(format(from, 'y/MM/dd'));
      } else {
        setFromValue('');
      }
      if (to) {
        setToValue(format(to, 'y/MM/dd'));
      } else {
        setToValue(from ? format(from, 'y/MM/dd') : '');
      }
    } else {
      // default is cancel
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
            // proof 'to' = 'from'
            to = from;
          } else if (from === selectedRange?.from) {
            // when 'to' is changed
            from = to;
            to = selectedRange.to;
          }
          if (isBefore(from, selectedRange.to)) {
            setSelectedRange({
              ...selectedRange,
              from
            });
            setFromValue(format(from, 'y/MM/dd'));
          }
        }
      }
    }
  };
  const handleRangeSelectTo: SelectRangeEventHandler = (range: DateRange | undefined) => {
    if (range) {
      let { from, to } = range;
      if (selectedRange?.from) {
        if (to) {
          if (!from) {
            // proof 'to' = 'from'
            from = to;
          } else if (to === selectedRange?.to) {
            // when 'from' is changed
            to = from;
            from = selectedRange.from;
          }
          if (isAfter(to, selectedRange.from)) {
            setSelectedRange({
              ...selectedRange,
              to
            });
            setToValue(format(to, 'y/MM/dd'));
          }
        }
      }
    } else {
      // default is cancel
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
  const { t } = useTranslation();
  return (
    <Flex
      w={'280px'}
      h={'32px'}
      bg="grayModern.50"
      gap={'10px'}
      align={'center'}
      px={'12px'}
      justify={'space-between'}
      border={'1px solid'}
      borderColor={'grayModern.200'}
      borderRadius="6px"
      color={'grayModern.900'}
      {...props}
    >
      <Popover onClose={onClose}>
        <PopoverTrigger>
          <Button
            display={'flex'}
            variant={'unstyled'}
            isDisabled={isDisabled}
            justifyContent={'center'}
          >
            <Input
              isDisabled={!!isDisabled}
              variant={'unstyled'}
              flex={1}
              value={fromValue}
              minW="90px"
              onChange={handleFromChange}
              onBlur={onClose}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99}>
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelectFrom}
            defaultMonth={initState.from}
            styles={{
              day: {
                borderRadius: 'unset',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </PopoverContent>
      </Popover>
      <Box>
        <Img boxSize="16px" src={to_icon.src} alt="" />
      </Box>
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
              onBlur={onClose}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99}>
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelectTo}
            defaultMonth={initState.to}
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
          {/* <Flex w={'full'} px={'24px'} pb='20px' gap={'12px'} justifyContent={'flex-end'}>
						<Button px='14px' py={'8px'}
							color={'grayModern.600'} bgColor={'white'} borderColor={'grayModern.250'}
							variant={'unstyled'}
							border={'1px solid'}
							fontWeight={'500'}
						>{t('Cancel')}</Button>
						<Button px='14px' py={'8px'}
							variant={'unstyled'}
							border={'1px solid'}
							fontWeight={'500'}
							borderColor={'grayModern.900'}
							color={'white'}
							onClick={()=>{
								setInputState(0);
								onClose()
							}}
							bgColor={'grayModern.900'}>{t('Confirm')}</Button>
					</Flex> */}
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
