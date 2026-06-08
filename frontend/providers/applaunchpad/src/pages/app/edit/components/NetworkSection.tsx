import MyIcon from '@/components/Icon';
import { MySelect } from '@sealos/ui';
import { APPLICATION_PROTOCOLS, ProtocolList } from '@/constants/app';
import { SEALOS_DOMAIN } from '@/store/static';
import { useTranslation } from 'next-i18next';
import { customAlphabet } from 'nanoid';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Box, Button, Flex, IconButton, Input, Switch, useTheme } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import type { AppEditType } from '@/types/app';
import RouteRulesModal from './RouteRulesModal';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

type NetworkAction =
  | { type: 'ADD_PORT'; payload: AppEditType['networks'][0] }
  | { type: 'REMOVE_PORT'; payload: { index: number } }
  | { type: 'ENABLE_EXTERNAL_ACCESS'; payload: { index: number } }
  | { type: 'DISABLE_EXTERNAL_ACCESS'; payload: { index: number } }
  | { type: 'UPDATE_PROTOCOL'; payload: { index: number; protocol: string } }
  | {
      type: 'UPDATE_ROUTES';
      payload: {
        index: number;
        routes: NonNullable<AppEditType['networks'][0]['routes']>;
      };
    };

interface NetworkSectionProps {
  formHook: UseFormReturn<AppEditType, any>;
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

export function NetworkSection({ formHook, boxStyles, headerStyles }: NetworkSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [routeRulesIndex, setRouteRulesIndex] = useState<number>();

  const { register, control, getValues } = formHook;

  const {
    fields: networks,
    append: appendNetworks,
    remove: removeNetworks,
    update: updateNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  });

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

          return (
            <Box
              key={network.id}
              w={'697px'}
              maxW={'100%'}
              _notLast={{ pb: 6, mb: 6, borderBottom: theme.borders.base }}
            >
              <Flex alignItems={'flex-start'}>
                <Box flex={'0 0 110px'}>
                  <Box mb={'9px'} h={'16px'} fontSize={'sm'} color={'grayModern.900'}>
                    {t('Port')}
                  </Box>
                  <Input
                    h={'32px'}
                    type={'number'}
                    w={'110px'}
                    bg={'grayModern.50'}
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
                  <Box mb={'9px'} h={'16px'} fontSize={'sm'} color={'grayModern.900'}>
                    {t('Public Access')}
                  </Box>
                  <Flex alignItems={'center'} h={'32px'} minW={0}>
                    <Switch
                      className="driver-deploy-network-switch"
                      isChecked={isExternalAccess}
                      mr={isExternalAccess ? '24px' : 0}
                      sx={{
                        w: '36px',
                        h: '20px',
                        '.chakra-switch__track': {
                          w: '36px',
                          h: '20px',
                          p: '2px',
                          bg: 'grayModern.200'
                        },
                        '.chakra-switch__thumb': {
                          w: '16px',
                          h: '16px',
                          bg: 'white',
                          boxShadow: '0px 1px 2px rgba(17, 24, 36, 0.16)'
                        },
                        '.chakra-switch__input:checked + .chakra-switch__track': {
                          bg: 'grayModern.900'
                        },
                        '.chakra-switch__input:checked + .chakra-switch__track .chakra-switch__thumb':
                          {
                            transform: 'translateX(16px)'
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
                            <Input
                              h={'30px'}
                              flex={'1 1 auto'}
                              minW={0}
                              px={'12px'}
                              bg={'transparent'}
                              border={0}
                              borderRadius={0}
                              fontSize={'sm'}
                              _focusVisible={{
                                boxShadow: 'none'
                              }}
                              placeholder={t('External Access Domain Placeholder')}
                              {...register(`networks.${i}.customDomain`, {
                                validate: (value) => {
                                  const currentNetwork = getValues('networks')[i];

                                  if (
                                    (currentNetwork?.openPublicDomain ||
                                      currentNetwork?.openNodePort) &&
                                    !String(value || '').trim()
                                  ) {
                                    return t('External Access Domain Required');
                                  }

                                  return true;
                                }
                              })}
                            />
                            {network.openPublicDomain && !network.openNodePort && (
                              <Box
                                flex={'0 0 auto'}
                                mr={'37px'}
                                px={'8px'}
                                py={'4px'}
                                fontSize={'11px'}
                                lineHeight={'16px'}
                                fontWeight={500}
                                letterSpacing={'0.5px'}
                                color={'brightBlue.600'}
                              >
                                {t('Custom Domain')}
                              </Box>
                            )}
                          </Flex>
                        </Flex>
                        <Button
                          type={'button'}
                          h={'32px'}
                          w={'113px'}
                          minW={'113px'}
                          px={3}
                          fontSize={'sm'}
                          variant={'outline'}
                          onClick={() => setRouteRulesIndex(i)}
                        >
                          {t('Configure Route Rules')}
                        </Button>
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
          h={'36px'}
          w={'109px'}
          variant={'outline'}
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
    </Box>
  );
}

export default NetworkSection;
