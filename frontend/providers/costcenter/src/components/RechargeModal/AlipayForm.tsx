import { RechargePaymentState } from '@/constants/payment';
import { Flex, Spinner } from '@chakra-ui/react';
import { useEffect } from 'react';

const AlipayForm = ({
  codeURL: url,
  rechargePhase
}: {
  codeURL?: string;
  rechargePhase: RechargePaymentState;
}) => {
  useEffect(() => {
    if (rechargePhase !== RechargePaymentState.PROCESSING || !url || !window.top) return;
    window.top.location.replace(url);
  }, [rechargePhase, url]);
  return (
    <Flex w={'100%'} flex={1} align={'center'} justify={'center'}>
      <Spinner size={'xl'} />
    </Flex>
  );
};

export default AlipayForm;
