import { Spinner } from '@chakra-ui/react';
// import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { FormEvent } from 'react';
import useEnvStore from '@/stores/env';
const CheckoutForm = (props: { url: string; sessionId: string }) => {
  // const stripe = useStripe();
  // const elements = useElements();

  const stripePromise = useEnvStore((s) => s.stripePromise);
  const handleSubmit = async (event: FormEvent) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();
    if (!stripePromise) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    const res1 = await stripePromise;
    if (!res1) return;
    const res = await res1.redirectToCheckout({
      sessionId: props.sessionId
    });
  };

  return <Spinner />;
};

export default CheckoutForm;
