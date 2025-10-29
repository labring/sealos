import SealosCoinImage from '@/assert/sealos_coin.png';
import useEnvStore from '@/stores/env';
import { cn } from '@sealos/shadcn-ui';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { DetailedHTMLProps, HTMLAttributes } from 'react';

export default function CurrencySymbol({
  forcedType,
  useRealCurrency,
  ...props
}: {
  forcedType?: 'shellCoin' | 'cny' | 'usd';
  useRealCurrency?: boolean;
} & DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  const { t } = useTranslation();

  const defaultCurrencyType = useEnvStore((state) => state.currency);
  const currencyType =
    forcedType === 'shellCoin'
      ? useRealCurrency
        ? 'cny'
        : 'shellCoin'
      : (forcedType ?? defaultCurrencyType);

  return currencyType === 'shellCoin' ? (
    <span
      {...props}
      className={cn('inline [font-size:inherit] leading-0 align-[0.0875em] mx-1', props.className)}
    >
      <Image
        src={SealosCoinImage.src}
        alt={t('common:sealos_coin_alt')}
        aria-label={t('common:sealos_coin_text')}
        role="img"
        className="inline box-border size-[inherit] leading-0"
        width={16}
        height={16}
      />
    </span>
  ) : currencyType === 'cny' ? (
    <span className="text-inherit" {...props}>
      ￥
    </span>
  ) : (
    <span className="text-inherit" {...props}>
      $
    </span>
  );
}
