/* eslint-disable @next/next/no-img-element */
import useRecharge from '@/hooks/useRecharge';
import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { displayMoney, formatMoney } from '@/utils/format';
import { Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import styles from './user.module.scss';

import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { ApiResp } from '@/types/api';

export default function UserCard() {
  const { t } = useTranslation();
  const session = useSessionStore().getSession();
  const { RechargeModal, onOpen } = useRecharge({});
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () =>
      request<any, ApiResp<{ deductionBalance: number; balance: number }>>('/api/account/getAmount')
  });
  const balance = useMemo(() => {
    let real_balance = balance_raw?.data?.balance || 0;
    if (balance_raw?.data?.deductionBalance) {
      real_balance -= balance_raw?.data.deductionBalance;
    }
    return real_balance;
  }, [balance_raw]);
  return (
    <>
      <Flex
        className={styles.userCard}
        boxShadow={'0 4px #BCBFC3,0 8px #DFE2E6'}
        aspectRatio={'2/1'}
        mb={'34px'}
        shrink={[1, 1, 1, 0]}
      >
        <Box zIndex="2" flex={'1'}>
          <Flex alignItems={'center'}>
            <Text>{session?.user?.name}</Text>

            <Image
              ml="auto"
              src={session?.user?.avatar}
              fallbackSrc="/sealos.svg"
              alt="user"
              width={'36px'}
              height={'36px'}
              className={styles.avatar}
            />
          </Flex>
          <Text fontSize="12px" fontWeight="400" mt="30px">
            {t('Balance')}
          </Text>
          <Flex alignItems="center">
            <Text fontSize="24px" fontWeight="500">
              ¥ {displayMoney(formatMoney(balance))}
            </Text>
            <Button ml="auto" w="78px" h="32px" bg={'white'} color="black" onClick={() => onOpen()}>
              {t('Charge')}
            </Button>
          </Flex>
        </Box>
      </Flex>
      <RechargeModal balance={balance} />
    </>
  );
}
