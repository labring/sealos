import Image from 'next/image';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, X } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { memo } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { IDEType, useIDEStore } from '@/stores/ide';
import { getSSHConnectionInfo } from '@/api/devbox';
import { DevboxStatusMapType } from '@/types/devbox';
import { destroyDriver, startDriver, startConnectIDE } from '@/hooks/driver';

import ToolboxDrawer from './drawers/ToolboxDrawer';
import JetBrainsGuideDrawer from './drawers/JetbrainsGuideDrawer';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { usePathname } from '@/i18n';

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
  value: IDEType;
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
    const { guideIDE, setguideIDE } = useGuideStore();

    const handleGotoIDE = useCallback(
      async (currentIDE: IDEType = 'cursor') => {
        setguideIDE(true);
        destroyDriver();

        setLoading(true);

        // TODO: Add a reminder: If you haven't opened it for a long time, please check whether the corresponding IDE is installed.
        if (currentIDE !== 'gateway' && currentIDE !== 'toolbox') toast.info(t('opening_ide'));

        try {
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
        } finally {
          setLoading(false);
        }
      },
      [t, devboxName, runtimeType, env.sealosDomain, env.namespace, sshPort, setguideIDE]
    );

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isClientSide = useClientSideValue(true);
    const pathname = usePathname();
    useEffect(() => {
      if (!guideIDE && isClientSide && pathname.includes('/devbox/detail')) {
        startDriver(startConnectIDE(t, handleGotoIDE));
      }
    }, [guideIDE, isClientSide, t, pathname, handleGotoIDE]);

    return (
      <div className="!overflow-visible">
        <div className={cn('ide-button flex min-w-fit', className)}>
          {/* left button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                className="w-25 rounded-r-none px-2"
                onClick={() => handleGotoIDE(currentIDE)}
                disabled={status.value !== 'Running' || loading}
                {...leftButtonProps}
              >
                <div className="flex w-full items-center justify-center gap-1.5">
                  <Image
                    width={18}
                    height={18}
                    alt={currentIDE}
                    src={`/images/ide/${currentIDE}.svg`}
                  />
                  <span>{ideObj[currentIDE]?.label}</span>
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
                {...rightButtonProps}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-1.5" align="end">
              {menuItems.map((item) =>
                item.group ? (
                  <div key={item.value} className="flex gap-1">
                    {item.options?.map((option, index) => (
                      <div key={option.value} className="flex items-center">
                        <DropdownMenuItem
                          className={cn(
                            'w-[110px] text-zinc-600',
                            index === 0 && 'pr-1 pl-2',
                            index === 1 && 'pr-2 text-zinc-600',
                            currentIDE === option.value && 'text-zinc-900'
                          )}
                          onClick={() => {
                            updateDevboxIDE(option.value, devboxName);
                            handleGotoIDE(option.value);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Image
                              width={18}
                              height={18}
                              alt={option.value}
                              src={`/images/ide/${option.value}.svg`}
                            />
                            <span className="whitespace-nowrap">{option.menuLabel}</span>
                            {currentIDE === option.value && (
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
                      currentIDE === item.value && 'text-zinc-900'
                    )}
                    onClick={() => {
                      updateDevboxIDE(item.value, devboxName);
                      handleGotoIDE(item.value);
                    }}
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
                    {currentIDE === item.value && <Check className="h-4 w-4 text-blue-600" />}
                  </DropdownMenuItem>
                )
              )}
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
    menuLabel: 'VSCode',
    icon: 'vscode',
    prefix: 'vscode://',
    value: 'vscode',
    sortId: 0,
    group: ''
  },
  vscodeInsiders: {
    label: 'Insiders',
    menuLabel: 'VSCode Insiders',
    icon: 'vscodeInsiders',
    prefix: 'vscode-insiders://',
    value: 'vscodeInsiders',
    sortId: 1,
    group: ''
  },
  cursor: {
    label: 'Cursor',
    menuLabel: 'Cursor',
    icon: 'cursor',
    prefix: 'cursor://',
    value: 'cursor',
    sortId: 2,
    group: ''
  },
  windsurf: {
    label: 'Windsurf',
    menuLabel: 'Windsurf',
    icon: 'windsurf',
    prefix: 'windsurf://',
    value: 'windsurf',
    sortId: 3,
    group: ''
  },
  trae: {
    label: 'Trae',
    menuLabel: 'Trae',
    icon: 'trae',
    prefix: 'trae://',
    value: 'trae',
    sortId: 4,
    group: 'trae'
  },
  traeCN: {
    label: 'Trae CN',
    menuLabel: 'Trae CN',
    icon: 'trae',
    prefix: 'trae-cn://',
    value: 'traeCN',
    sortId: 4,
    group: 'trae'
  },
  toolbox: {
    label: 'Toolbox',
    icon: 'toolbox',
    menuLabel: 'Toolbox',
    prefix: '-',
    value: 'toolbox',
    sortId: 5,
    group: 'jetbrains'
  },
  gateway: {
    label: 'Gateway',
    icon: 'gateway',
    menuLabel: 'Gateway',
    prefix: '-',
    value: 'gateway',
    sortId: 5,
    group: 'jetbrains'
  }
} as const;

const menuItems = Object.values(ideObj)
  .sort((a, b) => a.sortId - b.sortId)
  .reduce((acc, item) => {
    if (item.group === 'trae' && !acc.some((i) => i.group === 'trae')) {
      acc.push({
        value: 'trae-group' as IDEType,
        menuLabel: 'Trae',
        group: 'trae',
        options: [
          { value: 'trae', menuLabel: 'Trae' },
          { value: 'traeCN', menuLabel: 'Trae CN' }
        ]
      });
    } else if (item.group === 'jetbrains' && !acc.some((i) => i.group === 'jetbrains')) {
      acc.push({
        value: 'jetbrains-group' as IDEType,
        menuLabel: 'JetBrains',
        group: 'jetbrains',
        options: [
          { value: 'toolbox', menuLabel: 'Toolbox' },
          { value: 'gateway', menuLabel: 'Gateway' }
        ]
      });
    } else if (item.group === '') {
      acc.push({ value: item.value, menuLabel: item.menuLabel });
    }
    return acc;
  }, [] as MenuItem[]);

export default IDEButton;
