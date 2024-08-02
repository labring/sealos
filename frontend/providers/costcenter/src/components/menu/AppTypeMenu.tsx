import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types';
import {
  Button,
  Flex,
  FlexProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';
import BaseMenu from './BaseMenu';
import useAppTypeStore from '@/stores/appType';

export default function AppTypeMenu({
  isDisabled,
  innerWidth = '360px',
  ...props
}: {
  innerWidth?: string;
  isDisabled: boolean;
} & FlexProps) {
  const { setAppType } = useBillingStore();
  // const { isOpen, onClose, onOpen } = useDisclosure();
  const { t: appT } = useTranslation('applist');
  const { appTypeIdx, appTypeList } = useBillingStore();
  const appNameList = useMemo(() => appTypeList.map((v) => appT(v)), [appTypeList, appT]);
  return (
    <BaseMenu
      isDisabled={isDisabled}
      setItem={function (idx: number): void {
        setAppType(idx);
      }}
      itemIdx={appTypeIdx}
      innerWidth={innerWidth}
      itemlist={appNameList}
      {...props}
    />
  );
}
