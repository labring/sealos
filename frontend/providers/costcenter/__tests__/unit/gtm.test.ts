import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gtmSubscribeCheckout,
  gtmSubscribeSuccess,
  gtmTopupCheckout,
  gtmTopupSuccess
} from '@/utils/gtm';

describe('Cost Center GTM payment events', () => {
  const dataLayer = { push: vi.fn() };

  beforeEach(() => {
    dataLayer.push.mockClear();
    vi.stubGlobal('window', { dataLayer });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the currency field for top-up checkout', () => {
    gtmTopupCheckout({ amount: 20 });

    expect(dataLayer.push).toHaveBeenCalledWith({
      event: 'topup_checkout',
      method: 'stripe',
      module: 'costcenter',
      context: 'app',
      currency: 'USD',
      amount: 20
    });
  });

  it('uses the currency field for top-up success', () => {
    gtmTopupSuccess({ amount: 25, paid: 20 });

    expect(dataLayer.push).toHaveBeenCalledWith({
      event: 'topup_success',
      method: 'stripe',
      module: 'costcenter',
      context: 'app',
      currency: 'USD',
      amount: 25,
      paid: 20
    });
  });

  it('uses the currency field for subscription checkout', () => {
    gtmSubscribeCheckout({ amount: 15, plan: 'professional', type: 'new' });

    expect(dataLayer.push).toHaveBeenCalledWith({
      event: 'subscribe_checkout',
      method: 'stripe',
      module: 'costcenter',
      context: 'app',
      currency: 'USD',
      amount: 15,
      plan: 'professional',
      type: 'new'
    });
  });

  it('uses the currency field for subscription success', () => {
    gtmSubscribeSuccess({ amount: 15, paid: 12, plan: 'professional', type: 'upgrade' });

    expect(dataLayer.push).toHaveBeenCalledWith({
      event: 'subscribe_success',
      method: 'stripe',
      module: 'costcenter',
      context: 'app',
      currency: 'USD',
      amount: 15,
      paid: 12,
      plan: 'professional',
      type: 'upgrade'
    });
  });
});
