import { RechargePaymentState } from '@/constants/payment';
import { Flex, Spinner } from '@chakra-ui/react';
import { Stripe } from '@stripe/stripe-js';
import { useEffect } from 'react';

const StripeForm = ({
  tradeNO: sessionId,
  rechargePhase,
  stripePromise
}: {
  tradeNO?: string;
  rechargePhase: RechargePaymentState;
  stripePromise: Promise<Stripe | null>;
}) => {
  useEffect(() => {
    if (stripePromise && sessionId)
      (async () => {
        try {
          const res1 = await stripePromise;
          if (!res1) return;
          if (rechargePhase !== RechargePaymentState.PROCESSING) return;
          await res1.redirectToCheckout({
            sessionId
          });
        } catch (e) {
          console.error(e);
        }
      })();
  }, [sessionId, stripePromise, rechargePhase]);
  return (
    <Flex w={'100%'} flex={1} align={'center'} justify={'center'}>
      <Spinner size={'xl'} />
    </Flex>
  );
};

export default StripeForm;
