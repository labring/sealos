// Legacy GTM v1 events
import { ProductUserTraits } from '@/types/analytics';

const cleanTraitValue = (value?: string | null) => {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  return normalized === 'undefined' || normalized === 'null' ? '' : normalized;
};

const normalizeProductUserTraits = (
  productUserTraits?: Partial<ProductUserTraits>
): ProductUserTraits => ({
  user_username: cleanTraitValue(productUserTraits?.user_username),
  user_name: cleanTraitValue(productUserTraits?.user_name),
  user_email: cleanTraitValue(productUserTraits?.user_email)
});

/** @deprecated */
export const gtmLoginStart = () =>
  window?.dataLayer?.push?.({
    event: 'login_start',
    module: 'auth',
    context: 'app'
  });

/** @deprecated */
export const gtmLoginSuccess = ({
  method,
  oauth2Provider,
  user_type,
  productUserTraits
}: {
  method: 'phone' | 'email' | 'oauth2';
  oauth2Provider?: string;
  user_type: 'new' | 'existing';
  productUserTraits?: Partial<ProductUserTraits>;
}) =>
  window?.dataLayer?.push?.({
    event: 'login_success',
    method,
    oauth2_provider: oauth2Provider,
    user_type,
    module: 'auth',
    context: 'app',
    ...normalizeProductUserTraits(productUserTraits)
  });
