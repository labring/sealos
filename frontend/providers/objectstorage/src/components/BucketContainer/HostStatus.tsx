import { Authority, QueryKey } from '@/consts';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Circle,
  HStack,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text
} from '@chakra-ui/react';
import MoreIcon from '@/components/Icons/MoreIcon';
import { WebHostIcon } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOssStore } from '@/store/ossStore';
import { closeHost, getHostStatus, openHost } from '@/api/bucket';
import { useMemo } from 'react';
import { isArray } from 'lodash';
import { sealosApp } from 'sealos-desktop-sdk/app';

enum HostStatusType {
  Running,
  NotReady
}

export function HostStatus() {
  const router = useRouter();
  const { currentBucket } = useOssStore();
  const { t } = useTranslation(['common', 'bucket']);
  const queryClient = useQueryClient();
  const { data, isSuccess } = useQuery(
    [QueryKey.HostStatus, currentBucket?.name],
    () =>
      getHostStatus({
        bucket: currentBucket!.name
      }),
    {
      refetchInterval: 5 * 1000
    }
  );
  const onHosting = isSuccess && !!data?.length;
  const domain = useMemo(() => {
    if (!isArray(data)) return '';
    const ingress = data.find((x) => x.kind === 'Ingress');
    if (!ingress) return '';
    return ingress.spec.rules[0].host;
  }, [data]);
  const hostStatus =
    currentBucket?.policy === Authority.private ? HostStatusType.NotReady : HostStatusType.Running;
  const {
    data: OpenData,
    isSuccess: openIsSuccess,
    mutate: openMutate,
    isLoading: openLoading
  } = useMutation(
    [QueryKey.openHost, currentBucket?.name],
    (bucket: string) => openHost({ bucket }),
    {
      onSuccess() {
        queryClient.invalidateQueries([QueryKey.HostStatus]);
      }
    }
  );
  const {
    data: closeData,
    isSuccess: closeIsSuccess,
    mutate: closeMutate,
    isLoading: closeLoading
  } = useMutation(
    [QueryKey.closeHost, currentBucket?.name],
    (bucket: string) => closeHost({ bucket }),
    {
      onSuccess() {
        queryClient.invalidateQueries([QueryKey.HostStatus]);
      }
    }
  );
  return (
    <Box
      ml={'auto'}
      my={'auto'}
      pointerEvents={closeLoading || openLoading ? 'none' : 'initial'}
      fontSize={'12px'}
    >
      {!onHosting ? (
        <HStack
          onClick={() => {
            currentBucket?.name && openMutate(currentBucket?.name);
          }}
          cursor={'pointer'}
        >
          <WebHostIcon boxSize={'24px'} />
          <Text fontSize={'12px'}>{t('Enable Hosting')}</Text>
        </HStack>
      ) : (
        <HStack>
          <Box>
            {t('Current Domain')}:
            <Link href={`https://${domain}`} isExternal style={{ textDecoration: 'none' }}>
              {domain}
            </Link>
          </Box>
          <StatusTag hostStatus={hostStatus} />
          <Menu>
            <MenuButton
              as={IconButton}
              variant={'white-bg-icon'}
              icon={<MoreIcon w="16px" h="16px" color="grayIron.600" />}
              p="4px"
              onClick={(e) => e.stopPropagation()}
            >
              {currentBucket?.policy === Authority.private ? '?' : 'ok'}
            </MenuButton>
            <MenuList p="6px" minW={'85px'} fontSize={'12px'} onClick={(e) => e.stopPropagation()}>
              <MenuItem
                px="4px"
                py="6px"
                minW={'100px'}
                onClick={() => {
                  const name = `static-host-${currentBucket?.name}`;
                  sealosApp.runEvents('openDesktopApp', {
                    appKey: 'system-applaunchpad',
                    pathname: '/app/edit',
                    query: { name },
                    messageData: { type: 'InternalAppCall', name }
                  });
                }}
              >
                {t('Custom Domain')}
              </MenuItem>
              <MenuItem
                px="4px"
                py="6px"
                minW={'100px'}
                onClick={() => {
                  currentBucket?.name && closeMutate(currentBucket?.name);
                }}
              >
                {t('Disable Hosting')}
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      )}
    </Box>
  );
}

function StatusTag({ hostStatus }: { hostStatus: HostStatusType }) {
  const { t } = useTranslation('common');
  return hostStatus === HostStatusType.Running ? (
    <HStack gap={'4px'}>
      <Circle size={'6px'} bg={hostStatus === HostStatusType.Running ? '#00A9A6' : 'warn.600'} />
      <Text>{t('Effective')}</Text>
    </HStack>
  ) : (
    <HStack gap={'4px'}>
      <Circle size={'6px'} bg={'warn.600'} />
      <Text color={'warn.600'}>{t('Unable to Access')}</Text>
    </HStack>
  );
}
