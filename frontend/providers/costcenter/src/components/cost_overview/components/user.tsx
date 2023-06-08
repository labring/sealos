/* eslint-disable @next/next/no-img-element */
import useRecharge from '@/hooks/useRecharge';
import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { formatMoney } from '@/utils/format';
import { Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './user.module.scss';

import useNotEnough from '@/hooks/useNotEnough';
import { useEffect, lazy, useState } from 'react';
import useOverviewStore from '@/stores/overview';
import { useTranslation } from 'next-i18next';

export default function UserCard() {
  const { t } = useTranslation();
  const session = useSessionStore().getSession();
  const balance = useOverviewStore((state) => state.balance);
  const setBalance = useOverviewStore((state) => state.setBalance);
  const setReccharge = useOverviewStore((state) => state.setRecharge);
  const rechargeOpen = () => setReccharge(true);
  const { RechargeModal } = useRecharge();
  const { data } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () => request('/api/account/getAmount'),
    onSuccess(data) {
      let real_balance = data?.data?.balance || 0;
      if (data?.data?.deductionBalance) {
        real_balance -= data?.data.deductionBalance;
      }
      setBalance(real_balance);
    }
  });

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
              src={
                session?.user?.avatar
              }
              fallbackSrc='/sealos.svg'
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
              ¥ {formatMoney(balance)}
            </Text>
            <Button ml="auto" w="78px" h="32px" bg={'white'} color="black" onClick={rechargeOpen}>
              {t('Charge')}
            </Button>
          </Flex>
        </Box>
      </Flex>
      <RechargeModal />
    </>
  );
}
