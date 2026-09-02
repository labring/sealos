export type BillingCostStatus = 'loading' | 'success' | 'error';

export type RegionConsumptionState = {
  amount?: number;
  status: BillingCostStatus;
};

export function getRegionCost(consumption: RegionConsumptionState | undefined, payment = 0) {
  return consumption?.status === 'success' ? (consumption.amount || 0) + payment : 0;
}

export function getCostStatusLabelKey(status: BillingCostStatus) {
  if (status === 'error') return 'common:cost_no_data';
  if (status === 'loading') return 'common:cost_loading';
  return null;
}
