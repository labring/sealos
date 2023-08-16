import request from '@/service/request';
import useSessionStore from '@/stores/session';
import { displayMoney, formatMoney } from '@/utils/format';
import { Box, Button, Flex, Image, Img, Stack, Text } from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './user.module.scss';

import { useTranslation } from 'next-i18next';
import { memo, useContext, useEffect, useMemo, useRef } from 'react';
import { ApiResp } from '@/types/api';
import jsyaml from 'js-yaml';
import RechargeModal from './RechargeModal';
import TransferModal from './TransferModal';
import useEnvStore from '@/stores/env';
import CurrencySymbol from '@/components/CurrencySymbol';
import useOverviewStore from '@/stores/overview';
import { RechargeContext } from '@/pages/cost_overview';
export default memo(function UserCard() {
  const getSession = useSessionStore((state) => state.getSession);
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const rechargeSource = useOverviewStore((s) => s.rechargeSource);
  const setRechargeSource = useOverviewStore((s) => s.setRecharge);
  const { kubeconfig } = getSession();
  const k8s_username = useMemo(() => {
    try {
      let temp = jsyaml.load(kubeconfig);
      // @ts-ignore
      return temp?.users[0]?.name;
    } catch (error) {
      return '';
    }
  }, [kubeconfig]);
  const { t } = useTranslation();
  const session = useSessionStore().getSession();
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () =>
      request<any, ApiResp<{ deductionBalance: number; balance: number }>>('/api/account/getAmount')
  });
  const rechargeRef = useContext(RechargeContext).rechargeRef;
  const transferRef = useRef<any>();
  const queryClient = useQueryClient();
  useEffect(() => {
    // 加锁
    // let timeout = -1 as any
    if (rechargeRef?.current && rechargeSource > 0) {
      setRechargeSource(rechargeSource - 1);
      rechargeRef?.current?.onOpen();
    }
  }, [rechargeRef?.current, rechargeSource]);
  let real_balance = balance_raw?.data?.balance || 0;
  if (balance_raw?.data?.deductionBalance) {
    real_balance -= balance_raw?.data.deductionBalance;
  }
  const currency = useEnvStore((s) => s.currency);
  const balance = real_balance;
  const stripePromise = useEnvStore((s) => s.stripePromise);
  return (
    <>
      <Flex
        className={styles.userCard}
        boxShadow={'0 4px #BCBFC3,0 8px #DFE2E6'}
        pt="13px"
        pb={'19px'}
        mb={'34px'}
        px="16px"
        shrink={[1, 1, 1, 0]}
      >
        <Stack zIndex="2" flex={'1'} gap="0">
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
          <Flex fontSize="24px" fontWeight="500" alignSelf={'center'} mt="3px !important">
            <CurrencySymbol color={'white'} w="20px" type={currency} />
            <Text ml="6px">{displayMoney(formatMoney(balance))}</Text>
          </Flex>
          <Flex alignItems="center" alignSelf={'center'} gap="10px" mt={'20px !important'}>
            {transferEnabled && (
              <Button
                w="78px"
                h="32px"
                bg={'white'}
                color="black"
                onClick={(e) => {
                  e.preventDefault();
                  transferRef?.current!.onOpen();
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
                  rechargeRef?.current!.onOpen();
                }}
              >
                {t('Charge')}
              </Button>
            )}
          </Flex>
        </Stack>
      </Flex>
      {
        <RechargeModal
          ref={rechargeRef}
          balance={balance}
          stripePromise={stripePromise}
          request={request}
          onPaySuccess={async () => {
            await new Promise((s) => setTimeout(s, 2000));
            await queryClient.invalidateQueries({ queryKey: ['billing'] });
            await queryClient.invalidateQueries({ queryKey: ['getAccount'] });
          }}
        />
      }
      {transferEnabled && (
        <TransferModal
          ref={transferRef}
          balance={balance}
          onTransferSuccess={async () => {
            await new Promise((s) => setTimeout(s, 2000));
            await queryClient.invalidateQueries({ queryKey: ['billing'] });
            await queryClient.invalidateQueries({ queryKey: ['getAccount'] });
          }}
          k8s_username={k8s_username}
        />
      )}
    </>
  );
});
