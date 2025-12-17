import { useTranslation } from 'next-i18next';

interface BankCardBrandProps {
  brand: string;
  className?: string;
}

export function BankCardBrand({ brand, className }: BankCardBrandProps) {
  const { t } = useTranslation();

  // Get translated brand name
  const normalizedBrand = brand.toLowerCase();
  const translationKey = `common:card_brands.${normalizedBrand}`;
  const translated = t(translationKey);

  // If translation doesn't exist, show Unknown
  const displayName = translated === translationKey ? t('common:unknown') : translated;

  return <span className={className}>{displayName}</span>;
}
