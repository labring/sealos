import { describe, expect, it } from 'vitest';
import { getAccountSummary } from '@/api/account';

describe('getAccountSummary', () => {
  it('uses null values when account data is unavailable', () => {
    expect(getAccountSummary(undefined)).toEqual({
      balance: null,
      expenditure: null,
      recharge: null
    });
  });

  it('preserves valid zero amounts', () => {
    expect(getAccountSummary({ balance: 0, deductionBalance: 0 })).toEqual({
      balance: 0,
      expenditure: 0,
      recharge: 0
    });
  });
});
