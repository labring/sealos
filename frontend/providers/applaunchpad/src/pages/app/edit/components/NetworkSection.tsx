import MyIcon from '@/components/Icon';
import { MySelect } from '@sealos/ui';
import { APPLICATION_PROTOCOLS, ProtocolList } from '@/constants/app';
import { DISABLE_HTTPS, DOMAIN_PORT, HTTP_PORT, SEALOS_DOMAIN } from '@/store/static';
import { useTranslation } from 'next-i18next';
import { customAlphabet } from 'nanoid';
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, Flex, IconButton, Input, Switch, Tooltip, useTheme } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppEditType } from '@/types/app';
import RouteRulesModal from './RouteRulesModal';
import { useCopyData } from '@/utils/tools';
import { buildExternalUrl, getExternalProtocol } from '@/utils/network-url';
import { syncDefaultRouteServicePort } from '@/utils/network-routes';
import type { CustomAccessModalParams } from './CustomAccessModal';
import dynamic from 'next/dynamic';

const CustomAccessModal = dynamic(() => import('./CustomAccessModal'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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

  const { register, control, getValues, setValue } = formHook;
  const watchedNetworks = useWatch({ control, name: 'networks' });
  const previousNetworkPortsRef = useRef<Record<string, number>>({});

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
    [getValues, appendNetworks, removeNetworks, updateNetworks]
  );

  const getServiceOptions = useCallback(() => {
    const currentForm = getValues();
    const serviceOptions =
      currentForm.serviceList
        ?.flatMap((service) =>
          service.ports.map((port) => ({
            label: `${service.name}:${port.port}`,
            value: getBackendServiceValue(service.name, port.port),
            serviceName: service.name,
            servicePort: port.port
          }))
        )
        .filter(
          (option, index, list) => list.findIndex((item) => item.value === option.value) === index
        ) || [];

    if (serviceOptions.length) {
      return serviceOptions;
    }

    return currentForm.networks.map((network) => ({
      label: `${t('Main Service')}:${network.port}`,
      value: getBackendServiceValue('', network.port),
      serviceName: '',
      servicePort: network.port
    }));
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

  const routeRulesNetwork =
    routeRulesIndex !== undefined ? getValues('networks')[routeRulesIndex] : undefined;

  return (
    <Box id={'network'} {...boxStyles}>
      <Box {...headerStyles}>
        <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
        {t('Network Configuration')}
      </Box>
      <Box px={'42px'} py={'24px'} userSelect={'none'}>
        {networks.map((network, i) => {
          const isExternalAccess = !!network.openPublicDomain || !!network.openNodePort;
          const canConfigureRouteRules = !!network.openPublicDomain && !network.openNodePort;

          return (
            <Box
              key={network.id}
              w={'697px'}
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
                        <Flex alignItems={'center'} w={'349px'} mr={'8px'} h={'32px'}>
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
                            w={'260px'}
                            bg={'grayModern.50'}
                            border={theme.borders.base}
                            borderLeft={0}
                            borderTopRightRadius={'md'}
                            borderBottomRightRadius={'md'}
                            overflow={'hidden'}
                          >
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
                                {getDomainDisplay(network)}
                              </Box>
                            </Tooltip>
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
                                onClick={() =>
                                  setCustomAccessModalData({
                                    publicDomain: network.publicDomain,
                                    currentCustomDomain: network.customDomain,
                                    domain: network.domain
                                  })
                                }
                              >
                                {t('Custom Domain')}
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
                            onClick={() => dispatch({ type: 'REMOVE_PORT', payload: { index: i } })}
                          />
                        )}
                      </>
                    )}
                  </Flex>
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
            const index = networks.findIndex(
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
