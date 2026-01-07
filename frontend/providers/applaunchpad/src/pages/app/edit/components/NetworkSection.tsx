import { APPLICATION_PROTOCOLS, ProtocolList } from '@/constants/app';
import { SEALOS_DOMAIN } from '@/store/static';
import { useTranslation } from 'next-i18next';
import { customAlphabet } from 'nanoid';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { useCopyData } from '@/utils/tools';
import { useState, useCallback } from 'react';
import type { AppEditType } from '@/types/app';
import type { CustomAccessModalParams } from './CustomAccessModal';
import dynamic from 'next/dynamic';
import { WorkspaceQuotaItem } from '@sealos/shared';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { Switch } from '@sealos/shadcn-ui/switch';
import { Label } from '@sealos/shadcn-ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import { Separator } from '@sealos/shadcn-ui/separator';

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
  boxStyles?: any;
  headerStyles?: any;
}

export function NetworkSection({
  formHook,
  exceededQuotas,
  onDomainVerified
}: NetworkSectionProps) {
  const { t } = useTranslation();

  const { copyData } = useCopyData();
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (content: string, index: number) => {
    copyData(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
              appProtocol: undefined,
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

          if (network.appProtocol && APPLICATION_PROTOCOLS.includes(network.appProtocol)) {
            updateNetworks(index, {
              ...currentNetwork,
              serviceName: '',
              networkName: network.networkName || `network-${nanoid()}`,
              protocol: 'TCP',
              appProtocol: network.appProtocol,
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
              appProtocol: undefined,
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

  const getDomainDisplay = (network: AppEditType['networks'][0]) => {
    if (network.customDomain) {
      return network.customDomain;
    }
    if (network.openNodePort) {
      return network?.nodePort
        ? `${network.protocol.toLowerCase()}.${network.domain}:${network.nodePort}`
        : `${network.protocol.toLowerCase()}.${network.domain}:${t('pending_to_allocated')}`;
    }
    return `${network.publicDomain}.${network.domain}`;
  };

  return (
    <>
      <Card id="network">
        <CardHeader className="pt-8 px-8 pb-6 bg-transparent gap-2">
          <CardTitle className="flex items-center text-xl font-medium text-zinc-900">
            {t('Network Configuration')}
          </CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            {t('Network Configuration Description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="space-y-5">
            {networks.map((network, i) => (
              <div key={network.id}>
                <div className="flex items-start gap-8">
                  {/* Container Port */}
                  <div className="shrink-0">
                    <Label className="text-sm font-medium text-zinc-900 leading-none mb-3 block">
                      {t('Container Port')}
                    </Label>
                    <Input
                      type="number"
                      className="w-[100px] h-10"
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
                  </div>

                  <div className="flex items-center gap-4 flex-1">
                    {/* Enable Public Access */}
                    <div className="shrink-0 mr-1">
                      <Label className="text-sm font-medium text-zinc-900 mb-2 block">
                        {t('Open Public Access')}
                      </Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch
                          id={`network-access-${i}`}
                          className="driver-deploy-network-switch"
                          checked={!!network.openPublicDomain || !!network.openNodePort}
                          onCheckedChange={(checked) => {
                            if (checked) {
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
                        />
                        <Label
                          htmlFor={`network-access-${i}`}
                          className={`text-sm font-normal leading-none ${
                            network.openPublicDomain || network.openNodePort
                              ? 'text-zinc-900'
                              : 'text-zinc-400'
                          } cursor-pointer`}
                        >
                          {network.openPublicDomain || network.openNodePort
                            ? t('Enabled')
                            : t('Disabled')}
                        </Label>
                      </div>
                    </div>

                    {/* Protocol and Domain */}
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium text-zinc-900 mb-2 block invisible">
                        {t('Protocol')}
                      </Label>
                      <div className="flex items-center h-10">
                        {network.openPublicDomain || network.openNodePort ? (
                          <div className="flex items-center w-full">
                            <Select
                              value={
                                network.openPublicDomain
                                  ? network.appProtocol
                                  : network.openNodePort
                                  ? network.protocol
                                  : 'HTTP'
                              }
                              onValueChange={(val) => {
                                dispatch({
                                  type: 'UPDATE_PROTOCOL',
                                  payload: {
                                    index: i,
                                    protocol: val
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="min-w-[100px] h-10 rounded-lg rounded-r-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ProtocolList.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex-1 h-10 flex items-center px-3 border border-l-0 border-zinc-200  rounded-r-lg overflow-hidden">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex-1 flex items-center cursor-pointer hover:text-zinc-900 transition-colors overflow-hidden"
                                      onClick={() => handleCopy(getDomainDisplay(network), i)}
                                    >
                                      <span className="truncate text-sm text-muted-foreground">
                                        {getDomainDisplay(network)}
                                      </span>
                                      {copiedIndex === i ? (
                                        <Check className="w-4 h-4 ml-2 shrink-0 text-muted-foreground" />
                                      ) : (
                                        <Copy className="w-4 h-4 ml-2 shrink-0 text-muted-foreground" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {copiedIndex !== i && (
                                    <TooltipContent>
                                      <p>{t('click_to_copy_tooltip')}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              {network.openPublicDomain && !network.openNodePort && (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="text-blue-600 shrink-0 h-auto px-2 font-normal text-sm"
                                  onClick={() =>
                                    setCustomAccessModalData({
                                      publicDomain: network.publicDomain,
                                      currentCustomDomain: network.customDomain,
                                      domain: network.domain
                                    })
                                  }
                                >
                                  {t('Custom')}
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Delete Button */}
                    {networks.length > 1 && (
                      <div className="shrink-0">
                        <Label className="text-sm font-medium text-zinc-900 mb-2 block invisible">
                          {t('Delete')}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 hover:text-red-600 hover:border-red-200 shadow-none"
                          onClick={() => dispatch({ type: 'REMOVE_PORT', payload: { index: i } })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {i !== networks.length - 1 && (
                  <Separator className="my-5 bg-transparent border-t border-dashed border-zinc-200" />
                )}
              </div>
            ))}

            {networks.length < 15 && (
              <>
                <Separator className="my-4 bg-transparent border-t border-dashed border-zinc-200" />
                <Button
                  type="button"
                  variant="outline"
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
                  className="h-10 rounded-lg shadow-none hover:bg-zinc-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('Add Port')}
                </Button>
              </>
            )}

            {exceededQuotas.some(({ type }) => type === 'nodeport') && (
              <p className="text-sm text-red-500">
                {t('nodeport_exceeds_quota', {
                  requested: getValues('networks').filter((item) => item.openNodePort)?.length || 0,
                  limit: exceededQuotas.find(({ type }) => type === 'nodeport')?.limit ?? 0,
                  used: exceededQuotas.find(({ type }) => type === 'nodeport')?.used ?? 0
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
