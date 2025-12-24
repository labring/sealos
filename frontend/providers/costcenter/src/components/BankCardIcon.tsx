import React from 'react';
import Image from 'next/image';
import { CreditCard } from 'lucide-react';
import visaIcon from '@/assets/payment-methods-card/visa.svg';
import mastercardIcon from '@/assets/payment-methods-card/mastercard.svg';
import amexIcon from '@/assets/payment-methods-card/amex.svg';
import unionpayIcon from '@/assets/payment-methods-card/unionpay.svg';
import jcbIcon from '@/assets/payment-methods-card/jcb.svg';
import discoverIcon from '@/assets/payment-methods-card/discover.svg';
import dinersIcon from '@/assets/payment-methods-card/diners.svg';

export type BankCardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'unionpay'
  | 'jcb'
  | 'discover'
  | 'diners';

export interface BankCardIconProps extends Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> {
  brand: string;
}

const iconMap: Record<BankCardBrand, typeof visaIcon> = {
  visa: visaIcon,
  mastercard: mastercardIcon,
  amex: amexIcon,
  unionpay: unionpayIcon,
  jcb: jcbIcon,
  discover: discoverIcon,
  diners: dinersIcon
};

// Map API brand string to BankCardIcon brand format
function mapBrandToIconBrand(brand: string): BankCardBrand | null {
  const normalizedBrand = brand.toLowerCase();
  if (
    ['visa', 'mastercard', 'amex', 'unionpay', 'jcb', 'discover', 'diners'].includes(
      normalizedBrand
    )
  ) {
    return normalizedBrand as BankCardBrand;
  }
  return null;
}

export function BankCardIcon({
  brand,
  className,
  style,
  width,
  height,
  ...props
}: BankCardIconProps) {
  const iconBrand = mapBrandToIconBrand(brand);
  const iconSrc = iconBrand ? iconMap[iconBrand] : null;

  // Default dimensions matching h-9 w-14 (36px x 56px)
  const defaultWidth = width || 56;
  const defaultHeight = height || 36;

  // Fallback when no icon is available
  if (!iconSrc) {
    return (
      <div
        className={className}
        style={{
          width: defaultWidth,
          height: defaultHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: '0.375rem',
          ...style
        }}
      >
        <CreditCard className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={iconSrc}
      alt={`${brand} card`}
      className={className}
      style={{
        objectFit: 'contain',
        ...style
      }}
      width={defaultWidth}
      height={defaultHeight}
      {...props}
    />
  );
}
