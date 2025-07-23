import { useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { nanoid } from '@/utils/tools';
import { useEnvStore } from '@/stores/env';
import { ProtocolList } from '@/constants/devbox';
import { DevboxEditTypeV2, ProtocolType } from '@/types/devbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type CustomAccessModalParams = {
  publicDomain: string;
  customDomain: string;
};

const CustomAccessDrawer = dynamic(() => import('@/components/drawers/CustomAccessDrawer'));

export default function Network({
  isEdit
}: React.HTMLAttributes<HTMLDivElement> & { isEdit: boolean }) {
  const { register, getValues, control } = useFormContext<DevboxEditTypeV2>();
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();
  const { env } = useEnvStore();

  const {
    fields: networks,
    update: updateNetworks,
    append: _appendNetworks,
    remove: removeNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  });
  const t = useTranslations();

  const appendNetworks = () => {
    const currentNetworks = getValues('networks');
    const config = getValues('templateConfig');
    const parsedConfig = JSON.parse(config as string) as {
      appPorts: [{ port: number; name: string; protocol: string }];
    };

    // Get default ports from template config
    const defaultPorts = parsedConfig.appPorts.map((port) => port.port);

    // If no ports exist, use the first unused default port
    if (currentNetworks.length === 0) {
      _appendNetworks({
        networkName: '',
        portName: nanoid(),
        port: defaultPorts[0] || 3000, // Fallback to 3000 if no default ports
        protocol: 'HTTP' as ProtocolType,
        openPublicDomain: false,
        publicDomain: '',
        customDomain: ''
      });
      return;
    }

    // Get all used ports
    const usedPorts = new Set(currentNetworks.map((network) => network.port));

    // Try to find an unused default port first
    const unusedDefaultPort = defaultPorts.find((port) => !usedPorts.has(port));
    if (unusedDefaultPort) {
      _appendNetworks({
        networkName: '',
        portName: nanoid(),
        port: unusedDefaultPort,
        protocol: 'HTTP' as ProtocolType,
        openPublicDomain: false,
        publicDomain: '',
        customDomain: ''
      });
      return;
    }

    // If all default ports are used, increment from the last port
    const lastPort = currentNetworks[currentNetworks.length - 1].port;
    _appendNetworks({
      networkName: '',
      portName: nanoid(),
      port: lastPort + 1,
      protocol: 'HTTP' as ProtocolType,
      openPublicDomain: false,
      publicDomain: '',
      customDomain: ''
    });
  };

  return (
    <>
      <div
        className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8"
        id="network"
      >
        <span className="text-xl/7 font-medium">{t('Network Settings')}</span>
        <div className="flex flex-col items-start gap-3">
          {/* Add Port Button when no port */}
          {networks.length === 0 && <AppendNetworksButton onClick={() => appendNetworks()} />}
          {/* Port List */}
          {networks.map((network, i) => (
            <div key={network.id} className="flex w-full flex-col gap-3">
              <div className="guide-network-configuration flex w-full items-center gap-4">
                {/* left part */}
                <div className="flex flex-shrink-0 items-start gap-8">
                  {/* container port */}
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {t('Container Port')}
                    </span>
                    <Input
                      className="h-10 w-25"
                      type="number"
                      min={1}
                      max={65535}
                      {...register(`networks.${i}.port`, {
                        valueAsNumber: true,
                        min: {
                          value: 1,
                          message: t('The minimum exposed port is 1')
                        },
                        max: {
                          value: 65535,
                          message: t('The maximum number of exposed ports is 65535')
                        },
                        validate: {
                          repeatPort: (value) => {
                            const ports = getValues('networks').map((network, index) => ({
                              port: network.port,
                              index
                            }));
                            const isDuplicate = ports.some(
                              (item) => item.port === value && item.index !== i
                            );
                            return !isDuplicate || t('The port number cannot be repeated');
                          }
                        }
                      })}
                    />
                  </div>
                  {/* open public access */}
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {t('Open Public Access')}
                    </span>
                    <div className="flex h-10 items-center justify-between gap-5">
                      <div className="flex items-center gap-2">
                        <Switch
                          className="driver-deploy-network-switch"
                          id={`openPublicDomain-${i}`}
                          checked={!!network.openPublicDomain}
                          onCheckedChange={(checked) => {
                            const devboxName = getValues('name');
                            if (!devboxName) {
                              toast.error(t('Please enter the devbox name first'));
                              return;
                            }
                            updateNetworks(i, {
                              ...getValues('networks')[i],
                              networkName: network.networkName || `${devboxName}-${nanoid()}`,
                              protocol: network.protocol || ('HTTP' as ProtocolType),
                              openPublicDomain: checked,
                              publicDomain:
                                network.publicDomain || `${nanoid()}.${env.ingressDomain}`
                            });
                          }}
                        />
                      </div>
                      {network.openPublicDomain && (
                        <div className="flex items-center">
                          <Select
                            value={network.protocol}
                            onValueChange={(val: ProtocolType) => {
                              updateNetworks(i, {
                                ...getValues('networks')[i],
                                protocol: val
                              });
                            }}
                          >
                            <SelectTrigger className="w-27 rounded-r-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ProtocolList.map((protocol) => (
                                <SelectItem key={protocol.value} value={protocol.value}>
                                  {protocol.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex h-10 flex-shrink-0 flex-grow-1 items-center rounded-r-md border border-l-0 px-3 py-2">
                            <div className="mr-2 min-w-64 flex-1 truncate text-sm/5 text-muted-foreground select-all">
                              {network.customDomain ? network.customDomain : network.publicDomain!}
                            </div>
                            <Button
                              variant="ghost"
                              className="cursor-pointer text-sm/5 whitespace-nowrap text-blue-600 hover:bg-white hover:text-blue-700"
                              onClick={() =>
                                setCustomAccessModalData({
                                  publicDomain: network.publicDomain!,
                                  customDomain: network.customDomain!
                                })
                              }
                            >
                              {t('Custom Domain')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* trash button  */}
                {networks.length >= 1 && (
                  <div className="pt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-white text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeNetworks(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Separator />
              {/* Add Port Button when last port */}
              {i === networks.length - 1 && networks.length < 15 && (
                <AppendNetworksButton onClick={() => appendNetworks()} />
              )}
            </div>
          ))}
        </div>
      </div>
      {!!customAccessModalData && (
        <CustomAccessDrawer
          {...customAccessModalData}
          onClose={() => setCustomAccessModalData(undefined)}
          onSuccess={(e) => {
            const i = networks.findIndex(
              (item) => item.publicDomain === customAccessModalData.publicDomain
            );
            if (i === -1) return;
            updateNetworks(i, {
              ...networks[i],
              customDomain: e
            });
            setCustomAccessModalData(undefined);
          }}
        />
      )}
    </>
  );
}

const AppendNetworksButton = ({ ...props }: React.ComponentPropsWithoutRef<typeof Button>) => {
  const t = useTranslations();
  return (
    <Button className="w-25 rounded-lg bg-white" variant="outline" {...props}>
      <Plus className="h-4 w-4 text-neutral-500" />
      {t('Add Port')}
    </Button>
  );
};
