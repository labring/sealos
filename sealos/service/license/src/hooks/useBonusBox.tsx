import { getPriceBonus } from '@/api/system';
import CurrencySymbol from '@/components/CurrencySymbol';
import { getFavorable } from '@/utils/tools';
import { Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo, useState } from 'react';

export default function useBonusBox() {
  const { t } = useTranslation();

  const [selectAmountIndex, setSelectAmountIndex] = useState(0);
  const { data: bonuses, isSuccess } = useQuery(['bonus'], getPriceBonus);
  const { ratios, steps } = useMemo(() => {
    return {
      ratios: (bonuses?.ratios || '').split(',').map((v) => +v),
      steps: (bonuses?.steps || '').split(',').map((v) => +v)
      // .concat([1])
    };
  }, [bonuses]);

  const getBonus = useCallback(
    (amount: number) => {
      if (isSuccess && ratios && steps && ratios.length === steps.length)
        return getFavorable(steps, ratios)(amount);
      else return 0;
    },
    [isSuccess, ratios, steps]
  );

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
            {/* <Text
              position={'absolute'}
              display={'inline-block'}
              minW={'max-content'}
              left="78px"
              top="4px"
              px={'10px'}
              color={'#A558C9'}
              background="#EDDEF4"
              borderRadius="10px 10px 10px 0px"
              zIndex={'99'}
              fontStyle="normal"
              fontWeight="500"
              fontSize="12px"
            >
              {t('Bonus')} {getBonus(amount)}
            </Text> */}
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
