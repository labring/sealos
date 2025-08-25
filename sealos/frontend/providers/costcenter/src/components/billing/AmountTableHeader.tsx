import { BillingType } from '@/types';
import { formatMoney } from '@/utils/format';
import { Text } from '@chakra-ui/react';

export default function Amount({
  type,
  amount,
  total
}: {
  type: BillingType;
  amount: number | undefined | null;
  total?: boolean;
}) {
  if (amount === undefined || amount === null) return <span>-</span>;
  if (amount === 0) return <span>0</span>;
  if ([BillingType.CONSUME, BillingType.TRANSFER].includes(type))
    return <Text color={total ? '#0884DD' : ''}>-{formatMoney(amount)}</Text>;
  else if ([BillingType.RECHARGE, BillingType.RECEIVE].includes(type))
    return <Text color={total ? '#00A9A6' : ''}>+{formatMoney(amount)}</Text>;
  else return <span>-</span>;
}
