import { Authority, QueryKey } from '@/consts';
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
import { closeHost, getHostStatus, openHost, checkPermission } from '@/api/bucket';
import { useMemo, useState } from 'react';
import { isArray } from 'lodash';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useToast } from '@/hooks/useToast';
import useSessionStore from '@/store/session';
import useEnvStore from '@/store/env';
import { useQuotaGuarded } from '@sealos/shared';
import { ResponseCode } from '@/types/response';
import ErrorModal from '../ErrorModal';

enum HostStatusType {
  Running,
  NotReady
}

export function HostStatus() {
  const { currentBucket } = useOssStore();
  const { t } = useTranslation(['common', 'bucket']);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { SystemEnv } = useEnvStore();
  const { session } = useSessionStore();
  const [errorModalState, setErrorModalState] = useState<{
    isOpen: boolean;
    errorCode?: number;
    errorMessage?: string;
  }>({
    isOpen: false
  });

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
    async (bucket: string) => {
      // Check permission first
      await checkPermission({ bucketName: bucket });
      // If permission check passes, then open host
      return openHost({ bucket });
    },
    {
      onSuccess() {
        queryClient.invalidateQueries([QueryKey.HostStatus]);
      },
      onError(error: any) {
        const errorCode = error?.code as ResponseCode;
        // Translate error message key to actual text
        const errorMsg = error?.message ? t(error.message as any) : t('openHostFailed');

        // Show ErrorModal for specific error codes
        if (
          errorCode === ResponseCode.BALANCE_NOT_ENOUGH ||
          errorCode === ResponseCode.FORBIDDEN_CREATE_APP
        ) {
          setErrorModalState({
            isOpen: true,
            errorCode: errorCode,
            errorMessage: errorMsg
          });
        } else {
          // Show toast for other errors
          toast({
            title: t('openHostFailed'),
            description: errorMsg,
            status: 'error'
          });
        }
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

  const handleOpenHosting = useQuotaGuarded(
    {
      requirements: {
        cpu: SystemEnv.HOSTING_POD_CPU_REQUIREMENT,
        memory: SystemEnv.HOSTING_POD_MEMORY_REQUIREMENT,
        traffic: true
      },
      immediate: false,
      allowContinue: false
    },
    () => {
      currentBucket?.name && openMutate(currentBucket?.name);
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
        <HStack onClick={handleOpenHosting} cursor={'pointer'}>
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
                  const temp = { appName: name };
                  const tempFormDataStr = encodeURIComponent(JSON.stringify(temp));
                  sealosApp.runEvents('openDesktopApp', {
                    appKey: 'system-applaunchpad',
                    pathname: '/redirect',
                    query: { formData: tempFormDataStr },
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
      <ErrorModal
        isOpen={errorModalState.isOpen}
        onClose={() => setErrorModalState({ isOpen: false })}
        errorCode={errorModalState.errorCode}
        errorMessage={errorModalState.errorMessage}
      />
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
