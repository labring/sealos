/* eslint-disable @next/next/no-img-element */
import useRecharge from '@/hooks/useRecharge';
import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { displayMoney, formatMoney } from '@/utils/format';
import { Box, Button, Flex, Image, Stack, Text } from '@chakra-ui/react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import styles from './user.module.scss';

import { useTranslation } from 'next-i18next';
import { useContext, useMemo } from 'react';
import { ApiResp } from '@/types/api';
import useTransfer from '@/hooks/useTransfer';
import { TradeEnableContext } from '@/pages/cost_overview';

export default function UserCard() {
  const { transferEnabled, rechargeEnabled } = useContext(TradeEnableContext);
  const { t } = useTranslation();
  const session = useSessionStore().getSession();
  const { data: balance_raw, refetch } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () =>
      request<any, ApiResp<{ deductionBalance: number; balance: number }>>('/api/account/getAmount')
  });
  const queryClient = new QueryClient();
  const { RechargeModal, onOpen } = useRecharge({
    onPaySuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'], exact: false });
      refetch();
    }
  });
  const { TransferModal, onOpen: transferOpen } = useTransfer({
    onTransferSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'], exact: false });
      refetch();
    }
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
        // aspectRatio={'2/1'}
        pt="13px"
        pb={'19px'}
        mb={'34px'}
        px="16px"
        shrink={[1, 1, 1, 0]}
      >
        <Stack zIndex="2" flex={'1'}>
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
          <Box fontSize="12px" fontWeight="400" alignSelf={'center'} mt="6px !important">
            {t('Balance')}
          </Box>
          <Box fontSize="24px" fontWeight="500" alignSelf={'center'} mt="3px !important">
            ¥ {displayMoney(formatMoney(balance))}
          </Box>
          <Flex alignItems="center" alignSelf={'center'} gap="10px" mt={'20px !important'}>
            {transferEnabled && (
              <Button
                w="78px"
                h="32px"
                bg={'white'}
                color="black"
                onClick={(e) => {
                  e.preventDefault();
                  transferOpen();
                }}
              >
                {t('Transfer')}
              </Button>
            )}
            {rechargeEnabled && (
              <Button
                w="78px"
                h="32px"
                bg={'white'}
                color="black"
                onClick={(e) => {
                  e.preventDefault();
                  onOpen();
                }}
              >
                {t('Charge')}
              </Button>
            )}
          </Flex>
        </Stack>
      </Flex>
      {rechargeEnabled && <RechargeModal balance={balance} />}
      {transferEnabled && <TransferModal balance={balance} />}
    </>
  );
}
