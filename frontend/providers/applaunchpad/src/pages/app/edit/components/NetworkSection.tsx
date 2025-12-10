import MyIcon from '@/components/Icon';
import { MySelect } from '@sealos/ui';
import { APPLICATION_PROTOCOLS, ProtocolList } from '@/constants/app';
import { SEALOS_DOMAIN } from '@/store/static';
import { useTranslation } from 'next-i18next';
import { customAlphabet } from 'nanoid';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Box, Button, Flex, IconButton, Input, Switch, Tooltip, useTheme } from '@chakra-ui/react';
import { useCopyData } from '@/utils/tools';
import { useState, useCallback } from 'react';
import type { AppEditType } from '@/types/app';
import type { CustomAccessModalParams } from './CustomAccessModal';
import type { WorkspaceQuotaItem } from '@/types/workspace';
import dynamic from 'next/dynamic';

const CustomAccessModal = dynamic(() => import('./CustomAccessModal'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

type NetworkAction =
  | { type: 'ADD_PORT'; payload: AppEditType['networks'][0] }
  | { type: 'REMOVE_PORT'; payload: { index: number } }
  | { type: 'UPDATE_PROTOCOL'; payload: { index: number; protocol: string } }
  | { type: 'UPDATE_CUSTOM_DOMAIN'; payload: { index: number; customDomain: string } }
  | {
      type: 'ENABLE_EXTERNAL_ACCESS';
      payload: { index: number; network: AppEditType['networks'][0] };
    }
  | { type: 'DISABLE_EXTERNAL_ACCESS'; payload: { index: number } }
  | { type: 'UPDATE_PORT'; payload: { index: number; port: number } };

interface NetworkSectionProps {
  formHook: UseFormReturn<AppEditType, any>;
  exceededQuotas: WorkspaceQuotaItem[];
  onDomainVerified?: (params: { index: number; customDomain: string }) => void;
  handleOpenCostcenter: () => void;
  boxStyles: any;
  headerStyles: any;
}

export function NetworkSection({
  formHook,
  exceededQuotas,
  onDomainVerified,
  handleOpenCostcenter,
  boxStyles,
  headerStyles
}: NetworkSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyData } = useCopyData();
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();

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

  // Action dispatcher using useCallback to handle network operations
  const dispatch = useCallback(
    (action: NetworkAction) => {
      const currentNetworks = getValues('networks');

      switch (action.type) {
        case 'ADD_PORT':
          appendNetworks(action.payload);
          break;

        case 'REMOVE_PORT': {
          const { index } = action.payload;
          if (index >= 0 && index < currentNetworks.length) {
            removeNetworks(index);
          }
          break;
        }

        case 'UPDATE_PROTOCOL': {
          const { index, protocol } = action.payload;
          const currentNetwork = currentNetworks[index];

          if (APPLICATION_PROTOCOLS.includes(protocol as any)) {
            updateNetworks(index, {
              ...currentNetwork,
              serviceName: '',
              protocol: 'TCP',
              appProtocol: protocol as any,
              openNodePort: false,
              openPublicDomain: true,
              networkName: currentNetwork.networkName || `network-${nanoid()}`,
              publicDomain: currentNetwork.publicDomain || nanoid(),
              nodePort: undefined
            });
          } else {
            updateNetworks(index, {
              ...currentNetwork,
              serviceName: '',
              protocol: protocol as any,
              appProtocol: 'HTTP',
              openNodePort: true,
              openPublicDomain: false,
              customDomain: '',
              nodePort: undefined
            });
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

        case 'ENABLE_EXTERNAL_ACCESS': {
          const { index, network } = action.payload;
          const currentNetwork = currentNetworks[index];

          if (APPLICATION_PROTOCOLS.includes(network.appProtocol)) {
            updateNetworks(index, {
              ...currentNetwork,
              serviceName: '',
              networkName: network.networkName || `network-${nanoid()}`,
              protocol: 'TCP',
              appProtocol: network.appProtocol || 'HTTP',
              openPublicDomain: true,
              openNodePort: false,
              publicDomain: network.publicDomain || nanoid(),
              domain: network.domain || SEALOS_DOMAIN
            });
          } else {
            updateNetworks(index, {
              ...currentNetwork,
              serviceName: '',
              networkName: network.networkName || `network-${nanoid()}`,
              protocol: network.protocol,
              appProtocol: 'HTTP',
              openNodePort: true,
              openPublicDomain: false,
              customDomain: ''
            });
          }
          break;
        }

        case 'DISABLE_EXTERNAL_ACCESS': {
          const { index } = action.payload;
          updateNetworks(index, {
            ...currentNetworks[index],
            serviceName: '',
            openPublicDomain: false,
            openNodePort: false,
            nodePort: undefined
          });
          break;
        }

        case 'UPDATE_PORT': {
          const { index, port } = action.payload;
          updateNetworks(index, {
            ...currentNetworks[index],
            port
          });
          break;
        }

        default:
          break;
      }
    },
    [getValues, appendNetworks, removeNetworks, updateNetworks]
  );

  return (
    <>
      <Box id={'network'} {...boxStyles}>
        <Box {...headerStyles}>
          <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
          {t('Network Configuration')}
        </Box>
        <Box px={'42px'} py={'24px'} userSelect={'none'}>
          {networks.map((network, i) => (
            <Flex
              alignItems={'flex-start'}
              key={network.id}
              _notLast={{ pb: 6, borderBottom: theme.borders.base }}
              _notFirst={{ pt: 6 }}
            >
              {/* Container Port Column - Fixed Width */}
              <Box w={'140px'}>
                <Box mb={'10px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                  {t('Container Port')}
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
                    }
                  })}
                />
                {i === networks.length - 1 && networks.length + 1 <= 15 && (
                  <Box mt={3}>
                    <Button
                      w={'100px'}
                      variant={'outline'}
                      leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
                      onClick={() =>
                        dispatch({
                          type: 'ADD_PORT',
                          payload: {
                            networkName: '',
                            portName: nanoid(),
                            port: 80,
                            protocol: 'TCP',
                            appProtocol: 'HTTP',
                            openPublicDomain: false,
                            publicDomain: '',
                            customDomain: '',
                            domain: SEALOS_DOMAIN,
                            openNodePort: false,
                            nodePort: undefined
                          }
                        })
                      }
                    >
                      {t('Add Port')}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Enable Internet Access Column - Fixed Width */}
              <Box w={'200px'} mx={7}>
                <Box mb={'8px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                  {t('Open Public Access')}
                </Box>
                <Flex alignItems={'center'} h={'35px'}>
                  <Switch
                    className="driver-deploy-network-switch"
                    size={'lg'}
                    isChecked={!!network.openPublicDomain || !!network.openNodePort}
                    onChange={(e) => {
                      if (e.target.checked) {
                        dispatch({
                          type: 'ENABLE_EXTERNAL_ACCESS',
                          payload: {
                            index: i,
                            network
                          }
                        });
                      } else {
                        dispatch({
                          type: 'DISABLE_EXTERNAL_ACCESS',
                          payload: { index: i }
                        });
                      }
                    }}
                  ></Switch>
                </Flex>
              </Box>

              {/* Protocol and Domain Column - Fixed Width */}
              <Box w={'500px'}>
                <Box mb={'8px'} h={'20px'}></Box>
                <Flex alignItems={'center'} h={'35px'}>
                  {network.openPublicDomain || network.openNodePort ? (
                    <>
                      <MySelect
                        width={'120px'}
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
                        maxW={'350px'}
                        flex={'1 0 0'}
                        alignItems={'center'}
                        h={'32px'}
                        bg={'grayModern.50'}
                        px={4}
                        border={theme.borders.base}
                        borderLeft={0}
                        borderTopRightRadius={'md'}
                        borderBottomRightRadius={'md'}
                      >
                        <Tooltip label={t('click_to_copy_tooltip')}>
                          <Box
                            flex={1}
                            userSelect={'all'}
                            className="textEllipsis"
                            onClick={() => {
                              copyData(`${network.publicDomain}.${network.domain}`);
                            }}
                          >
                            {network.customDomain
                              ? network.customDomain
                              : network.openNodePort
                                ? network?.nodePort
                                  ? `${network.protocol.toLowerCase()}.${network.domain}:${
                                      network.nodePort
                                    }`
                                  : `${network.protocol.toLowerCase()}.${network.domain}:${t(
                                      'pending_to_allocated'
                                    )}`
                                : `${network.publicDomain}.${network.domain}`}
                          </Box>
                        </Tooltip>

                        {network.openPublicDomain && !network.openNodePort && (
                          <Box
                            fontSize={'11px'}
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
                      </Flex>
                    </>
                  ) : (
                    <Box w={'470px'} h={'32px'}></Box>
                  )}
                </Flex>
              </Box>

              {/* Delete Button Column - Fixed Width */}
              {networks.length > 1 && (
                <Box w={'50px'} ml={3}>
                  <Box mb={'8px'} h={'20px'}></Box>
                  <IconButton
                    height={'32px'}
                    width={'32px'}
                    aria-label={'button'}
                    variant={'outline'}
                    bg={'#FFF'}
                    _hover={{
                      color: 'red.600',
                      bg: 'rgba(17, 24, 36, 0.05)'
                    }}
                    icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                    onClick={() => dispatch({ type: 'REMOVE_PORT', payload: { index: i } })}
                  />
                </Box>
              )}
            </Flex>
          ))}
          {exceededQuotas.some(({ type }) => type === 'nodeport') && (
            <Box pt={'16px'}>
              <Box fontSize={'md'} color={'red.500'} mb={1}>
                {t('nodeport_exceeds_quota', {
                  requested: getValues('networks').filter((item) => item.openNodePort)?.length || 0,
                  limit: exceededQuotas.find(({ type }) => type === 'nodeport')?.limit ?? 0,
                  used: exceededQuotas.find(({ type }) => type === 'nodeport')?.used ?? 0
                })}
              </Box>
              <Box fontSize={'md'} color={'red.500'}>
                {t('please_upgrade_plan.0')}
                <Box
                  as="span"
                  cursor="pointer"
                  fontWeight="semibold"
                  color="blue.600"
                  textDecoration="underline"
                  onClick={handleOpenCostcenter}
                >
                  {t('please_upgrade_plan.1')}
                </Box>
                {t('please_upgrade_plan.2')}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {!!customAccessModalData && (
        <CustomAccessModal
          {...customAccessModalData}
          onClose={() => setCustomAccessModalData(undefined)}
          onSuccess={(e) => {
            const i = networks.findIndex(
              (item) => item.publicDomain === customAccessModalData.publicDomain
            );
            if (i === -1) return;
            dispatch({
              type: 'UPDATE_CUSTOM_DOMAIN',
              payload: { index: i, customDomain: e }
            });
            onDomainVerified?.({ index: i, customDomain: e });
          }}
        />
      )}
    </>
  );
}

export default NetworkSection;
