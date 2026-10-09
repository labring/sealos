import { describe, expect, it } from 'vitest';
import {
  canRecreateSubscription,
  getSubscriptionOperator,
  isSubscriptionExpired
} from '@/utils/subscription';

const currentPlan = {
  UpgradePlanList: ['Pro'],
  DowngradePlanList: ['Free']
};

describe('subscription state', () => {
  it.each(['DEBT', 'deleted'])('allows %s subscriptions to be recreated', (status) => {
    expect(canRecreateSubscription(status)).toBe(true);
  });

  it('does not recreate a normal subscription', () => {
    expect(canRecreateSubscription('NORMAL')).toBe(false);
  });

  it('uses created for a deleted subscription even when the old plan still exists', () => {
    expect(getSubscriptionOperator('DELETED', currentPlan, 'Starter')).toBe('created');
  });

  it('keeps normal plan transitions unchanged', () => {
    expect(getSubscriptionOperator('NORMAL', currentPlan, 'Pro')).toBe('upgraded');
    expect(getSubscriptionOperator('NORMAL', currentPlan, 'Free')).toBe('downgraded');
  });

  it('treats deleted subscriptions as expired and not resumable', () => {
    expect(
      isSubscriptionExpired({
        status: 'DELETED',
        currentPeriodEndAt: '2026-08-25T00:00:00.000Z'
      })
    ).toBe(true);
  });
});
