import { describe, expect, it } from 'vitest';
import request from '@/service/request';
import { getCostStatusLabelKey, getRegionCost } from '@/components/billing/regionConsumption';

describe('billing region consumption', () => {
  it('waits up to 60 seconds for region billing requests', () => {
    expect(request.defaults.timeout).toBe(60_000);
  });

  it('includes a successful Beijing response in the region cost', () => {
    expect(getRegionCost({ amount: 6_037_211, status: 'success' }, 0)).toBe(6_037_211);
  });

  it('shows no data for a failed region without adding it to the total', () => {
    expect(getRegionCost({ status: 'error' }, 0)).toBe(0);
    expect(getCostStatusLabelKey('error')).toBe('common:cost_no_data');
  });
});
