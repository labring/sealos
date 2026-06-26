import MyIcon from '@/components/Icon';
import { checkPublicDomain } from '@/api/platform';
import { MySelect } from '@sealos/ui';
import { APPLICATION_PROTOCOLS, ProtocolList } from '@/constants/app';
import {
  CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED,
  DISABLE_HTTPS,
  DOMAIN_PORT,
  HTTP_PORT,
  SEALOS_DOMAIN
} from '@/store/static';
import { useTranslation } from 'next-i18next';
import { customAlphabet } from 'nanoid';
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  Switch,
  Tooltip,
  useTheme
} from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppEditType } from '@/types/app';
import RouteRulesModal from './RouteRulesModal';
import { useCopyData } from '@/utils/tools';
import { buildExternalUrl, getExternalProtocol } from '@/utils/network-url';
import { syncDefaultRouteServicePort } from '@/utils/network-routes';
import type { CustomAccessModalParams } from './CustomAccessModal';
import dynamic from 'next/dynamic';
import {
  PUBLIC_DOMAIN_PREFIX_MAX_LENGTH,
  PUBLIC_DOMAIN_PREFIX_MIN_LENGTH,
  PublicDomainConflictOwner,
  getDuplicateManagedPublicDomainHosts,
  normalizePublicDomainPrefix,
  validatePublicDomainPrefix
} from '@/utils/public-domain';

const CustomAccessModal = dynamic(() => import('./CustomAccessModal'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const getPublicDomainPrefixErrorMessage = (
  t: ReturnType<typeof useTranslation>['t'],
  reason: 'format' | 'reserved' | 'conflict' | 'duplicate',
  conflictOwner?: PublicDomainConflictOwner
) => {
  if (reason === 'duplicate') {
    return (
      t('public_domain_prefix_duplicate_error') ||
      'This public address prefix is duplicated in this app. Please choose another one.'
    );
  }

  if (reason === 'conflict') {
    if (conflictOwner) {
      return (
        t('public_domain_prefix_conflict_owner_error', {
          type: conflictOwner.displayType,
          name: conflictOwner.displayName
        }) ||
        `This public address prefix is already used by ${conflictOwner.displayType} "${conflictOwner.displayName}" in this workspace.`
      );
    }

    return (
      t('public_domain_prefix_conflict_error') ||
      'This public address prefix is already in use. Please choose another one.'
    );
  }

  if (reason === 'reserved') {
    return (
      t('public_domain_prefix_reserved_error') ||
      'This public address prefix is reserved. Please choose another one.'
    );
  }

  return (
    t('public_domain_prefix_format_error', {
      min: PUBLIC_DOMAIN_PREFIX_MIN_LENGTH,
      max: PUBLIC_DOMAIN_PREFIX_MAX_LENGTH
    }) ||
    `Use ${PUBLIC_DOMAIN_PREFIX_MIN_LENGTH}-${PUBLIC_DOMAIN_PREFIX_MAX_LENGTH} lowercase letters, numbers, or hyphens. It cannot start or end with a hyphen.`
  );
};

const getConflictOwnerFromError = (error: any): PublicDomainConflictOwner | undefined => {
  return error?.error?.conflictOwner;
};

function PublicDomainPrefixInput({
  value,
  errorMessage,
  onDraftChange,
  onStartEdit,
  onCommit
}: {
  value: string;
  errorMessage?: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCommit: (value: string) => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const lastCommittedValueRef = useRef(value);
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
      lastCommittedValueRef.current = value;
    }
  }, [isFocused, value]);

  const commitDraft = useCallback(async () => {
    const committedValue = await onCommit(draft);
    if (committedValue) {
      lastCommittedValueRef.current = committedValue;
    }
    return committedValue;
  }, [draft, onCommit]);

  return (
    <Tooltip label={t('public_domain_prefix_edit_tooltip')}>
      <Box
        position={'relative'}
        h={'30px'}
        w={'164px'}
        flexShrink={0}
        border={0}
        borderRight={'1px solid'}
        borderColor={'grayModern.200'}
        bg={'white'}
        _hover={{
          '& .public-domain-prefix-edit-icon': {
            opacity: 1
          }
        }}
      >
        <Input
          aria-label={t('public_domain_prefix_input_label') || 'Public address prefix'}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          h={'30px'}
          w={'100%'}
          border={0}
          borderRadius={0}
          bg={'transparent'}
          pl={3}
          pr={'30px'}
          {...fieldInputStyles}
          cursor={'text'}
          userSelect={'text'}
          value={draft}
          maxLength={PUBLIC_DOMAIN_PREFIX_MAX_LENGTH}
          placeholder={t('public_domain_prefix_placeholder') || 'Edit prefix'}
          isInvalid={!!errorMessage && !isFocused}
          _placeholder={{
            color: 'grayModern.500'
          }}
          _focusVisible={{
            boxShadow: 'inset 0 0 0 1px #219BF4'
          }}
          _invalid={{
            boxShadow: 'inset 0 0 0 1px #E53E3E'
          }}
          onFocus={() => {
            setIsFocused(true);
            onStartEdit();
          }}
          onBlur={() => {
            setIsFocused(false);
            if (skipNextBlurCommitRef.current) {
              skipNextBlurCommitRef.current = false;
              return;
            }
            void commitDraft();
          }}
          onChange={(e) => {
            const nextValue = e.target.value;
            setDraft(nextValue);
            onDraftChange(nextValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              void commitDraft();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(lastCommittedValueRef.current);
              onDraftChange(lastCommittedValueRef.current);
              skipNextBlurCommitRef.current = true;
              e.currentTarget.blur();
            }
          }}
        />
        <MyIcon
          className="public-domain-prefix-edit-icon"
          name={'edit'}
          position={'absolute'}
          right={'10px'}
          top={'50%'}
          transform={'translateY(-50%)'}
          w={'13px'}
          color={isFocused ? 'brightBlue.600' : 'grayModern.500'}
          opacity={isFocused ? 1 : 0.72}
          pointerEvents={'none'}
        />
      </Box>
    </Tooltip>
  );
}

type NetworkAction =
  | { type: 'ADD_PORT'; payload: AppEditType['networks'][0] }
  | { type: 'REMOVE_PORT'; payload: { index: number } }
  | { type: 'ENABLE_EXTERNAL_ACCESS'; payload: { index: number } }
  | { type: 'DISABLE_EXTERNAL_ACCESS'; payload: { index: number } }
  | { type: 'UPDATE_PROTOCOL'; payload: { index: number; protocol: string } }
  | { type: 'UPDATE_CUSTOM_DOMAIN'; payload: { index: number; customDomain: string } }
  | {
      type: 'UPDATE_ROUTES';
      payload: {
        index: number;
        routes: NonNullable<AppEditType['networks'][0]['routes']>;
      };
    };

interface NetworkSectionProps {
  formHook: UseFormReturn<AppEditType, any>;
  onDomainVerified?: (params: { index: number; customDomain: string }) => void;
  boxStyles: any;
  headerStyles: any;
}

const createDefaultRoute = (
  port: number
): NonNullable<AppEditType['networks'][0]['routes']>[0] => ({
  path: '/',
  pathType: 'Prefix',
  serviceName: '',
  servicePort: port
});

const withDefaultRoutes = (network: AppEditType['networks'][0]): AppEditType['networks'][0] => ({
  ...network,
  routes: network.routes?.length ? network.routes : [createDefaultRoute(network.port)]
});

const getNextAvailablePort = (networks: AppEditType['networks']) => {
  const usedPorts = new Set(networks.map((network) => Number(network.port)).filter(Boolean));

  for (let port = 80; port <= 65535; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }

  return 80;
};

const getBackendServiceValue = (serviceName = '', servicePort?: number) =>
  `${serviceName}:${servicePort || ''}`;

const fieldLabelStyles = {
  mb: '9px',
  h: '16px',
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: 500,
  letterSpacing: '0.5px',
  color: 'grayModern.900'
};

const fieldInputStyles = {
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: 400,
  letterSpacing: '0.048px',
  color: 'grayModern.900'
};

const actionButtonStyles = {
  h: '32px',
  px: '14px',
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 500,
  letterSpacing: '0.1px',
  color: 'grayModern.600',
  borderColor: 'grayModern.250',
  bg: 'white',
  boxShadow: '0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
};

export function NetworkSection({
  formHook,
  onDomainVerified,
  boxStyles,
  headerStyles
}: NetworkSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyData } = useCopyData();
  const [routeRulesIndex, setRouteRulesIndex] = useState<number>();
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();
  const publicDomainCheckSeqRef = useRef<Record<number, number>>({});
  const publicDomainDraftCheckTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const {
    register,
    control,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors }
  } = formHook;
  const watchedNetworks = useWatch({ control, name: 'networks' });
  const previousNetworkPortsRef = useRef<Record<string, number>>({});
  const clearPublicDomainErrorByIndex = useCallback(
    (index: number) => {
      clearErrors(`networks.${index}.publicDomain`);
    },
    [clearErrors]
  );

  const {
    fields: networks,
    append: appendNetworks,
    remove: removeNetworks,
    update: updateNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  });

  useEffect(() => {
    if (!watchedNetworks?.length) {
      previousNetworkPortsRef.current = {};
      return;
    }

    const previousPorts = previousNetworkPortsRef.current;
    const nextPorts: Record<string, number> = {};

    watchedNetworks.forEach((network, index) => {
      const networkKey = network.portName || network.networkName || String(index);
      const nextPort = Number(network.port);
      const previousPort = previousPorts[networkKey];

      if (nextPort) {
        nextPorts[networkKey] = nextPort;
      } else if (previousPort) {
        nextPorts[networkKey] = previousPort;
      }

      if (!previousPort || !nextPort || previousPort === nextPort) {
        return;
      }

      const syncedRoutes = syncDefaultRouteServicePort({
        routes: network.routes,
        previousPort,
        nextPort,
        networkServiceName: network.serviceName
      });

      if (syncedRoutes !== network.routes) {
        setValue(`networks.${index}.routes`, syncedRoutes, {
          shouldDirty: true
        });
      }
    });

    previousNetworkPortsRef.current = nextPorts;
  }, [setValue, watchedNetworks]);

  const dispatch = useCallback(
    (action: NetworkAction) => {
      const currentNetworks = getValues('networks');

      switch (action.type) {
        case 'ADD_PORT':
          appendNetworks(withDefaultRoutes(action.payload));
          break;

        case 'REMOVE_PORT': {
          const { index } = action.payload;
          if (currentNetworks.length > 1 && index >= 0 && index < currentNetworks.length) {
            clearPublicDomainErrorByIndex(index);
            removeNetworks(index);
          }
          break;
        }

        case 'ENABLE_EXTERNAL_ACCESS': {
          const { index } = action.payload;
          const currentNetwork = currentNetworks[index];

          updateNetworks(
            index,
            withDefaultRoutes({
              ...currentNetwork,
              serviceName: '',
              networkName: currentNetwork.networkName || `network-${nanoid()}`,
              protocol: 'TCP',
              appProtocol: currentNetwork.appProtocol || 'HTTP',
              openPublicDomain: true,
              openNodePort: false,
              publicDomain: currentNetwork.publicDomain || nanoid(),
              domain: currentNetwork.domain || SEALOS_DOMAIN,
              nodePort: undefined
            })
          );
          break;
        }

        case 'DISABLE_EXTERNAL_ACCESS': {
          const { index } = action.payload;
          clearPublicDomainErrorByIndex(index);
          updateNetworks(index, {
            ...currentNetworks[index],
            serviceName: '',
            openPublicDomain: false,
            openNodePort: false,
            customDomain: '',
            nodePort: undefined
          });
          break;
        }

        case 'UPDATE_PROTOCOL': {
          const { index, protocol } = action.payload;
          const currentNetwork = currentNetworks[index];

          if (APPLICATION_PROTOCOLS.includes(protocol as any)) {
            updateNetworks(
              index,
              withDefaultRoutes({
                ...currentNetwork,
                serviceName: '',
                protocol: 'TCP',
                appProtocol: protocol as any,
                openNodePort: false,
                openPublicDomain: true,
                networkName: currentNetwork.networkName || `network-${nanoid()}`,
                publicDomain: currentNetwork.publicDomain || nanoid(),
                domain: currentNetwork.domain || SEALOS_DOMAIN,
                nodePort: undefined
              })
            );
          } else {
            clearPublicDomainErrorByIndex(index);
            updateNetworks(
              index,
              withDefaultRoutes({
                ...currentNetwork,
                serviceName: '',
                protocol: protocol as any,
                appProtocol: undefined,
                openNodePort: true,
                openPublicDomain: false,
                customDomain: '',
                networkName: currentNetwork.networkName || `network-${nanoid()}`,
                domain: currentNetwork.domain || SEALOS_DOMAIN,
                nodePort: undefined
              })
            );
          }
          break;
        }

        case 'UPDATE_CUSTOM_DOMAIN': {
          const { index, customDomain } = action.payload;
          if (customDomain) {
            clearPublicDomainErrorByIndex(index);
          }
          updateNetworks(index, {
            ...currentNetworks[index],
            customDomain
          });
          break;
        }

        case 'UPDATE_ROUTES': {
          const { index, routes } = action.payload;
          updateNetworks(index, {
            ...currentNetworks[index],
            routes
          });
          break;
        }

        default:
          break;
      }
    },
    [getValues, appendNetworks, removeNetworks, updateNetworks, clearPublicDomainErrorByIndex]
  );

  const getPublicDomainFieldName = useCallback(
    (index: number) => `networks.${index}.publicDomain` as const,
    []
  );

  const setPublicDomainValidationError = useCallback(
    (
      index: number,
      reason: 'format' | 'reserved' | 'conflict' | 'duplicate',
      conflictOwner?: PublicDomainConflictOwner
    ) => {
      setError(getPublicDomainFieldName(index), {
        type: reason,
        message: getPublicDomainPrefixErrorMessage(t, reason, conflictOwner)
      });
    },
    [getPublicDomainFieldName, setError, t]
  );

  const clearPublicDomainValidationError = useCallback(
    (index: number) => {
      clearErrors(getPublicDomainFieldName(index));
    },
    [clearErrors, getPublicDomainFieldName]
  );

  const getPublicDomainValidationError = useCallback(
    (index: number) => {
      const message = (errors.networks as any)?.[index]?.publicDomain?.message;
      return typeof message === 'string' ? message : undefined;
    },
    [errors.networks]
  );

  const getPublicDomainValidationErrorType = useCallback(
    (index: number) => {
      const type = (errors.networks as any)?.[index]?.publicDomain?.type;
      return typeof type === 'string' ? type : undefined;
    },
    [errors.networks]
  );

  const hasManagedPublicDomainHostDuplicate = useCallback(
    (index: number, publicDomain: string, domain: string) => {
      const networks = getValues('networks').map((network, networkIndex) =>
        networkIndex === index
          ? {
              ...network,
              publicDomain,
              domain
            }
          : network
      );

      if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return false;

      return getDuplicateManagedPublicDomainHosts(networks, SEALOS_DOMAIN).some(({ indexes }) =>
        indexes.includes(index)
      );
    },
    [getValues]
  );

  const syncManagedPublicDomainHostDuplicateErrors = useCallback(
    (nextNetworks: AppEditType['networks']) => {
      if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return new Set<number>();

      const duplicateIndexes = new Set(
        getDuplicateManagedPublicDomainHosts(nextNetworks, SEALOS_DOMAIN).flatMap(
          ({ indexes }) => indexes
        )
      );
      const message = getPublicDomainPrefixErrorMessage(t, 'duplicate');

      nextNetworks.forEach((_, index) => {
        const currentErrorType = getPublicDomainValidationErrorType(index);

        if (duplicateIndexes.has(index)) {
          if (currentErrorType !== 'duplicate') {
            setError(getPublicDomainFieldName(index), {
              type: 'duplicate',
              message
            });
          }
          return;
        }

        if (currentErrorType === 'duplicate') {
          clearErrors(getPublicDomainFieldName(index));
        }
      });

      return duplicateIndexes;
    },
    [clearErrors, getPublicDomainFieldName, getPublicDomainValidationErrorType, setError, t]
  );

  useEffect(() => {
    if (watchedNetworks) {
      syncManagedPublicDomainHostDuplicateErrors(watchedNetworks);
    }
  }, [syncManagedPublicDomainHostDuplicateErrors, watchedNetworks]);

  const clearPublicDomainDraftCheckTimer = useCallback((index?: number) => {
    if (typeof index === 'number') {
      if (publicDomainDraftCheckTimerRef.current[index]) {
        clearTimeout(publicDomainDraftCheckTimerRef.current[index]);
        delete publicDomainDraftCheckTimerRef.current[index];
      }
      return;
    }

    Object.values(publicDomainDraftCheckTimerRef.current).forEach(clearTimeout);
    publicDomainDraftCheckTimerRef.current = {};
  }, []);

  useEffect(() => clearPublicDomainDraftCheckTimer, [clearPublicDomainDraftCheckTimer]);

  const isPublicDomainCheckCurrent = useCallback(
    (index: number, prefix: string, domain: string, checkSeq: number) => {
      const network = getValues(`networks.${index}`);

      return (
        checkSeq === publicDomainCheckSeqRef.current[index] &&
        !!network?.openPublicDomain &&
        !network.openNodePort &&
        !network.customDomain &&
        normalizePublicDomainPrefix(network.publicDomain) === prefix &&
        (network.domain || SEALOS_DOMAIN) === domain
      );
    },
    [getValues]
  );

  const commitPublicDomainDraft = useCallback(
    async (index: number, value: string, options: { commitValue?: boolean } = {}) => {
      const { commitValue = true } = options;
      clearPublicDomainDraftCheckTimer(index);

      if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) {
        const network = getValues(`networks.${index}`);
        const publicDomain = network?.publicDomain || nanoid();
        if (!network?.publicDomain) {
          setValue(getPublicDomainFieldName(index), publicDomain, {
            shouldDirty: true,
            shouldValidate: false
          });
        }
        clearPublicDomainValidationError(index);
        return publicDomain;
      }

      const result = validatePublicDomainPrefix(value);

      if (!result.valid) {
        setValue(getPublicDomainFieldName(index), value, {
          shouldDirty: true,
          shouldValidate: false
        });
        setPublicDomainValidationError(index, result.reason);
        return null;
      }

      const network = getValues(`networks.${index}`);
      const domain = network.domain || SEALOS_DOMAIN;
      if (hasManagedPublicDomainHostDuplicate(index, result.value, domain)) {
        setValue(getPublicDomainFieldName(index), commitValue ? result.value : value, {
          shouldDirty: true,
          shouldValidate: false
        });
        setPublicDomainValidationError(index, 'duplicate');
        return null;
      }

      const checkSeq = (publicDomainCheckSeqRef.current[index] || 0) + 1;
      publicDomainCheckSeqRef.current[index] = checkSeq;

      try {
        await checkPublicDomain({
          prefix: result.value,
          domain,
          appName: getValues('appName')
        });
      } catch (error: any) {
        if (!isPublicDomainCheckCurrent(index, result.value, domain, checkSeq)) return null;

        if (error?.error?.code === 'PUBLIC_DOMAIN_CONFLICT') {
          setPublicDomainValidationError(index, 'conflict', getConflictOwnerFromError(error));
          return null;
        }

        return result.value;
      }

      if (!isPublicDomainCheckCurrent(index, result.value, domain, checkSeq)) return null;

      clearPublicDomainValidationError(index);
      if (commitValue) {
        setValue(getPublicDomainFieldName(index), result.value, {
          shouldDirty: true,
          shouldValidate: false
        });
      }
      return result.value;
    },
    [
      clearPublicDomainDraftCheckTimer,
      clearPublicDomainValidationError,
      getPublicDomainFieldName,
      getValues,
      hasManagedPublicDomainHostDuplicate,
      isPublicDomainCheckCurrent,
      setPublicDomainValidationError,
      setValue
    ]
  );

  const schedulePublicDomainDraftCheck = useCallback(
    (index: number, value: string) => {
      if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return;

      clearPublicDomainDraftCheckTimer(index);
      publicDomainCheckSeqRef.current[index] = (publicDomainCheckSeqRef.current[index] || 0) + 1;
      publicDomainDraftCheckTimerRef.current[index] = setTimeout(() => {
        void commitPublicDomainDraft(index, value, { commitValue: false });
      }, 600);
    },
    [clearPublicDomainDraftCheckTimer, commitPublicDomainDraft]
  );

  const updatePublicDomainDraft = useCallback(
    (index: number, value: string) => {
      if (!CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED) return;

      setValue(getPublicDomainFieldName(index), value, {
        shouldDirty: true,
        shouldValidate: false
      });
      clearPublicDomainValidationError(index);
      const nextNetworks = getValues('networks').map((network, networkIndex) =>
        networkIndex === index
          ? {
              ...network,
              publicDomain: value
            }
          : network
      );
      syncManagedPublicDomainHostDuplicateErrors(nextNetworks);
      schedulePublicDomainDraftCheck(index, value);
    },
    [
      clearPublicDomainValidationError,
      getPublicDomainFieldName,
      getValues,
      schedulePublicDomainDraftCheck,
      syncManagedPublicDomainHostDuplicateErrors,
      setValue
    ]
  );

  const getServiceOptions = useCallback(() => {
    const currentForm = getValues();
    const currentServiceOptions = currentForm.networks.map((network) => ({
      label: network.serviceName
        ? `${network.serviceName}:${network.port}`
        : `${t('Main Service')}:${network.port}`,
      value: getBackendServiceValue(network.serviceName || '', network.port),
      serviceName: network.serviceName || '',
      servicePort: network.port
    }));
    const backendServiceOptions =
      currentForm.serviceList?.flatMap((service) =>
        service.ports.map((port) => ({
          label: `${service.name}:${port.port}`,
          value: getBackendServiceValue(service.name, port.port),
          serviceName: service.name,
          servicePort: port.port
        }))
      ) || [];

    return [...currentServiceOptions, ...backendServiceOptions].filter(
      (option, index, list) => list.findIndex((item) => item.value === option.value) === index
    );
  }, [getValues, t]);

  const getDomainDisplay = useCallback(
    (network: AppEditType['networks'][number]) => {
      if (network.customDomain) {
        return buildExternalUrl({
          protocol: network.appProtocol,
          host: network.customDomain,
          config: {
            disableHttps: DISABLE_HTTPS,
            cloudPort: DOMAIN_PORT,
            httpPort: HTTP_PORT
          }
        });
      }

      if (network.openNodePort) {
        return network?.nodePort
          ? buildExternalUrl({
              protocol: network.protocol,
              host: `${network.protocol.toLowerCase()}.${network.domain}`,
              nodePort: network.nodePort
            })
          : `${getExternalProtocol(network.protocol)}://${network.protocol.toLowerCase()}.${
              network.domain
            }:${t('pending_to_allocated')}`;
      }

      return buildExternalUrl({
        protocol: network.appProtocol,
        host: `${network.publicDomain}.${network.domain}`,
        config: {
          disableHttps: DISABLE_HTTPS,
          cloudPort: DOMAIN_PORT,
          httpPort: HTTP_PORT
        }
      });
    },
    [t]
  );

  const getDomainHostDisplay = useCallback(
    (network: AppEditType['networks'][number]) => {
      if (network.customDomain) {
        return network.customDomain;
      }

      if (network.openNodePort) {
        const port = network?.nodePort || t('pending_to_allocated');
        return `${network.protocol.toLowerCase()}.${network.domain}:${port}`;
      }

      return `${network.publicDomain}.${network.domain}`;
    },
    [t]
  );

  const routeRulesNetwork =
    routeRulesIndex !== undefined ? getValues('networks')[routeRulesIndex] : undefined;

  return (
    <Box id={'network'} {...boxStyles}>
      <Box {...headerStyles}>
        <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
        {t('Network Configuration')}
      </Box>
      <Box px={'42px'} py={'24px'} userSelect={'none'}>
        {networks.map((field, i) => {
          const network = watchedNetworks?.[i] || field;
          const isExternalAccess = !!network.openPublicDomain || !!network.openNodePort;
          const canConfigureRouteRules = !!network.openPublicDomain && !network.openNodePort;
          const isPublicDomainPrefixVisible =
            CUSTOM_PUBLIC_DOMAIN_PREFIX_ENABLED &&
            network.openPublicDomain &&
            !network.openNodePort &&
            !network.customDomain;
          const publicDomainErrorMessage = isPublicDomainPrefixVisible
            ? getPublicDomainValidationError(i)
            : undefined;

          return (
            <Box
              key={field.id}
              w={'100%'}
              maxW={'100%'}
              _notLast={{ pb: 6, mb: 6, borderBottom: theme.borders.base }}
            >
              <Flex alignItems={'flex-start'}>
                <Box flex={'0 0 110px'}>
                  <Box {...fieldLabelStyles}>{t('Port')}</Box>
                  <Input
                    h={'32px'}
                    type={'number'}
                    w={'110px'}
                    bg={'grayModern.50'}
                    {...fieldInputStyles}
                    {...register(`networks.${i}.port`, {
                      required:
                        t('app.The container exposed port cannot be empty') ||
                        'The container exposed port cannot be empty',
                      valueAsNumber: true,
                      min: {
                        value: 1,
                        message: t('app.The minimum exposed port is 1')
                      },
                      max: {
                        value: 65535,
                        message: t('app.The maximum number of exposed ports is 65535')
                      },
                      validate: (value) => {
                        const currentPort = Number(value);
                        if (!currentPort) {
                          return true;
                        }

                        const isDuplicate = getValues('networks').some(
                          (item, index) => index !== i && Number(item.port) === currentPort
                        );

                        return isDuplicate ? t('app.The exposed port cannot be duplicated') : true;
                      }
                    })}
                  />
                </Box>

                <Box ml={'32px'} flex={isExternalAccess ? '1 1 auto' : '0 0 93px'} minW={0}>
                  <Box {...fieldLabelStyles}>{t('Public Access')}</Box>
                  <FormControl isInvalid={!!publicDomainErrorMessage}>
                    <Flex alignItems={'center'} h={'32px'} minW={0}>
                      <Switch
                        className="driver-deploy-network-switch"
                        size={'lg'}
                        isChecked={isExternalAccess}
                        mr={isExternalAccess ? '24px' : 0}
                        sx={{
                          lineHeight: 0,
                          '.chakra-switch__track': {
                            bg: 'grayModern.200',
                            transitionProperty:
                              'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
                            transitionDuration: '0.15s',
                            transitionTimingFunction: 'ease'
                          },
                          '.chakra-switch__thumb': {
                            bg: 'white',
                            boxShadow: '0px 1px 2px rgba(17, 24, 36, 0.16)',
                            transitionProperty: 'transform',
                            transitionDuration: '0.2s',
                            transitionTimingFunction: 'ease'
                          },
                          '.chakra-switch__input:checked + .chakra-switch__track': {
                            bg: 'grayModern.900'
                          }
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            dispatch({
                              type: 'ENABLE_EXTERNAL_ACCESS',
                              payload: { index: i }
                            });
                          } else {
                            dispatch({
                              type: 'DISABLE_EXTERNAL_ACCESS',
                              payload: { index: i }
                            });
                          }
                        }}
                      />

                      {isExternalAccess && (
                        <>
                          <Flex alignItems={'center'} flex={'1 1 0'} mr={'8px'} h={'32px'} minW={0}>
                            <MySelect
                              width={'90px'}
                              height={'32px'}
                              borderTopRightRadius={0}
                              borderBottomRightRadius={0}
                              fontSize={'12px'}
                              fontWeight={400}
                              lineHeight={'16px'}
                              letterSpacing={'0.048px'}
                              value={
                                network.openPublicDomain
                                  ? network.appProtocol
                                  : network.openNodePort
                                  ? network.protocol
                                  : 'HTTP'
                              }
                              list={ProtocolList}
                              onchange={(val: any) => {
                                dispatch({
                                  type: 'UPDATE_PROTOCOL',
                                  payload: {
                                    index: i,
                                    protocol: val
                                  }
                                });
                              }}
                            />
                            <Flex
                              alignItems={'center'}
                              h={'32px'}
                              flex={'1 1 0'}
                              minW={0}
                              bg={'grayModern.50'}
                              border={theme.borders.base}
                              borderLeft={0}
                              borderTopRightRadius={'md'}
                              borderBottomRightRadius={'md'}
                              overflow={'hidden'}
                            >
                              {isPublicDomainPrefixVisible ? (
                                <>
                                  <PublicDomainPrefixInput
                                    value={network.publicDomain}
                                    errorMessage={publicDomainErrorMessage}
                                    onDraftChange={(value) => updatePublicDomainDraft(i, value)}
                                    onStartEdit={() => clearPublicDomainValidationError(i)}
                                    onCommit={(value) => commitPublicDomainDraft(i, value)}
                                  />
                                  <Tooltip label={t('click_to_copy_tooltip')}>
                                    <Box
                                      h={'30px'}
                                      display={'flex'}
                                      alignItems={'center'}
                                      flex={'1 1 auto'}
                                      minW={0}
                                      px={'8px'}
                                      userSelect={'all'}
                                      className="textEllipsis"
                                      cursor={'pointer'}
                                      {...fieldInputStyles}
                                      onClick={() => {
                                        copyData(getDomainDisplay(network));
                                      }}
                                    >
                                      .{network.domain}
                                    </Box>
                                  </Tooltip>
                                </>
                              ) : (
                                <Tooltip label={t('click_to_copy_tooltip')}>
                                  <Box
                                    h={'30px'}
                                    display={'flex'}
                                    alignItems={'center'}
                                    flex={'1 1 auto'}
                                    minW={0}
                                    px={'12px'}
                                    userSelect={'all'}
                                    className="textEllipsis"
                                    cursor={'pointer'}
                                    {...fieldInputStyles}
                                    onClick={() => {
                                      copyData(getDomainDisplay(network));
                                    }}
                                  >
                                    {getDomainHostDisplay(network)}
                                  </Box>
                                </Tooltip>
                              )}

                              {network.openPublicDomain && !network.openNodePort && (
                                <Box
                                  flex={'0 0 auto'}
                                  px={'8px'}
                                  py={'4px'}
                                  fontSize={'11px'}
                                  lineHeight={'16px'}
                                  fontWeight={500}
                                  letterSpacing={'0.5px'}
                                  color={'brightBlue.600'}
                                  cursor={'pointer'}
                                  onClick={async () => {
                                    const publicDomain = network.customDomain
                                      ? network.publicDomain
                                      : await commitPublicDomainDraft(i, network.publicDomain);
                                    if (!publicDomain) return;
                                    setCustomAccessModalData({
                                      publicDomain,
                                      currentCustomDomain: network.customDomain,
                                      domain: network.domain
                                    });
                                  }}
                                >
                                  {t('bind_custom_domain')}
                                </Box>
                              )}
                              {/* keep a hidden field registered so customDomain remains part of form state */}
                              <Input
                                display={'none'}
                                flex={'1 1 auto'}
                                minW={0}
                                {...register(`networks.${i}.customDomain`)}
                              />
                            </Flex>
                          </Flex>
                          {canConfigureRouteRules && (
                            <Button
                              type={'button'}
                              w={'113px'}
                              minW={'113px'}
                              variant={'outline'}
                              {...actionButtonStyles}
                              onClick={() => setRouteRulesIndex(i)}
                            >
                              {t('Configure Route Rules')}
                            </Button>
                          )}
                          {networks.length > 1 && (
                            <IconButton
                              ml={2}
                              height={'32px'}
                              width={'32px'}
                              minW={'32px'}
                              aria-label={t('Delete')}
                              variant={'outline'}
                              bg={'#FFF'}
                              _hover={{
                                color: 'red.600',
                                bg: 'rgba(17, 24, 36, 0.05)'
                              }}
                              icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                              onClick={() =>
                                dispatch({ type: 'REMOVE_PORT', payload: { index: i } })
                              }
                            />
                          )}
                        </>
                      )}
                    </Flex>
                    <FormErrorMessage mt={1} fontSize={'12px'}>
                      {publicDomainErrorMessage}
                    </FormErrorMessage>
                  </FormControl>
                </Box>
              </Flex>
            </Box>
          );
        })}

        <Button
          type={'button'}
          mt={6}
          variant={'outline'}
          {...actionButtonStyles}
          leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
          onClick={() => {
            const currentNetworks = getValues('networks');
            const port = getNextAvailablePort(currentNetworks);

            dispatch({
              type: 'ADD_PORT',
              payload: {
                networkName: `network-${nanoid()}`,
                portName: nanoid(),
                port,
                protocol: 'TCP',
                appProtocol: 'HTTP',
                openPublicDomain: true,
                publicDomain: nanoid(),
                customDomain: '',
                domain: SEALOS_DOMAIN,
                openNodePort: false,
                nodePort: undefined,
                routes: [createDefaultRoute(port)]
              }
            });
          }}
        >
          {t('Add Network Port')}
        </Button>
      </Box>

      {routeRulesIndex !== undefined && routeRulesNetwork && (
        <RouteRulesModal
          network={routeRulesNetwork}
          serviceOptions={getServiceOptions()}
          onClose={() => setRouteRulesIndex(undefined)}
          onSave={(routes) => {
            dispatch({
              type: 'UPDATE_ROUTES',
              payload: {
                index: routeRulesIndex,
                routes
              }
            });
            setRouteRulesIndex(undefined);
          }}
        />
      )}

      {!!customAccessModalData && (
        <CustomAccessModal
          {...customAccessModalData}
          onClose={() => setCustomAccessModalData(undefined)}
          onSuccess={(customDomain) => {
            const index = getValues('networks').findIndex(
              (network) => network.publicDomain === customAccessModalData.publicDomain
            );
            if (index === -1) return;

            dispatch({
              type: 'UPDATE_CUSTOM_DOMAIN',
              payload: { index, customDomain }
            });
            onDomainVerified?.({ index, customDomain });
          }}
        />
      )}
    </Box>
  );
}

export default NetworkSection;
