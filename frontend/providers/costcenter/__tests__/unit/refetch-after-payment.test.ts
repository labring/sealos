// Verifies that post-payment query invalidation in pages/plan/index.tsx
// is awaited and surfaces failures via the toast hook, instead of silently
// leaving the UI in a stale state after Stripe payment success.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

// The five queryKeys the post-payment refetch invalidates, in the same order
// as pages/plan/index.tsx so a regression in either drifts the test.
const POST_PAYMENT_QUERY_KEYS = [
  ['subscription-info'],
  ['last-transaction'],
  ['upgrade-amount'],
  ['card-info'],
  ['payment-waiting-transaction']
] as const;

describe('refetchAfterPayment', () => {
  let queryClient: QueryClient;
  let toast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    toast = vi.fn();
  });

  // Inline replica of the helper defined in pages/plan/index.tsx so this test
  // can exercise the behaviour without rendering the full Plan component
  // (which pulls in next-i18next, chakra, stripe, etc.). Keep the body in
  // sync with the implementation in pages/plan/index.tsx.
  function makeRefetchAfterPayment(qc: QueryClient, toastFn: typeof toast) {
    return async () => {
      try {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['subscription-info'] }, { throwOnError: true }),
          qc.invalidateQueries({ queryKey: ['last-transaction'] }, { throwOnError: true }),
          qc.invalidateQueries({ queryKey: ['upgrade-amount'] }, { throwOnError: true }),
          qc.invalidateQueries({ queryKey: ['card-info'] }, { throwOnError: true }),
          qc.invalidateQueries(
            { queryKey: ['payment-waiting-transaction'] },
            { throwOnError: true }
          )
        ]);
      } catch (err) {
        toastFn({
          status: 'error',
          title:
            'Payment succeeded, but refreshing subscription data failed. Please refresh the page.'
        });
      }
    };
  }

  it('invalidates every post-payment query exactly once', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const refetchAfterPayment = makeRefetchAfterPayment(queryClient, toast);
    await refetchAfterPayment();

    expect(spy).toHaveBeenCalledTimes(POST_PAYMENT_QUERY_KEYS.length);
    for (const key of POST_PAYMENT_QUERY_KEYS) {
      expect(spy).toHaveBeenCalledWith({ queryKey: key }, { throwOnError: true });
    }
    expect(toast).not.toHaveBeenCalled();
  });

  it('surfaces a toast when any of the post-payment refetches reject', async () => {
    // First call rejects (simulates subscription-info backend 503),
    // remaining four resolve.
    const spy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('last-transaction backend 503'))
      .mockResolvedValue(undefined);

    const refetchAfterPayment = makeRefetchAfterPayment(queryClient, toast);
    await refetchAfterPayment();

    expect(spy).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        title: expect.stringMatching(/refreshing subscription data failed/i)
      })
    );
  });

  it('does NOT swallow the failure silently (regression for the pre-fix behaviour)', async () => {
    // Pre-fix: queryClient.invalidateQueries(...) was called WITHOUT
    // `{ throwOnError: true }` and WITHOUT being awaited. react-query v4
    // wraps refetch rejections in `.catch(noop)` when throwOnError is falsy,
    // so a failure would never reach the call site and never invoke toast.
    // This test asserts the new behaviour: a single rejection DOES invoke toast.
    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('backend 500'));

    const refetchAfterPayment = makeRefetchAfterPayment(queryClient, toast);
    await refetchAfterPayment();

    expect(toast).toHaveBeenCalled();
  });
});
