'use client';

import {
  Button,
  Flex,
  Text,
  FlexProps,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Divider,
  Grid,
  GridItem,
  ButtonGroup
} from '@chakra-ui/react';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { DateRange, DayPicker, SelectRangeEventHandler } from 'react-day-picker';
import { endOfDay, format, isAfter, isBefore, isValid, parse, startOfDay } from 'date-fns';
import { useDisclosure } from '@chakra-ui/react';

import MyIcon from '../Icon';
import useDateTimeStore from '@/store/date';
import { MySelect } from '@sealos/ui';

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

  const defaultRecentDate = {
    label: `${t('recently')} 7 ${t('day')}`,
    value: getDateRange('7d'),
    compareValue: '7d'
  };

  const [inputState, setInputState] = useState<0 | 1>(0);
  const [recentDate, setRecentDate] = useState<RecentDate>(defaultRecentDate);

  const [fromDateTimeValue, setFromDateTimeValue] = useState<Date>(initState.from);
  const [toDateTimeValue, setToDateTimeValue] = useState<Date>(initState.to);

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initState);

  const onSubmit = () => {
    selectedRange?.from && setStartDateTime(selectedRange.from);
    selectedRange?.to && setEndDateTime(selectedRange.to);
    onClose();
  };

  const handleFromChange = (value: string, type: 'date' | 'time') => {
    const currentValue = format(fromDateTimeValue, 'y-MM-dd HH:mm:ss');
    let newDateString = currentValue;

    if (type === 'date') {
      const newDate = value;
      const oldTime = format(fromDateTimeValue, 'HH:mm:ss');
      newDateString = `${newDate} ${oldTime}`;
    } else {
      const newTime = value;
      const oldDate = format(fromDateTimeValue, 'y-MM-dd');
      newDateString = `${oldDate} ${newTime}`;
    }

    const date = parse(newDateString, 'y-MM-dd HH:mm:ss', new Date());

    setFromDateTimeValue(date);

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
    const currentValue = format(fromDateTimeValue, 'y-MM-dd HH:mm:ss');
    let newDateString = currentValue;

    if (type === 'date') {
      const newDate = value;
      const oldTime = format(fromDateTimeValue, 'HH:mm:ss');
      newDateString = `${newDate} ${oldTime}`;
    } else {
      const newTime = value;
      const oldDate = format(fromDateTimeValue, 'y-MM-dd');
      newDateString = `${oldDate} ${newTime}`;
    }

    const date = parse(newDateString, 'y-MM-dd HH:mm:ss', new Date());
    setToDateTimeValue(date);

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
        setFromDateTimeValue(startOfDay(from));
      } else {
        setFromDateTimeValue(new Date());
      }
      if (to) {
        setToDateTimeValue(endOfDay(to));
      } else {
        setToDateTimeValue(from ? from : new Date());
      }
    } else {
      // default is cancel
      if (fromDateTimeValue && selectedRange?.from) {
        setToDateTimeValue(fromDateTimeValue);
        setSelectedRange({
          ...selectedRange,
          to: selectedRange.from
        });
        setInputState(1);
      }
    }
  };

  const handleRecentDateClick = (item: RecentDate) => {
    setRecentDate(item);
    setSelectedRange(item.value);
    if (item.value.from) {
      setFromDateTimeValue(item.value.from);
    }
    if (item.value.to) {
      setToDateTimeValue(item.value.to);
    }
  };

  const recentDateList = [
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
      label: `${t('recently')} 1 ${t('hour')}`,
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
  ];

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
      {...props}
    >
      <Text>{format(startDateTime, 'y-MM-dd HH:mm:ss')}</Text>
      <MyIcon name="to" />
      <Text>{format(endDateTime, 'y-MM-dd HH:mm:ss')}</Text>
      <Popover isOpen={isOpen} onClose={onClose}>
        <PopoverTrigger>
          <Button
            variant={'unstyled'}
            isDisabled={isDisabled}
            minW={'fit-content'}
            onClick={onOpen}
          >
            <MyIcon name="calendar" />
          </Button>
        </PopoverTrigger>
        <PopoverContent zIndex={99} w={'fit-content'}>
          <Grid
            templateColumns="repeat(9,1fr)"
            templateRows={'repeat(10,1fr)'}
            w={'500px'}
            h={'fit-content'}
          >
            <GridItem colSpan={6} rowSpan={9}>
              <Flex flexDir={'column'} gap={'5px'} mb={'-1px'} pl={'10px'}>
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  locale={currentLang === 'zh' ? zhCN : enUS}
                  weekStartsOn={0}
                />
                <Divider />
                <Flex flexDir={'column'} gap={'5px'} p={'12px'}>
                  {/* start date and time */}
                  <Text fontSize={'12px'} color={'grayModern.600'} ml={'3px'}>
                    {t('start')}
                  </Text>
                  <Flex w={'100%'} justify={'center'} gap={'10px'}>
                    <Input
                      backgroundColor={'white'}
                      w={'50%'}
                      value={format(fromDateTimeValue, 'y-MM-dd')}
                      onChange={(e) => handleFromChange(e.target.value, 'date')}
                    />
                    <Input
                      w={'50%'}
                      backgroundColor={'white'}
                      value={format(fromDateTimeValue, 'HH:mm:ss')}
                      onChange={(e) => handleFromChange(e.target.value, 'time')}
                    />
                  </Flex>
                  {/* end date and time */}
                  <Text fontSize={'12px'} color={'grayModern.600'} ml={'3px'}>
                    {t('end')}
                  </Text>
                  <Flex w={'100%'} justify={'center'} gap={'10px'}>
                    <Input
                      w={'50%'}
                      backgroundColor={'white'}
                      value={format(toDateTimeValue, 'y-MM-dd')}
                      onChange={(e) => handleToChange(e.target.value, 'date')}
                    />
                    <Input
                      w={'50%'}
                      backgroundColor={'white'}
                      value={format(toDateTimeValue, 'HH:mm:ss')}
                      onChange={(e) => handleToChange(e.target.value, 'time')}
                    />
                  </Flex>
                </Flex>
                <Divider />
              </Flex>
            </GridItem>
            <GridItem colSpan={3} rowSpan={9}>
              <Flex h={'100%'}>
                <Divider orientation="vertical" />
                <Flex flexDir={'column'} gap={'4px'} p={'12px'} w={'100%'}>
                  {recentDateList.map((item) => (
                    <Button
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
                      onClick={() => handleRecentDateClick(item)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Flex>
              </Flex>
              <Divider />
            </GridItem>
            <GridItem colSpan={9} rowSpan={1}>
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
                  <Button onClick={() => onSubmit()} variant={'primary'}>
                    {t('Confirm')}
                  </Button>
                </ButtonGroup>
              </Flex>
            </GridItem>
          </Grid>
        </PopoverContent>
      </Popover>
    </Flex>
  );
};

const getDateRange = (value: string): DateRange => {
  const now = new Date();
  const to = now;
  const from = new Date();

  const [amount, unit] = [parseInt(value), value.slice(-1)];

  switch (unit) {
    case 'm':
      from.setMinutes(now.getMinutes() - amount);
      break;
    case 'h':
      from.setHours(now.getHours() - amount);
      break;
    case 'd':
      from.setDate(now.getDate() - amount);
      break;
  }

  return { from, to };
};

export default DatePicker;
