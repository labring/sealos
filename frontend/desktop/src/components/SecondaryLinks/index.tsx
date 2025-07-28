import { useConfigStore } from '@/stores/config';
import useAppStore from '@/stores/app';
import { useGuideModalStore } from '@/stores/guideModal';
import {
  Box,
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
import { useCallback, useMemo } from 'react';
import { getAmount } from '@/api/auth';
import Decimal from 'decimal.js';
import { CurrencySymbol } from '@sealos/ui';
import { formatMoney } from '@/utils/format';
import useSessionStore from '@/stores/session';
import { MoreHorizontal } from 'lucide-react';

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

  const openCostCenterApp = () => {
    openDesktopApp({
      appKey: 'system-costcenter',
      pathname: '/'
    });
  };

  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!user,
    staleTime: 60 * 1000
  });

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
        {layoutConfig?.version === 'cn' && (
          <Center
            mr={'12px'}
            borderRadius={'8px'}
            bg={
              'linear-gradient(90deg, rgba(129, 203, 252, 0.12) 0%, rgba(81, 159, 245, 0.12) 100%)'
            }
            h={'36px'}
            px={'12px'}
            py={'8px'}
            color="#2563EB"
            fontSize={'14px'}
            fontWeight={'500'}
            cursor={'pointer'}
            onClick={openCostCenterApp}
          >
            <Text>{t('common:balance')}</Text>
            <Divider orientation="vertical" mx={'12px'} />
            <CurrencySymbol />
            <Text ml={'4px'}>{formatMoney(balance).toFixed(2)}</Text>
          </Center>
        )}

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
        {layoutConfig?.version === 'cn' && (
          <>
            <MenuItem
              borderRadius="8px"
              _hover={{ bg: 'rgba(129, 203, 252, 0.12)' }}
              onClick={openCostCenterApp}
              bg={
                'linear-gradient(90deg, rgba(129, 203, 252, 0.12) 0%, rgba(81, 159, 245, 0.12) 100%)'
              }
              color="#2563EB"
              fontSize="14px"
              fontWeight="500"
              justifyContent="center"
            >
              <Flex height={'16px'} alignItems="center" my="8px" px="12px">
                <Text>{t('common:balance')}</Text>
                <Divider orientation="vertical" mx="8px" />
                <CurrencySymbol />
                <Text ml="4px">{formatMoney(balance).toFixed(2)}</Text>
              </Flex>
            </MenuItem>

            <Divider my="8px" mx="-8px" w="calc(100% + 16px)" bg="rgba(0, 0, 0, 0.1)" />
          </>
        )}

        <MenuItem
          py="8px"
          px="12px"
          borderRadius="8px"
          _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          onClick={handleGuideClick}
          fontSize="14px"
          fontWeight="500"
        >
          {t('common:guide')}
        </MenuItem>

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
      </MenuList>
    </Menu>
  );
}
