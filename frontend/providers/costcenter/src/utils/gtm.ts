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
    currency: 'USD',
    amount
  });
export const gtmTopupSuccess = ({ amount, paid }: { amount: number; paid: number }) =>
  window?.dataLayer?.push({
    event: 'topup_success',
    module: 'costcenter',
    method: 'stripe',
    context: 'app',
    currency: 'USD',
    amount,
    paid
  });

export const gtmSubscribeCheckout = ({
  amount,
  plan,
  type
}: {
  amount: number;
  plan: string;
  type: 'new' | 'upgrade' | 'downgrade';
}) =>
  window?.dataLayer?.push({
    event: 'subscribe_checkout',
    method: 'stripe',
    module: 'costcenter',
    context: 'app',
    currency: 'USD',
    amount,
    plan,
    type
  });

export const gtmSubscribeSuccess = ({
  amount,
  paid,
  plan,
  type
}: {
  amount: number;
  paid: number;
  plan: string;
  type: 'new' | 'upgrade' | 'downgrade';
}) =>
  window?.dataLayer?.push({
    event: 'subscribe_success',
    module: 'costcenter',
    method: 'stripe',
    context: 'app',
    currency: 'USD',
    amount,
    paid,
    plan,
    type
  });
