'use client';

import {
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FlexProps,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { endOfDay, format, isAfter, isBefore, isMatch, isValid, parse, startOfDay } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { ChangeEventHandler, useMemo, useState } from 'react';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';
import useDateTimeStore from '@/store/date';
import { formatTimeRange, parseTimeRange } from '@/utils/timeRange';
import { MySelect } from '@sealos/ui';
import MyIcon from '../Icon';

interface DatePickerProps extends FlexProps {
  isDisabled?: boolean;
}

interface RecentDate {
  label: string;
  value: DateRange;
  compareValue: string;
}

const DatePicker = ({ isDisabled = false, ...props }: DatePickerProps) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { isOpen, onClose, onOpen } = useDisclosure();

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
    <Flex
      h={'32px'}
      bg="grayModern.50"
      gap={'10px'}
      align={'center'}
      px={'10px'}
      justify={'space-between'}
      border={'1px solid'}
      borderColor={'grayModern.200'}
      borderRadius="6px"
      color={'grayModern.900'}
      fontSize={'12px'}
      {...props}
    >
      <Popover isOpen={isOpen} onClose={onClose}>
        <PopoverTrigger>
          <Flex cursor={'pointer'} alignItems={'center'} gap={'4px'} onClick={onOpen}>
            <Text>{format(startDateTime, 'y-MM-dd HH:mm:ss')}</Text>
            <MyIcon name="to" />
            <Text>{format(endDateTime, 'y-MM-dd HH:mm:ss')}</Text>
            <Button variant={'unstyled'} isDisabled={isDisabled} minW={'fit-content'}>
              <MyIcon name="calendar" />
            </Button>
          </Flex>
        </PopoverTrigger>
        <PopoverContent zIndex={99} w={'fit-content'} borderRadius={'12px'}>
          <Flex w={'402px'} height={'382px'}>
            <Flex w={'242px'} flexDir={'column'}>
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeSelect}
                locale={currentLang === 'zh' ? zhCN : enUS}
                weekStartsOn={0}
              />
              <Divider />
              <Flex flexDir={'column'} gap={'5px'} px={'16px'} pt={'8px'}>
                <Text fontSize={'12px'} color={'grayModern.600'} ml={'3px'} mb={'4px'}>
                  {t('start')}
                </Text>
                <Flex w={'100%'} justify={'center'} gap={'4px'}>
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
                </Flex>
              </Flex>

              <Flex flexDir={'column'} gap={'5px'} px={'16px'} pt={'8px'} pb={'12px'}>
                <Text fontSize={'12px'} color={'grayModern.600'} ml={'3px'} mb={'4px'}>
                  {t('end')}
                </Text>
                <Flex w={'100%'} justify={'center'} gap={'4px'}>
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
                </Flex>
              </Flex>
            </Flex>
            <Divider orientation="vertical" flexShrink={0} />
            <Flex flex={1}>
              <Flex flexDir={'column'} gap={'4px'} p={'12px 8px'} w={'100%'}>
                {recentDateList.map((item) => (
                  <Button
                    height={'32px'}
                    key={JSON.stringify(item.value)}
                    variant={'ghost'}
                    color={'grayModern.900'}
                    fontSize={'12px'}
                    fontWeight={'400'}
                    justifyContent={'flex-start'}
                    {...(recentDate.compareValue === item.compareValue && {
                      bg: 'brightBlue.50',
                      color: 'brightBlue.600'
                    })}
                    _hover={{
                      bg: 'rgba(17, 24, 36, 0.05)'
                    }}
                    onClick={() => handleRecentDateClick(item)}
                  >
                    {item.label}
                  </Button>
                ))}
              </Flex>
            </Flex>
          </Flex>
          <Divider />
          <Flex justify={'space-between'} pl={'12px'} alignItems={'center'} py={'8px'}>
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
            <ButtonGroup variant="outline" spacing="2" px={'10px'}>
              <Button
                border={'1px solid'}
                borderColor={'grayModern.250'}
                borderRadius={'6px'}
                onClick={() => {
                  setRecentDate(defaultRecentDate);
                  handleRecentDateClick(defaultRecentDate);
                }}
              >
                <MyIcon name="refresh" color={'grayModern.500'} />
              </Button>
              <Button
                border={'1px solid'}
                borderColor={'grayModern.250'}
                borderRadius={'6px'}
                onClick={() => onClose()}
              >
                {t('Cancel')}
              </Button>
              <Button onClick={() => onSubmit()} variant={'solid'}>
                {t('Confirm')}
              </Button>
            </ButtonGroup>
          </Flex>
        </PopoverContent>
      </Popover>
    </Flex>
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
      backgroundColor={'white'}
      w={'50%'}
      {...(error && {
        borderColor: 'red.500',
        _hover: { borderColor: 'red.500' }
      })}
      {...(showError && {
        borderColor: 'red.500',
        _hover: { borderColor: 'red.500' },
        animation: 'shake 0.3s'
      })}
      sx={{
        '@keyframes shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' }
        }
      }}
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
