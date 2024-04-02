import {
  Flex,
  Input,
  Popover,
  PopoverTrigger,
  Img,
  PopoverContent,
  Button,
  Box,
  useTheme
} from '@chakra-ui/react';
import { format, parse, isValid, isAfter, isBefore } from 'date-fns';
import { useState, ChangeEventHandler, useEffect, useMemo } from 'react';
import { DateRange, SelectRangeEventHandler, DayPicker } from 'react-day-picker';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarIcon } from '@chakra-ui/icons';

export default function RangeDate({
  isDisabled = false,
  defaultRange = { from: new Date(), to: new Date() }
}: {
  isDisabled?: boolean;
  defaultRange?: DateRange;
}) {
  const [selectedRange, setSelectedRange] = useState<DateRange>(defaultRange);

  const onClose = () => {};

  return (
    <Popover onClose={onClose} strategy={'fixed'} offset={[-10, 10]}>
      <PopoverTrigger>
        <Button
          w={'280px'}
          py={1}
          border={useTheme().borders.base}
          borderRadius="2px"
          cursor={'pointer'}
          display={'flex'}
          alignItems={'center'}
          isDisabled={isDisabled}
        >
          <Box flex={1} textAlign={'center'}>
            {format(selectedRange.from || new Date(), 'y-MM-dd')}
          </Box>
          <Box>-</Box>
          <Box flex={1} textAlign={'center'}>
            {format(selectedRange.to || new Date(), 'y-MM-dd')}
          </Box>
          <CalendarIcon pr={2} fontSize={'22px'} color={'myGray.600'} />
        </Button>
      </PopoverTrigger>
      <PopoverContent w={'100%'}>
        <DayPicker
          mode="range"
          selected={selectedRange}
          onSelect={(e) => {
            if (e) {
              setSelectedRange(e);
            } else {
              setSelectedRange((state) => ({
                from: state.from,
                to: state.from
              }));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
