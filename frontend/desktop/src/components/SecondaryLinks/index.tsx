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
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Portal,
  Progress
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getResource } from '@/api/platform';
import useSessionStore from '@/stores/session';
import { Activity, MoreHorizontal } from 'lucide-react';
import { JoinDiscordPrompt } from '../account/JoinDiscordPrompt';

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

type WorkspaceQuotaItem = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu' | 'traffic' | 'nodeport';
  used: number;
  limit: number;
  available: number;
  usagePercent: number;
};

const resourceDisplayOrder: WorkspaceQuotaItem['type'][] = [
  'cpu',
  'memory',
  'storage',
  'gpu',
  'nodeport'
];

const getAvailableValue = (item: WorkspaceQuotaItem) =>
  item.available ?? Math.max(item.limit - item.used, 0);

const formatQuotaValue = (value: number, type: WorkspaceQuotaItem['type']) => {
  if (type === 'gpu' || type === 'nodeport') return `${Math.round(value)}`;
  const digits = value > 0 && value < 10 ? 2 : 1;
  return value.toFixed(digits).replace(/\.?0+$/, '');
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

  const { data: resourceData, isLoading: isResourceLoading } = useQuery({
    queryKey: ['getResource', { userId: user?.userCrUid, workspaceId: user?.ns_uid }],
    queryFn: getResource,
    enabled: !!user,
    staleTime: 60 * 1000
  });

  const quotaItems = useMemo(() => {
    const items = resourceData?.data?.workspaceQuota || [];
    return resourceDisplayOrder.reduce<WorkspaceQuotaItem[]>((acc, type) => {
      const item = items.find((item) => item.type === type);
      if (item && (item.limit > 0 || item.used > 0)) acc.push(item);
      return acc;
    }, []);
  }, [resourceData?.data?.workspaceQuota]);

  const getQuotaUnit = (type: WorkspaceQuotaItem['type']) => {
    if (type === 'cpu') return 'C';
    if (type === 'memory' || type === 'storage') return 'GB';
    if (type === 'gpu') return t('common:resource_unit_card');
    return '';
  };

  const formatQuotaWithUnit = (item: WorkspaceQuotaItem, value: number) =>
    `${formatQuotaValue(value, item.type)}${getQuotaUnit(item.type)}`;

  const primaryQuota = quotaItems.find((item) => item.type === 'cpu') || quotaItems[0];
  const resourceSummary = primaryQuota
    ? `${t('common:resource_available')} ${formatQuotaWithUnit(
        primaryQuota,
        getAvailableValue(primaryQuota)
      )}`
    : isResourceLoading
      ? t('common:loading')
      : '--';

  const getQuotaLabel = (type: WorkspaceQuotaItem['type']) => {
    if (type === 'cpu') return 'CPU';
    if (type === 'memory') return t('common:memory');
    if (type === 'storage') return t('common:storage');
    if (type === 'gpu') return 'GPU';
    if (type === 'nodeport') return 'NodePort';
    return type;
  };

  const renderResourceRows = ({ showTitle = true }: { showTitle?: boolean } = {}) => (
    <Flex flexDirection="column" gap="12px" w="100%">
      {showTitle && (
        <Flex alignItems="center" justifyContent="space-between">
          <Text fontSize="13px" fontWeight={700} color="gray.900">
            {t('common:workspace_resources')}
          </Text>
          <Text fontSize="11px" color="gray.500">
            {t('common:resource_used')} / {t('common:resource_total')}
          </Text>
        </Flex>
      )}

      {quotaItems.length > 0 ? (
        quotaItems.map((item) => {
          const usagePercent =
            item.usagePercent ?? (item.limit > 0 ? Math.round((item.used / item.limit) * 100) : 0);
          const available = getAvailableValue(item);
          return (
            <Box key={item.type}>
              <Flex alignItems="center" justifyContent="space-between" gap="12px">
                <Text fontSize="12px" fontWeight={600} color="gray.700">
                  {getQuotaLabel(item.type)}
                </Text>
                <Text fontSize="12px" fontWeight={600} color="gray.900">
                  {formatQuotaWithUnit(item, item.used)} / {formatQuotaWithUnit(item, item.limit)}
                </Text>
              </Flex>
              <Progress
                mt="6px"
                value={usagePercent}
                size="xs"
                borderRadius="full"
                bg="rgba(37, 99, 235, 0.12)"
                colorScheme={usagePercent >= 85 ? 'red' : 'blue'}
              />
              <Flex mt="4px" alignItems="center" justifyContent="space-between">
                <Text fontSize="11px" color="gray.500">
                  {t('common:resource_available')}: {formatQuotaWithUnit(item, available)}
                </Text>
                <Text fontSize="11px" color="gray.500">
                  {usagePercent}%
                </Text>
              </Flex>
            </Box>
          );
        })
      ) : (
        <Text fontSize="12px" color="gray.500">
          {isResourceLoading ? t('common:loading') : t('common:resource_quota_empty')}
        </Text>
      )}
    </Flex>
  );

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
        <Popover trigger="hover" placement="bottom-end" openDelay={120}>
          <PopoverTrigger>
            <Center
              mr={'12px'}
              borderRadius={'8px'}
              bg={
                'linear-gradient(90deg, rgba(129, 203, 252, 0.12) 0%, rgba(81, 159, 245, 0.12) 100%)'
              }
              h={'36px'}
              minW="166px"
              maxW="220px"
              px={'12px'}
              py={'8px'}
              color="#2563EB"
              fontSize={'14px'}
              fontWeight={'500'}
              cursor={'default'}
            >
              <Activity size={16} />
              <Text ml="6px">{t('common:resources')}</Text>
              <Divider orientation="vertical" mx={'10px'} />
              <Text noOfLines={1}>{resourceSummary}</Text>
            </Center>
          </PopoverTrigger>
          <Portal>
            <PopoverContent
              w="320px"
              borderRadius="8px"
              boxShadow="0 12px 32px rgba(15, 23, 42, 0.16)"
            >
              <PopoverArrow />
              <PopoverBody p="14px">{renderResourceRows()}</PopoverBody>
            </PopoverContent>
          </Portal>
        </Popover>

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

        {layoutConfig?.common.workorderEnabled && (
          <Center
            cursor={'pointer'}
            {...baseItemStyle}
            px={'8px'}
            borderRadius={'8px'}
            border={'1px solid transparent'}
            onClick={openWorkOrderApp}
          >
            {t('v2:ticket')}
          </Center>
        )}

        {layoutConfig?.discordInviteLink && (
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
        <Box
          borderRadius="8px"
          bg={'linear-gradient(90deg, rgba(129, 203, 252, 0.12) 0%, rgba(81, 159, 245, 0.12) 100%)'}
          p="12px"
        >
          <Flex alignItems="center" justifyContent="space-between" color="#2563EB">
            <Flex alignItems="center" gap="6px" fontSize="14px" fontWeight={600}>
              <Activity size={16} />
              <Text>{t('common:resources')}</Text>
            </Flex>
            <Text fontSize="13px" fontWeight={600}>
              {resourceSummary}
            </Text>
          </Flex>
          <Box mt="12px">{renderResourceRows({ showTitle: false })}</Box>
        </Box>

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

        {layoutConfig?.common.workorderEnabled && (
          <MenuItem
            py="8px"
            px="12px"
            borderRadius="8px"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
            onClick={openWorkOrderApp}
            fontSize="14px"
            fontWeight="500"
          >
            {t('v2:ticket')}
          </MenuItem>
        )}

        {layoutConfig?.discordInviteLink && (
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
