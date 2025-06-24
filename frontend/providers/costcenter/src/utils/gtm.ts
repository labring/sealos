export const gtmOpenTopup = () =>
  window?.dataLayer?.push?.({
    event: 'topup_start',
    module: 'costcenter',
    context: 'app'
  });
export const gtmTopupCheckout = ({ amount }: { amount: number }) =>
  window?.dataLayer?.push({
    event: 'topup_checkout',
    method: 'stripe',
    module: 'costcenter',
    context: 'app',
    curreny: 'USD',
    amount
  });
export const gtmTopupSuccess = ({ amount, paid }: { amount: number; paid: number }) =>
  window?.dataLayer?.push({
    event: 'topup_success',
    module: 'costcenter',
    method: 'stripe',
    context: 'app',
    curreny: 'USD',
    amount,
    paid
  });
