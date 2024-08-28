import { TRANSFER_LIST_TYPE } from '@/constants/billing';
import { FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import BaseMenu from '../menu/BaseMenu';

export default function TypeMenu({
  isDisabled,
  idx,
  setIdx,
  ...props
}: {
  isDisabled: boolean;
  idx: number;
  setIdx: (idx: number) => void;
} & FlexProps) {
  const { t } = useTranslation();
  const itemList = TRANSFER_LIST_TYPE.map((v) => t(v.title));
  return (
    <BaseMenu
      isDisabled={false}
      setItem={function (idx: number): void {
        setIdx(idx);
      }}
      itemIdx={idx}
      itemlist={itemList}
      innerWidth={'120px'}
      {...props}
    ></BaseMenu>
  );
}
