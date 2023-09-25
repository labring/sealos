import request from '@/services/request';
import { ApiResp } from '@/types';
import { Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import CurrencySymbol from '../pages/license/components/CurrencySymbol';

export default function useBonusBox() {
  const [selectAmountIndex, setSelectAmountIndex] = useState(0);

  const { data: bonuses, isSuccess } = useQuery(
    ['bonus'],
    () =>
      request.get<
        any,
        ApiResp<{
          steps: string;
          ratios: string;
        }>
      >('/api/price/bonus'),
    {}
  );

  const { ratios, steps } = useMemo(() => {
    return {
      ratios: (bonuses?.data?.ratios || '').split(',').map((v) => +v),
      steps: (bonuses?.data?.steps || '').split(',').map((v) => +v)
    };
  }, [bonuses?.data]);

  const BonusBox = useCallback(
    () => (
      <Flex wrap={'wrap'} gap={'16px'} minW="460px">
        {steps.map((amount, index) => (
          <Flex
            key={amount}
            width="140px"
            height="92px"
            justify={'center'}
            align={'center'}
            {...(selectAmountIndex === index
              ? {
                  color: '#36ADEF',
                  border: '1.5px solid #36ADEF'
                }
              : {
                  border: '1px solid #EFF0F1'
                })}
            bg={'#f4f6f8'}
            borderRadius="4px"
            position={'relative'}
            flexGrow="0"
            cursor={'pointer'}
            onClick={(e) => {
              e.preventDefault();
              setSelectAmountIndex(index);
            }}
          >
            <Flex align={'center'}>
              <CurrencySymbol w="24px" type={'shellCoin'} />
              <Text ml="4px" fontStyle="normal" fontWeight="500" fontSize="24px">
                {amount}
              </Text>
            </Flex>
          </Flex>
        ))}
      </Flex>
    ),
    [selectAmountIndex, steps]
  );

  return {
    BonusBox,
    selectAmount: steps[selectAmountIndex]
  };
}
