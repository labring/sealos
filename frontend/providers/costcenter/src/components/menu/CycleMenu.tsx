import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import {
  Button,
  Flex,
  FlexProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import BaseMenu from './BaseMenu';
import { CYCLE } from '@/constants/valuation';
import { Cycle } from '@/types/cycle';

export default function CycleMenu({
  isDisabled,
  ...props
}: {
  isDisabled: boolean;
} & FlexProps) {
  const { setCycle, cycleIdx } = useBillingStore();
  const { t } = useTranslation();
  const cycleList: string[] = CYCLE.map((v) => t(v));
  return (
    <BaseMenu
      isDisabled={isDisabled}
      setItem={function (idx: number) {
        setCycle(idx);
      }}
      itemIdx={cycleIdx}
      itemlist={cycleList}
      innerWidth={'72px'}
    />
  );
}
