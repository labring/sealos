import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { CircleHelpIcon, Copy } from 'lucide-react';
import ICPStatus from './ICPStatus';

export type NetworkConfigurationTableItem = {
  inline: string;
  public: string;
  customDomain: string | null;
  showReadyStatus: boolean;
  port: number;
};

type NetworkStatusItem = {
  ready: boolean;
  url: string;
};

type NetworkConfigurationTableProps = {
  networks: NetworkConfigurationTableItem[];
  networkStatus?: NetworkStatusItem[];
  statusMap: Record<string, NetworkStatusItem>;
  copyData: (value: string) => void;
  t: (key: string) => string;
};

const NetworkConfigurationTable = ({
  networks,
  networkStatus,
  statusMap,
  copyData,
  t
}: NetworkConfigurationTableProps) => {
  return (
    <div className="overflow-auto pb-6">
      <table className="w-full min-w-[720px] table-fixed">
        <thead className="sticky top-0 z-10 whitespace-nowrap">
          <tr className="bg-zinc-50">
            <th className="w-[85px] h-10 text-sm font-normal text-zinc-500 px-4 py-3 rounded-l-lg text-left">
              {t('Port')}
            </th>
            <th className="h-10 text-sm font-normal text-zinc-500 px-4 py-3 text-left">
              {t('Private Address')}
            </th>
            <th className="h-10 text-sm font-normal text-zinc-500 px-4 py-3 rounded-r-lg text-left">
              {t('Public Address')}
            </th>
          </tr>
        </thead>
        <tbody className="whitespace-nowrap">
          {networks.map((network, index) => {
            return (
              <tr key={network.inline + index} className="!border-b border-zinc-100">
                <td className="w-[85px] px-4 py-2">
                  <div className="text-sm text-zinc-700">{network.port}</div>
                </td>
                <td className="px-4 py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="text-sm w-fit text-zinc-700 cursor-pointer"
                        onClick={() => copyData(network.inline)}
                      >
                        {network.inline.replace('.svc.cluster.local', '')}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('Copy')}</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {network.public && network.showReadyStatus && (
                      <div className="min-w-[70px] shrink-0">
                        {statusMap[network.public]?.ready ? (
                          <div className="w-fit relative top-[1px] h-5 flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 border-[0.5px] border-emerald-200">
                            <div className="w-1.5 h-1.5 shrink-0 rounded-xs bg-emerald-500"></div>
                            {t('Accessible')}
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-fit relative top-[1px] h-5 flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium bg-zinc-50 text-zinc-500 border-[0.5px] border-zinc-200 rounded-full px-2 py-0.5 cursor-pointer">
                                <CircleHelpIcon className="w-3 h-3 shrink-0 text-zinc-400" />
                                {t('Ready')}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl">
                              <div className="text-sm text-zinc-900 font-normal p-2">
                                {network.customDomain
                                  ? t('network_not_ready_icp_reg')
                                  : t('network_not_ready')}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}

                    <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`text-sm ${
                              network.public ? 'text-zinc-700 cursor-pointer' : 'text-zinc-500'
                            }`}
                            {...(network.public
                              ? {
                                  onClick: () => window.open(network.public, '_blank')
                                }
                              : {})}
                          >
                            {network.public || '-'}
                          </div>
                        </TooltipTrigger>
                        {network.public && (
                          <TooltipContent>
                            <p>{t('Open Link')}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      {!!network.public && (
                        <div
                          className="relative top-[1px] flex-shrink-0 w-6 h-6 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center"
                          onClick={() => copyData(network.public)}
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {network.customDomain !== null &&
                      network.showReadyStatus === true &&
                      network.public &&
                      !statusMap[network.public]?.ready && (
                        <ICPStatus
                          customDomain={network.customDomain}
                          enabled={
                            !!networkStatus &&
                            !!network.customDomain &&
                            network.showReadyStatus === true &&
                            !!network.public &&
                            !statusMap[network.public]?.ready
                          }
                        />
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default NetworkConfigurationTable;
