import Image from 'next/image';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { memo } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';
import { Button } from '@sealos/shadcn-ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';

import { cn } from '@sealos/shadcn-ui';
import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { IDEType, useIDEStore } from '@/stores/ide';
import { getSSHConnectionInfo, getDevboxPorts, updateDevboxWebIDEPort } from '@/api/devbox';
import { DevboxStatusMapType } from '@/types/devbox';
import { destroyDriver, startDriver, startConnectIDE } from '@/hooks/driver';

import ToolboxDrawer from './drawers/ToolboxDrawer';
import JetBrainsGuideDrawer from './drawers/JetbrainsGuideDrawer';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { usePathname } from '@/i18n';
import { track } from '@sealos/gtm';
import { useConfirm } from '@/hooks/useConfirm';

export interface JetBrainsGuideData {
  devboxName: string;
  runtimeType: string;
  privateKey: string;
  userName: string;
  token: string;
  workingDir: string;
  host: string;
  port: string;
  configHost: string;
}

interface MenuItem {
  value: IDEType | string;
  menuLabel: string;
  group?: string;
  options?: { value: IDEType; menuLabel: string }[];
}

interface IDEButtonProps {
  devboxName: string;
  runtimeType: string;
  sshPort: number;
  status: DevboxStatusMapType;
  leftButtonProps?: React.ComponentProps<typeof Button>;
  rightButtonProps?: React.ComponentProps<typeof Button>;
  isGuide?: boolean;
  className?: string;
}

const IDEButton = memo(
  ({
    devboxName,
    runtimeType,
    sshPort,
    status,
    leftButtonProps = {},
    rightButtonProps = {},
    isGuide = false,
    className
  }: IDEButtonProps) => {
    const t = useTranslations();

    const { env } = useEnvStore();
    const { getDevboxIDEByDevboxName, updateDevboxIDE } = useIDEStore();

    const [loading, setLoading] = useState(false);
    const [onOpenToolboxDrawer, setOnOpenToolboxDrawer] = useState(false);
    const [onOpenJetbrainsModal, setOnOpenJetbrainsModal] = useState(false);
    const [jetbrainsGuideData, setJetBrainsGuideData] = useState<JetBrainsGuideData>();

    const currentIDE = getDevboxIDEByDevboxName(devboxName) as IDEType;
    const defaultLeftColumnItems = useMemo(
      () => getLeftColumnItems(env.currencySymbol),
      [env.currencySymbol]
    );
    const defaultRightColumnItems = useMemo(
      () => getRightColumnItems(env.enableWebideFeature),
      [env.enableWebideFeature]
    );
    const { leftColumnItems, rightColumnItems } = useMemo(
      () =>
        getVisibleIDEColumnItems({
          leftColumnItems: defaultLeftColumnItems,
          rightColumnItems: defaultRightColumnItems,
          enabledIDEs: env.enabledIDEs
        }),
      [defaultLeftColumnItems, defaultRightColumnItems, env.enabledIDEs]
    );
    const visibleIDEValues = useMemo(
      () => getMenuItemIDEValues([...leftColumnItems, ...rightColumnItems]),
      [leftColumnItems, rightColumnItems]
    );
    const selectedIDE = visibleIDEValues.includes(currentIDE)
      ? currentIDE
      : visibleIDEValues[0] || DEFAULT_IDE;
    const showLeftColumn = leftColumnItems.length > 0;
    const showRightColumn = rightColumnItems.length > 0;
    const { guideIDE, setGuideIDE } = useGuideStore();

    const { openConfirm, ConfirmChild } = useConfirm({
      title: 'prompt',
      content: 'webide_fee_warning',
      contentParams: { port: env.webIdePort },
      confirmText: 'confirm',
      cancelText: 'cancel'
    });

    const handleGotoIDE = useCallback(
      async (currentIDE: IDEType = 'cursor') => {
        track({
          event: 'deployment_action',
          event_type: 'ide_open',
          module: 'devbox',
          context: 'app',
          method: currentIDE
        } as any);
        setGuideIDE(true);
        destroyDriver();

        setLoading(true);

        if (currentIDE !== 'gateway' && currentIDE !== 'toolbox' && currentIDE !== 'webide')
          toast.info(t('opening_ide'));

        try {
          if (currentIDE === 'webide') {
            const portsResponse = await getDevboxPorts(devboxName);
            const existingPorts = portsResponse.ports || [];
            const webIdePortConfig = existingPorts.find((p) => p.number === env.webIdePort);

            if (
              webIdePortConfig &&
              webIdePortConfig.exposesPublicDomain &&
              webIdePortConfig.publicDomain
            ) {
              const webIDEUrl = `https://${webIdePortConfig.publicDomain}/?folder=/home/devbox/project`;
              window.open(webIDEUrl, '_blank');
              return;
            }

            const executeWebIDE = async () => {
              toast.info('Creating Web IDE network...');
              const response = await updateDevboxWebIDEPort(devboxName, env.webIdePort);

              if (response.publicDomain) {
                const webIDEUrl = `https://${response.publicDomain}/?folder=/home/devbox/project`;
                window.open(webIDEUrl, '_blank');
              } else {
                toast.error('Failed to create Web IDE network');
              }
            };

            openConfirm(executeWebIDE)();
            return;
          }

          const { base64PrivateKey, userName, workingDir, token } = await getSSHConnectionInfo({
            devboxName
          });
          const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');

          setJetBrainsGuideData({
            devboxName,
            runtimeType,
            privateKey: sshPrivateKey,
            userName,
            token,
            workingDir,
            host: env.sealosDomain,
            port: sshPort.toString(),
            configHost: `${env.sealosDomain}_${env.namespace}_${devboxName}`
          });

          if (currentIDE === 'gateway') {
            setOnOpenJetbrainsModal(true);
            return;
          } else if (currentIDE === 'toolbox') {
            setOnOpenToolboxDrawer(true);
            return;
          }

          const idePrefix = ideObj[currentIDE].prefix;
          const fullUri = `${idePrefix}labring.devbox-aio?sshDomain=${encodeURIComponent(
            `${userName}@${env.sealosDomain}`
          )}&sshPort=${encodeURIComponent(sshPort)}&base64PrivateKey=${encodeURIComponent(
            base64PrivateKey
          )}&sshHostLabel=${encodeURIComponent(
            `${env.sealosDomain}_${env.namespace}_${devboxName}`
          )}&workingDir=${encodeURIComponent(workingDir)}&token=${encodeURIComponent(token)}`;
          window.location.href = fullUri;
        } catch (error: any) {
          console.error(error, '==');
          toast.error(error?.message || 'Failed to open IDE');
        } finally {
          setLoading(false);
        }
      },
      [
        t,
        devboxName,
        runtimeType,
        env.sealosDomain,
        env.namespace,
        env.webIdePort,
        sshPort,
        setGuideIDE,
        openConfirm
      ]
    );

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isClientSide = useClientSideValue(true);
    const pathname = usePathname();
    useEffect(() => {
      if (!guideIDE && isClientSide && pathname.includes('/devbox/detail')) {
        startDriver(startConnectIDE(t, () => handleGotoIDE(selectedIDE)));
      }
    }, [guideIDE, isClientSide, t, pathname, handleGotoIDE, selectedIDE]);

    return (
      <div className="!overflow-visible">
        <div className={cn('ide-button flex min-w-fit', className)}>
          {/* left button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                className="w-32 rounded-r-none px-2"
                onClick={() => handleGotoIDE(selectedIDE)}
                disabled={status.value !== 'Running' || loading}
                data-testid="devbox-ide.open-button"
                {...leftButtonProps}
              >
                <div className="flex w-full items-center justify-center gap-1.5">
                  <Image
                    width={18}
                    height={18}
                    alt={selectedIDE}
                    src={`/images/ide/${selectedIDE}.svg`}
                  />
                  <span>{ideObj[selectedIDE]?.label}</span>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('ide_tooltip')}</p>
            </TooltipContent>
          </Tooltip>

          {/* right button */}
          <DropdownMenu open={isGuide || isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="rounded-l-none"
                disabled={status.value !== 'Running' || loading}
                data-testid="devbox-ide.menu-button"
                {...rightButtonProps}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="!max-h-none !overflow-visible p-1.5"
              align="end"
              data-testid="devbox-ide.menu"
            >
              <div className="flex items-start">
                {/* left column */}
                {showLeftColumn && (
                  <div
                    className={cn(
                      'space-y-1',
                      env.currencySymbol === 'usd' ? 'min-w-[160px]' : 'min-w-[230px]'
                    )}
                  >
                    {leftColumnItems.map((item) =>
                      item.group ? (
                        <div key={item.value} className="flex gap-1">
                          {item.options?.map((option, index) => (
                            <div key={option.value} className="flex items-center">
                              <DropdownMenuItem
                                className={cn(
                                  index === 0 ? 'min-w-[140px]' : 'min-w-[80px]',
                                  'text-zinc-600',
                                  index === 0 && 'pl-2 pr-1',
                                  index === 1 && 'pr-2 text-zinc-600',
                                  selectedIDE === option.value && 'text-zinc-900'
                                )}
                                onClick={() => {
                                  updateDevboxIDE(option.value, devboxName);
                                  handleGotoIDE(option.value);
                                }}
                                data-testid="devbox-ide.option"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    width={18}
                                    height={18}
                                    alt={option.value}
                                    src={`/images/ide/${option.value}.svg`}
                                  />
                                  <span className="whitespace-nowrap text-sm">
                                    {option.menuLabel}
                                  </span>
                                  {selectedIDE === option.value && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                              {index === 0 && <div className="ml-1 h-3 w-0.5 bg-gray-200"></div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <DropdownMenuItem
                          key={item.value}
                          className={cn(
                            'h-9 justify-between text-zinc-600',
                            selectedIDE === item.value && 'text-zinc-900'
                          )}
                          onClick={() => {
                            updateDevboxIDE(item.value as IDEType, devboxName);
                            handleGotoIDE(item.value as IDEType);
                          }}
                          data-testid="devbox-ide.option"
                        >
                          <div className="flex items-center gap-1.5">
                            <Image
                              width={18}
                              height={18}
                              alt={item.value}
                              src={`/images/ide/${item.value}.svg`}
                            />
                            <span>{item?.menuLabel}</span>
                          </div>
                          {selectedIDE === item.value && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </DropdownMenuItem>
                      )
                    )}
                  </div>
                )}
                {/* vertical divider */}
                {showLeftColumn && showRightColumn && (
                  <div className="mx-1.5 w-px bg-gray-200"></div>
                )}
                {/* right column */}
                {showRightColumn && (
                  <div className="min-w-[230px] space-y-1">
                    {rightColumnItems.map((item) =>
                      item.group ? (
                        <div key={item.value} className="flex gap-1">
                          {item.options?.map((option, index) => (
                            <div key={option.value} className="flex items-center">
                              <DropdownMenuItem
                                className={cn(
                                  'min-w-[110px] text-zinc-600',
                                  index === 0 && 'pl-2 pr-1',
                                  index === 1 && 'pr-2 text-zinc-600',
                                  selectedIDE === option.value && 'text-zinc-900'
                                )}
                                onClick={() => {
                                  updateDevboxIDE(option.value, devboxName);
                                  handleGotoIDE(option.value);
                                }}
                                data-testid="devbox-ide.option"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    width={18}
                                    height={18}
                                    alt={option.value}
                                    src={`/images/ide/${option.value}.svg`}
                                  />
                                  <span className="whitespace-nowrap">{option.menuLabel}</span>
                                  {selectedIDE === option.value && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </DropdownMenuItem>
                              {index === 0 && <div className="ml-1 h-3 w-0.5 bg-gray-200"></div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <DropdownMenuItem
                          key={item.value}
                          className={cn(
                            'h-9 justify-between text-zinc-600',
                            selectedIDE === item.value && 'text-zinc-900'
                          )}
                          onClick={() => {
                            updateDevboxIDE(item.value as IDEType, devboxName);
                            handleGotoIDE(item.value as IDEType);
                          }}
                          data-testid="devbox-ide.option"
                        >
                          <div className="flex items-center gap-1.5">
                            <Image
                              width={18}
                              height={18}
                              alt={item.value}
                              src={`/images/ide/${item.value}.svg`}
                            />
                            <span>{item?.menuLabel}</span>
                          </div>
                          {selectedIDE === item.value && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </DropdownMenuItem>
                      )
                    )}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {!!jetbrainsGuideData && (
            <JetBrainsGuideDrawer
              open={onOpenJetbrainsModal}
              onSuccess={() => {}}
              onClose={() => setOnOpenJetbrainsModal(false)}
              jetbrainsGuideData={jetbrainsGuideData}
            />
          )}
          {!!jetbrainsGuideData && (
            <ToolboxDrawer
              open={onOpenToolboxDrawer}
              onClose={() => setOnOpenToolboxDrawer(false)}
              jetbrainsGuideData={jetbrainsGuideData}
            />
          )}
        </div>
        <ConfirmChild />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.devboxName === nextProps.devboxName &&
      prevProps.runtimeType === nextProps.runtimeType &&
      prevProps.sshPort === nextProps.sshPort &&
      prevProps.status.value === nextProps.status.value &&
      prevProps.isGuide === nextProps.isGuide
    );
  }
);

// Add display name for debugging purposes
IDEButton.displayName = 'IDEButton';

export const ideObj = {
  vscode: {
    label: 'VSCode',
    prefix: 'vscode://'
  },
  webide: {
    label: 'Online',
    prefix: '-'
  },
  vscodeInsiders: {
    label: 'Insiders',
    prefix: 'vscode-insiders://'
  },
  cursor: {
    label: 'Cursor',
    prefix: 'cursor://'
  },
  windsurf: {
    label: 'Windsurf',
    prefix: 'windsurf://'
  },
  kiro: {
    label: 'Kiro',
    prefix: 'kiro://'
  },
  qoder: {
    label: 'Qoder',
    prefix: 'qoder://'
  },
  codebuddy: {
    label: 'CodeBuddy',
    prefix: 'codebuddy://'
  },
  codebuddyCN: {
    label: 'CodeBuddy CN',
    prefix: 'codebuddycn://'
  },
  lingma: {
    label: 'Lingma',
    prefix: 'lingma://'
  },
  trae: {
    label: 'Trae',
    prefix: 'trae://'
  },
  traeCN: {
    label: 'Trae CN',
    prefix: 'trae-cn://'
  },
  toolbox: {
    label: 'Toolbox',
    prefix: '-'
  },
  gateway: {
    label: 'Gateway',
    prefix: '-'
  }
} as const;

const DEFAULT_IDE: IDEType = 'vscode';
const allIDEValues = Object.keys(ideObj) as IDEType[];
const ideValueMap = new Map(allIDEValues.map((value) => [value.toLowerCase(), value]));

const parseEnabledIDEs = (enabledIDEs?: string): Set<IDEType> | undefined => {
  const values = (enabledIDEs || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return undefined;
  }

  const ideValues = values
    .map((value) => ideValueMap.get(value.toLowerCase()))
    .filter((value): value is IDEType => Boolean(value));

  return ideValues.length > 0 ? new Set(ideValues) : undefined;
};

const filterMenuItemsByIDEValues = (
  items: MenuItem[],
  enabledIDEValues: Set<IDEType> | undefined
): MenuItem[] => {
  if (!enabledIDEValues) {
    return items;
  }

  return items.flatMap((item) => {
    if (item.options) {
      const options = item.options.filter((option) => enabledIDEValues.has(option.value));

      if (options.length === 0) {
        return [];
      }

      if (options.length === 1) {
        return {
          value: options[0].value,
          menuLabel: options[0].menuLabel
        };
      }

      return {
        ...item,
        options
      };
    }

    return enabledIDEValues.has(item.value as IDEType) ? item : [];
  });
};

const getVisibleIDEColumnItems = ({
  leftColumnItems,
  rightColumnItems,
  enabledIDEs
}: {
  leftColumnItems: MenuItem[];
  rightColumnItems: MenuItem[];
  enabledIDEs?: string;
}): { leftColumnItems: MenuItem[]; rightColumnItems: MenuItem[] } => {
  const enabledIDEValues = parseEnabledIDEs(enabledIDEs);
  const filteredLeftColumnItems = filterMenuItemsByIDEValues(leftColumnItems, enabledIDEValues);
  const filteredRightColumnItems = filterMenuItemsByIDEValues(rightColumnItems, enabledIDEValues);

  if (filteredLeftColumnItems.length === 0 && filteredRightColumnItems.length === 0) {
    return { leftColumnItems, rightColumnItems };
  }

  return {
    leftColumnItems: filteredLeftColumnItems,
    rightColumnItems: filteredRightColumnItems
  };
};

const getMenuItemIDEValues = (items: MenuItem[]): IDEType[] =>
  items.flatMap((item) => item.options?.map((option) => option.value) || [item.value as IDEType]);

const getLeftColumnItems = (currencySymbol: string): MenuItem[] => {
  const baseItems: MenuItem[] = [
    { value: 'kiro', menuLabel: 'Kiro' },
    { value: 'qoder', menuLabel: 'Qoder' },
    { value: 'lingma', menuLabel: 'Lingma' },
    {
      value: 'trae-group',
      menuLabel: 'Trae',
      group: 'trae',
      options: [
        { value: 'trae', menuLabel: 'Trae' },
        { value: 'traeCN', menuLabel: 'CN' }
      ]
    },
    {
      value: 'codebuddy-group',
      menuLabel: 'CodeBuddy',
      group: 'codebuddy',
      options: [
        { value: 'codebuddy', menuLabel: 'CodeBuddy' },
        { value: 'codebuddyCN', menuLabel: 'CN' }
      ]
    }
  ];

  if (currencySymbol === 'usd') {
    return baseItems.map((item) => {
      if (item.options) {
        const filteredOptions = item.options.filter((option) => !option.value.includes('CN'));
        // If only one option remains after filtering, flatten the group to a single item
        if (filteredOptions.length === 1) {
          return {
            value: filteredOptions[0].value,
            menuLabel: filteredOptions[0].menuLabel
          };
        }
        return { ...item, options: filteredOptions };
      }
      return item;
    });
  }

  return baseItems;
};
const getRightColumnItems = (enableWebideFeature: string): MenuItem[] => {
  const baseItems: MenuItem[] = [
    { value: 'cursor', menuLabel: 'Cursor' },
    {
      value: 'vscode-group',
      menuLabel: 'VSCode',
      group: 'vscode',
      options: [
        { value: 'vscode', menuLabel: 'VSCode' },
        { value: 'webide', menuLabel: 'Online' }
      ]
    },
    { value: 'vscodeInsiders', menuLabel: 'Insiders' },
    { value: 'windsurf', menuLabel: 'Windsurf' },
    {
      value: 'jetbrains-group',
      menuLabel: 'JetBrains',
      group: 'jetbrains',
      options: [
        { value: 'toolbox', menuLabel: 'Toolbox' },
        { value: 'gateway', menuLabel: 'Gateway' }
      ]
    }
  ];

  if (enableWebideFeature !== 'true') {
    return baseItems.map((item) => {
      if (item.options && item.value === 'vscode-group') {
        const filteredOptions = item.options.filter((option) => option.value !== 'webide');
        // If only one option remains after filtering, flatten the group to a single item
        if (filteredOptions.length === 1) {
          return {
            value: filteredOptions[0].value,
            menuLabel: filteredOptions[0].menuLabel
          };
        }
        return { ...item, options: filteredOptions };
      }
      return item;
    });
  }

  return baseItems;
};

export default IDEButton;
