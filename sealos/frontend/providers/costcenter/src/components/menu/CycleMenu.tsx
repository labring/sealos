import { CYCLE } from '@/constants/valuation';
import useBillingStore from '@/stores/billing';
import { FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import BaseMenu from './BaseMenu';

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
