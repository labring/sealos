import { CYCLE } from '@/constants/valuation';
import { useTranslation } from 'next-i18next';
import { cn } from '@sealos/shadcn-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';

export default function CycleMenu({
  cycleIdx,
  setCycleIdx,
  isDisabled,
  className,
  ...selectProps
}: {
  cycleIdx: number;
  setCycleIdx: (x: number) => void;
  isDisabled?: boolean;
  className?: {
    trigger?: string;
  };
} & React.ComponentProps<typeof Select>) {
  const { t } = useTranslation();

  return (
    <Select
      disabled={isDisabled}
      value={cycleIdx.toString() ?? undefined}
      onValueChange={(value) => {
        setCycleIdx(Number.isSafeInteger(Number(value)) ? Number(value) : 0);
      }}
      {...selectProps}
    >
      <SelectTrigger className={cn(className?.trigger)}>
        <SelectValue placeholder={t('common:cycle')} />
      </SelectTrigger>
      <SelectContent>
        {CYCLE.map((item, idx) => (
          <SelectItem key={idx} value={idx.toString()}>
            {t('time_units.' + item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
