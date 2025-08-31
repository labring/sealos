import {
  Box,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  HStack,
  Badge,
  Button,
  Flex
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { getPlanInfo } from '@/api/auth';

interface BalancePopoverProps {
  openCostCenterApp: () => void;
  children: React.ReactNode;
}

export function BalancePopover({ openCostCenterApp, children }: BalancePopoverProps) {
  const { session } = useSessionStore();

  const workspace = session?.user?.ns_uid || '';

  // const { data: subscriptionInfo } = useQuery({
  //   queryKey: ['planInfo', workspace],
  //   queryFn: () => getPlanInfo(workspace),
  //   enabled: !!workspace,
  //   staleTime: 5 * 60 * 1000 // 5 minutes
  // });

  const mockInfo = {
    data: {
      subscription: {
        ID: 'mock-id',
        PlanName: 'hobby',
        Workspace: workspace,
        RegionDomain: 'sealos.io',
        UserUID: 'user-123',
        Status: 'Normal',
        PayStatus: 'Active',
        PayMethod: 'BALANCE',
        Stripe: null,
        TrafficStatus: 'Normal',
        CurrentPeriodStartAt: '2024-01-01T00:00:00Z',
        CurrentPeriodEndAt: '2024-02-01T00:00:00Z',
        CancelAtPeriodEnd: false,
        CancelAt: '',
        CreateAt: '2024-01-01T00:00:00Z',
        UpdateAt: '2024-01-01T00:00:00Z',
        ExpireAt: '2024-09-14T00:00:00Z',
        Traffic: null,
        type: 'PAYG' as const
      }
    }
  };

  const subscription = mockInfo?.data?.subscription;

  const getPlanBackground = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('hobby')) return 'var(--background-image-plan-hobby)';
    if (name.includes('starter')) return 'var(--background-image-plan-starter)';
    if (name.includes('pro')) return 'var(--background-image-plan-pro)';
    if (name.includes('team')) return 'var(--background-image-plan-team)';
    if (name.includes('enterprise')) return 'var(--background-image-plan-enterprise)';
    return 'var(--background-image-plan-payg)';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Popover trigger="hover" isOpen placement="bottom-start">
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        w="300px"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="12px"
        shadow="lg"
      >
        <PopoverBody p={4}>
          <VStack spacing={3} align="stretch">
            <Box
              p={'20px'}
              bg={getPlanBackground(subscription?.PlanName || 'payg')}
              borderRadius="12px"
            >
              {subscription?.PlanName && subscription.PlanName !== 'Free' ? (
                <>
                  {/* Plan Name */}
                  <span className="text-base font-semibold">{subscription.PlanName} Plan</span>

                  <HStack>
                    <span className="text-sm text-zinc-600">Renewal Date:</span>
                    <span className="text-sm text-zinc-600">
                      {formatDate(subscription?.CurrentPeriodEndAt)}
                    </span>
                  </HStack>
                </>
              ) : (
                <>
                  {/* Free Plan */}
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Free Plan
                    </Text>
                    <Badge colorScheme="orange" variant="subtle" borderRadius="full" px={3} py={1}>
                      Limited Trial
                    </Badge>
                  </HStack>

                  <Box>
                    <Text fontSize="sm" color="gray.700">
                      Your trial will expire in 14 days. Upgrade to keep your services online.
                    </Text>
                  </Box>
                </>
              )}
            </Box>

            <div className="text-sm text-zinc-900 font-normal">
              To upgrade your plan, you can visit the Cost Center.
            </div>

            <Button
              size="sm"
              colorScheme="blue"
              leftIcon={<span>✨</span>}
              onClick={openCostCenterApp}
            >
              Upgrade Plan
            </Button>

            <HStack pt={2} borderTop="1px solid" borderColor="gray.100">
              <Flex
                justifyContent={'space-between'}
                px={'0px'}
                w={'100%'}
                cursor={'pointer'}
                fontSize={'14px'}
                fontWeight={400}
                onClick={openCostCenterApp}
              >
                <Text>Check more details in Cost Center</Text>
                <Text>→</Text>
              </Flex>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
