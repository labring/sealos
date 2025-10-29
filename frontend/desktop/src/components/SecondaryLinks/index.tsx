import { useConfigStore } from '@/stores/config';
import useAppStore from '@/stores/app';
import { useGuideModalStore } from '@/stores/guideModal';
import {
  Center,
  Divider,
  Flex,
  Text,
  useBreakpointValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getAmount } from '@/api/auth';
import Decimal from 'decimal.js';
import { CurrencySymbol } from '@sealos/ui';
import { formatMoney } from '@/utils/format';
import useSessionStore from '@/stores/session';
import { useSubscriptionStore } from '@/stores/subscription';
import { JoinDiscordPrompt } from '../account/JoinDiscordPrompt';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { BalancePopover, getPlanBackground } from '@/components/account/BalancePopover';
import { cn } from '@sealos/shadcn-ui';

const baseItemStyle = {
  minW: '36px',
  h: '40px',
  fontSize: '14px',
  fontWeight: '500',
  color: 'primary',
  _hover: {
    background: 'secondary'
  }
};

export default function SecondaryLinks() {
  const { layoutConfig } = useConfigStore();
  const { t } = useTranslation();
  const { openGuideModal, setInitGuide } = useGuideModalStore();
  const { openDesktopApp } = useAppStore();
  const { session } = useSessionStore();
  const currencySymbol = useConfigStore(
    (state) => state.layoutConfig?.currencySymbol || 'shellCoin'
  );
  const workspace = session?.user?.nsid || '';

  const user = session?.user;

  const isCollapsed = useBreakpointValue({
    base: true,
    lg: false
  });

  const openWorkOrderApp = () => {
    openDesktopApp({
      appKey: 'system-workorder',
      pathname: '/'
    });
  };

  const openCostCenterApp = (mode?: 'create' | 'upgrade' | 'topup') => {
    if (!mode) {
      openDesktopApp({
        appKey: 'system-costcenter',
        pathname: '/'
      });
    } else {
      openDesktopApp({
        appKey: 'system-costcenter',
        pathname: '/',
        query: {
          mode: mode
        },
        messageData: {
          type: 'InternalAppCall',
          mode: mode
        }
      });
    }
  };

  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!user,
    staleTime: 60 * 1000
  });

  const { subscriptionInfo, fetchSubscriptionInfo } = useSubscriptionStore();

  useMemo(() => {
    if (workspace) {
      fetchSubscriptionInfo(workspace);
    }
  }, [workspace, fetchSubscriptionInfo]);

  const balance = useMemo(() => {
    let realBalance = new Decimal(data?.data?.balance || 0);
    if (data?.data?.deductionBalance) {
      realBalance = realBalance.minus(new Decimal(data.data.deductionBalance));
    }
    return realBalance.toNumber();
  }, [data]);

  const handleGuideClick = () => {
    openGuideModal();
    setInitGuide(false);
  };

  const handleDocsClick = () => {
    if (layoutConfig?.common.docsUrl) {
      window.open(layoutConfig.common.docsUrl);
    }
  };

  if (!isCollapsed) {
    return (
      <Flex gap={'4px'} ml={'auto'}>
        <BalancePopover
          openCostCenterApp={() =>
            layoutConfig?.common.subscriptionEnabled
              ? openCostCenterApp('upgrade')
              : openCostCenterApp()
          }
          openCostCenterTopup={() => openCostCenterApp('topup')}
        >
          <Center
            mr={'12px'}
            borderRadius={'8px'}
            bg={getPlanBackground(subscriptionInfo?.subscription)}
            h={'36px'}
            px={'12px'}
            py={'8px'}
            color="#2563EB"
            fontSize={'14px'}
            fontWeight={'500'}
            cursor={'pointer'}
            onClick={() =>
              layoutConfig?.common.subscriptionEnabled
                ? openCostCenterApp('upgrade')
                : openCostCenterApp()
            }
          >
            {subscriptionInfo?.subscription?.type === 'PAYG' ? (
              <div className="flex items-center text-sm font-medium text-blue-600">
                <Center
                  mr={'8px'}
                  bg={'#34D399'}
                  w={'8px'}
                  h={'8px'}
                  borderRadius={'full'}
                ></Center>

                {!layoutConfig?.common.subscriptionEnabled && (
                  <>
                    <span>{t('common:nav_links.balance')}</span>
                    <Divider
                      orientation="vertical"
                      mx={'12px'}
                      borderColor={'rgba(0, 0, 0, 0.08)'}
                      height={'16px'}
                    />
                  </>
                )}

                <div
                  className={cn('flex justify-center', { 'mr-1': currencySymbol === 'shellCoin' })}
                >
                  <CurrencySymbol type={currencySymbol} />
                </div>
                <Text>{formatMoney(balance).toFixed(2)}</Text>

                {layoutConfig?.common.subscriptionEnabled && (
                  <>
                    <Divider
                      orientation="vertical"
                      mx={'12px'}
                      borderColor={'rgba(0, 0, 0, 0.08)'}
                      height={'16px'}
                    />
                    <span>{t('common:nav_links.subscribe')}</span>
                    <Sparkles className="ml-[2px]" size={16} />
                  </>
                )}
              </div>
            ) : (
              <>
                <Center
                  mr={'8px'}
                  bg={subscriptionInfo?.subscription?.Status === 'Debt' ? '#F87171' : '#34D399'}
                  w={'8px'}
                  h={'8px'}
                  borderRadius={'full'}
                ></Center>
                <Text textTransform="capitalize">
                  {subscriptionInfo?.subscription?.PlanName || 'Free'}{' '}
                  {t('common:nav_links.plan_suffix')}
                </Text>
                {subscriptionInfo?.subscription?.Status === 'Debt' && (
                  <div className="text-red-600 bg-red-100 font-medium text-sm px-2 py-1 rounded-full leading-3.5 ml-2">
                    {t('common:nav_links.plan_expired')}
                  </div>
                )}
                <Divider
                  orientation="vertical"
                  mx={'12px'}
                  borderColor={'rgba(0, 0, 0, 0.08)'}
                  height={'16px'}
                />
                <span>{t('common:nav_links.upgrade_plan')}</span>
                <Sparkles className="ml-[2px]" size={16} />
              </>
            )}
          </Center>
        </BalancePopover>

        <Center
          className="guide-button"
          cursor={'pointer'}
          {...baseItemStyle}
          px={'8px'}
          borderRadius={'8px'}
          onClick={handleGuideClick}
        >
          {t('common:guide')}
        </Center>

        {layoutConfig?.common.docsUrl && (
          <Center
            {...baseItemStyle}
            cursor={'pointer'}
            borderRadius={'8px'}
            px={'8px'}
            onClick={handleDocsClick}
          >
            {t('common:doc')}
          </Center>
        )}

        {layoutConfig?.version === 'cn' && (
          <Center
            cursor={'pointer'}
            {...baseItemStyle}
            px={'8px'}
            borderRadius={'8px'}
            border={'1px solid transparent'}
            onClick={openWorkOrderApp}
          >
            {t('v2:support')}
          </Center>
        )}

        {layoutConfig?.version === 'en' && (
          <JoinDiscordPrompt>
            <Center
              cursor={'pointer'}
              minW="36px"
              h="40px"
              fontSize="14px"
              fontWeight="500"
              color="primary"
              _hover={{
                background: 'secondary'
              }}
              px={'8px'}
              borderRadius={'8px'}
              border={'1px solid transparent'}
            >
              {t('v2:support')}
            </Center>
          </JoinDiscordPrompt>
        )}
      </Flex>
    );
  }

  return (
    <Menu>
      <MenuButton
        as={Center}
        {...baseItemStyle}
        tabIndex={0}
        boxSize={'36px'}
        cursor={'pointer'}
        borderRadius={'full'}
        border={'1px solid rgba(0, 0, 0, 0.05)'}
        px={'8px'}
      >
        <MoreHorizontal size={16} />
      </MenuButton>
      <MenuList
        p="8px"
        borderRadius="12px"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
        border="1px solid rgba(0, 0, 0, 0.05)"
        minW="200px"
      >
        <MenuItem
          borderRadius="8px"
          _hover={{ bg: 'rgba(129, 203, 252, 0.12)' }}
          bg={'linear-gradient(90deg, rgba(129, 203, 252, 0.12) 0%, rgba(81, 159, 245, 0.12) 100%)'}
          color="#2563EB"
          fontSize="14px"
          fontWeight="500"
          justifyContent="center"
          onClick={() => openCostCenterApp()}
        >
          <Flex height={'16px'} alignItems="center" my="8px" px="12px">
            <Text>{t('common:nav_links.balance')}</Text>
            <Divider orientation="vertical" mx="8px" />
            <CurrencySymbol type={currencySymbol} />
            <Text ml="4px">{formatMoney(balance).toFixed(2)}</Text>
          </Flex>
        </MenuItem>

        <Divider my="8px" mx="-8px" w="calc(100% + 16px)" bg="rgba(0, 0, 0, 0.1)" />

        {/* // [TODO] Guide is currently not compatible with narrow screen. */}
        {/* <MenuItem
          py="8px"
          px="12px"
          borderRadius="8px"
          _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          onClick={handleGuideClick}
          fontSize="14px"
          fontWeight="500"
        >
          {t('common:guide')}
        </MenuItem> */}

        {layoutConfig?.common.docsUrl && (
          <MenuItem
            py="8px"
            px="12px"
            borderRadius="8px"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
            onClick={handleDocsClick}
            fontSize="14px"
            fontWeight="500"
          >
            {t('common:doc')}
          </MenuItem>
        )}

        {layoutConfig?.version === 'cn' && (
          <MenuItem
            py="8px"
            px="12px"
            borderRadius="8px"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
            onClick={openWorkOrderApp}
            fontSize="14px"
            fontWeight="500"
          >
            {t('v2:support')}
          </MenuItem>
        )}

        {layoutConfig?.version === 'en' && (
          <JoinDiscordPrompt>
            <MenuItem
              py="8px"
              px="12px"
              borderRadius="8px"
              _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
              onClick={openWorkOrderApp}
              fontSize="14px"
              fontWeight="500"
            >
              {t('v2:support')}
            </MenuItem>
          </JoinDiscordPrompt>
        )}
      </MenuList>
    </Menu>
  );
}
