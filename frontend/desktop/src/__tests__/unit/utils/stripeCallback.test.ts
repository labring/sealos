import { describe, expect, it } from 'vitest';

import { resolveStripeCallbackTarget } from '@/utils/stripeCallback';

describe('resolveStripeCallbackTarget', () => {
  it('opens Brain billing when the checkout declares system-brain', () => {
    expect(resolveStripeCallbackTarget('system-brain')).toEqual({
      appKey: 'system-brain',
      pathname: '/billing'
    });
  });

  it.each([undefined, 'system-costcenter', 'untrusted-app'])(
    'keeps the existing costcenter callback for %s',
    (payApp) => {
      expect(resolveStripeCallbackTarget(payApp)).toEqual({
        appKey: 'system-costcenter',
        pathname: '/'
      });
    }
  );
});
