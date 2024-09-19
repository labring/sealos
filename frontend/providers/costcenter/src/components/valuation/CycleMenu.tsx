import { CYCLE } from '@/constants/valuation';
import { FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import BaseMenu from '../menu/BaseMenu';

export default function CycleMenu({
  cycleIdx,
  setCycleIdx,
  ...props
}: {
  cycleIdx: number;
  setCycleIdx: (x: number) => void;
} & FlexProps) {
  const { t } = useTranslation();
  return (
    <BaseMenu
      itemIdx={cycleIdx}
      isDisabled={false}
      setItem={function (idx: number): void {
        setCycleIdx(idx);
      }}
      innerWidth={props.width}
      itemlist={CYCLE.map((v) => t(v)) as unknown as string[]}
      {...props}
    />
  );
}
