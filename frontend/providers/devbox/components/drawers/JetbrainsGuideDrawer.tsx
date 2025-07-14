import Image from 'next/image';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, OctagonAlert, Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectDrawer from '@/components/drawers/SshConnectDrawer';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Stepper, Step, StepIndicator } from '@/components/ui/stepper';

import { cn } from '@/lib/utils';
import { execCommandInDevboxPod } from '@/api/devbox';

interface JetBrainsGuideDrawerProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}

const JetBrainsGuideDrawer = ({ open, onClose, jetbrainsGuideData }: JetBrainsGuideDrawerProps) => {
  const t = useTranslations();

  const controllerRef = useRef<AbortController | null>(null);

  const recommendIDE = runtimeTypeToIDEType(jetbrainsGuideData.runtimeType);

  const [progress, setProgress] = useState(0);
  const [selectedIDE, setSelectedIDE] = useState<JetbrainsIDEObj>(recommendIDE);
  const [onConnecting, setOnConnecting] = useState(false);
  const [onOpenSSHConnectDrawer, setOnOpenSSHConnectDrawer] = useState(false);

  const connectIDE = useCallback(
    async (idePathName: string, version: string) => {
      window.open(
        `jetbrains-gateway://connect#host=${
          jetbrainsGuideData.configHost
        }&type=ssh&deploy=false&projectPath=${encodeURIComponent(
          jetbrainsGuideData.workingDir
        )}&user=${encodeURIComponent(jetbrainsGuideData.userName)}&port=${encodeURIComponent(
          jetbrainsGuideData.port
        )}&idePath=%2Fhome%2Fdevbox%2F.cache%2FJetBrains%2F${idePathName}${version}`,
        '_blank'
      );
    },
    [jetbrainsGuideData]
  );

  const handleConnectIDE = useCallback(async () => {
    setOnConnecting(true);

    const res = await fetch(
      `https://data.services.jetbrains.com/products/releases?code=${selectedIDE.productCode}&type=release&latest=true&build=`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await res.json();

    const controller = new AbortController();
    controllerRef.current = controller;

    const version = data[selectedIDE.productCode][0].version;
    const downloadLink = data[selectedIDE.productCode][0].downloads['linux']['link'];
    const idePathName = selectedIDE.value;

    // NOTE: workingDir /home/devbox/project -> /home/devbox, workingDir maybe change in the future
    const basePath = jetbrainsGuideData.workingDir.split('/').slice(0, -1).join('/');

    const execDownloadCommand = `
    IDE_DIR="${basePath}/.cache/JetBrains/${idePathName}${version}";
    if [ -d "$IDE_DIR" ] && [ ! -f "$IDE_DIR/bin/${selectedIDE.binName}" ]; then
      rm -rf "$IDE_DIR";
    fi;
    [ ! -d ${basePath}/.cache/JetBrains/${idePathName}${version} ] && mkdir -p ${basePath}/.cache/JetBrains/${idePathName}${version} && wget -q --show-progress --progress=bar:force -O- ${downloadLink} | tar -xzC ${basePath}/.cache/JetBrains/${idePathName}${version} --strip-components=1 && chmod -R 776 ${basePath}/.cache && chown -R devbox:devbox ${basePath}/.cache`;

    try {
      await execCommandInDevboxPod({
        devboxName: jetbrainsGuideData.devboxName,
        command: execDownloadCommand,
        idePath: `/home/devbox/.cache/JetBrains/${idePathName}${version}`,
        onDownloadProgress: (progressEvent) => {
          const text = progressEvent.event.target.response;
          const progressMatch = text.match(/\s+(\d+)%\[/g);
          const progress = progressMatch
            ? parseInt(progressMatch[progressMatch.length - 1].split('%')[0])
            : null;

          if (progress) {
            setProgress(progress);
          }
        },
        signal: controller.signal
      });
      setOnConnecting(false);
      setProgress(0);
    } catch (error: any) {
      if (
        !error ||
        error.startsWith('nvidia driver modules are not yet loaded, invoking runc directly') ||
        error.includes('100%')
      ) {
        connectIDE(idePathName, version);
      }
      setProgress(0);
      setOnConnecting(false);
    }
  }, [selectedIDE, jetbrainsGuideData.devboxName, connectIDE, jetbrainsGuideData.workingDir]);

  const debouncedHandleConnectIDE = useMemo(
    () => debounce(handleConnectIDE, 3000),
    [handleConnectIDE]
  );

  useEffect(() => {
    return () => {
      debouncedHandleConnectIDE.cancel();
    };
  }, [debouncedHandleConnectIDE]);

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('use_jetbrains')}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="pr-2">
          <div className="flex h-full flex-col gap-5 p-6">
            {/* prepare */}
            <div className="flex flex-col gap-5">
              <span className="leading-6 font-semibold">{t('jetbrains_guide_prepare')}</span>
              <Stepper orientation="vertical">
                <Step>
                  <StepIndicator>1</StepIndicator>
                  <div className="flex flex-col gap-3">
                    <div className="text-sm">
                      {t.rich('jetbrains_guide_prepare_install', {
                        blue: (chunks) => (
                          <span className="font-medium text-blue-600">{chunks}</span>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="w-fit"
                      onClick={() => {
                        window.open('https://code-with-me.jetbrains.com/remoteDev', '_blank');
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      JetBrains Gateway
                    </Button>
                  </div>
                </Step>

                <Step>
                  <StepIndicator>2</StepIndicator>
                  <div className="flex flex-col gap-3">
                    <div className="text-sm">
                      {t.rich('jetbrains_guide_click_to_config', {
                        blue: (chunks) => (
                          <span className="font-medium text-blue-600">{chunks}</span>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="w-fit"
                      onClick={() => setOnOpenSSHConnectDrawer(true)}
                    >
                      <Settings className="h-4 w-4" />
                      {t('jetbrains_guide_config_ssh')}
                    </Button>
                  </div>
                </Step>
              </Stepper>
            </div>
            <Separator />
            {/* get started */}
            <div className="flex flex-col gap-2">
              <span className="leading-6 font-semibold">{t('jetbrains_guide_start_to_use')}</span>
              <span className="text-sm font-normal">{t('jetbrains_guide_select_ide')}</span>
              <div className="grid grid-cols-3 gap-3">
                {Object.values(jetbrainsIDEObj).map((ideType: any) => (
                  <div
                    className={cn(
                      'relative flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border bg-white px-6 hover:bg-zinc-50',
                      selectedIDE === ideType && 'border-zinc-900',
                      onConnecting && 'pointer-events-none cursor-not-allowed opacity-50'
                    )}
                    onClick={() => {
                      if (!onConnecting) {
                        setSelectedIDE(ideType);
                      }
                    }}
                    key={ideType.value}
                  >
                    <Image
                      src={`/images/ide/${ideType.value}.svg`}
                      alt={ideType.label}
                      width={32}
                      height={32}
                    />
                    <span className="w-full truncate text-center text-xs text-zinc-900">
                      {ideType.label}
                    </span>
                    {recommendIDE === ideType && (
                      <div className="absolute top-1.5 left-0 rounded-r bg-blue-100 px-1 py-0.25 text-xs text-blue-600">
                        {t('recommend')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* connect button */}
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                variant="outline"
                onClick={!onConnecting ? debouncedHandleConnectIDE : undefined}
                className={cn(
                  'w-full',
                  onConnecting && 'pointer-events-none cursor-not-allowed hover:bg-white'
                )}
                size="lg"
              >
                {onConnecting ? (
                  <div className="pointer-events-auto relative flex w-full items-center justify-center">
                    {t.rich('jetbrains_guide_connecting', {
                      process: progress
                    })}
                    <button
                      className="ml-6 text-blue-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        controllerRef.current?.abort();
                        controllerRef.current = null;
                        setProgress(0);
                        setOnConnecting(false);
                      }}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  t('jetbrains_guide_start_to_connect')
                )}
              </Button>
              <p className="flex items-center text-sm text-zinc-600">
                <OctagonAlert className="mr-1 h-4 w-4 text-zinc-600" />
                {t.rich('jetbrains_guide_connect_tip', {
                  blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                })}
              </p>
            </div>
            {/* Learn more */}
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="leading-6 font-semibold">{t('jetbrains_guide_learn_more')}</span>
              <p className="text-sm text-zinc-900">{t('jetbrains_guide_learn_more_desc')}</p>
              {/* TODO: add user guide url */}
              <Button variant="outline" className="w-fit">
                <ArrowUpRight className="h-4 w-4" />
                {t('jetbrains_guide_user_guide')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>

      <SshConnectDrawer
        open={onOpenSSHConnectDrawer}
        onClose={() => setOnOpenSSHConnectDrawer(false)}
        onSuccess={() => {}}
        jetbrainsGuideData={jetbrainsGuideData}
      />
    </Drawer>
  );
};

// TODO: abstract all this kind data to a new file
interface JetbrainsIDEObj {
  label: string;
  value: string;
  binName: string;
  productCode: string;
}
const jetbrainsIDEObj: { [key: string]: JetbrainsIDEObj } = {
  IntelliJ: {
    label: 'IntelliJ IDEA',
    value: 'intellij',
    binName: 'idea.sh',
    productCode: 'IIU'
  },
  PyCharm: {
    label: 'PyCharm',
    value: 'pycharm',
    binName: 'pycharm.sh',
    productCode: 'PCP'
  },
  WebStorm: {
    label: 'WebStorm',
    value: 'webstorm',
    binName: 'webstorm.sh',
    productCode: 'WS'
  },
  Rider: {
    label: 'Rider',
    value: 'rider',
    binName: 'rider.sh',
    productCode: 'RD'
  },
  CLion: {
    label: 'CLion',
    value: 'clion',
    binName: 'clion.sh',
    productCode: 'CL'
  },
  GoLand: {
    label: 'GoLand',
    value: 'goland',
    binName: 'goland.sh',
    productCode: 'GO'
  },
  RubyMine: {
    label: 'RubyMine',
    value: 'rubymine',
    binName: 'rubymine.sh',
    productCode: 'RM'
  },
  PhpStorm: {
    label: 'PhpStorm',
    value: 'phpstorm',
    binName: 'phpstorm.sh',
    productCode: 'PS'
  },
  RustRover: {
    label: 'RustRover',
    value: 'rustover',
    binName: 'rustover.sh',
    productCode: 'RR'
  }
};

const runtimeTypeToIDEType = (runtimeType: string): any => {
  switch (runtimeType) {
    // Python
    case 'python':
    case 'django':
    case 'flask':
      return jetbrainsIDEObj.PyCharm;

    // Go
    case 'go':
    case 'gin':
    case 'echo':
    case 'hertz':
    case 'iris':
    case 'chi':
      return jetbrainsIDEObj.GoLand;

    // Frontend and nodejs
    case 'angular':
    case 'ant-design':
    case 'astro':
    case 'chakra-ui':
    case 'express.js':
    case 'react':
    case 'vue':
    case 'react':
    case 'hexo':
    case 'hugo':
    case 'sealaf':
    case 'nuxt3':
    case 'svelte':
    case 'umi':
    case 'vitepress':
    case 'next.js':
    case 'nest.js':
    case 'node.js':
    case 'docusaurus':
      return jetbrainsIDEObj.WebStorm;

    // C/C++
    case 'c':
    case 'cpp':
      return jetbrainsIDEObj.CLion;

    // Java
    case 'java':
    case 'quarkus':
    case 'vert.x':
    case 'spring-boot':
      return jetbrainsIDEObj.IntelliJ;

    // PHP
    case 'php':
    case 'laravel':
      return jetbrainsIDEObj.PhpStorm;

    // Ruby
    case 'ruby':
    case 'rails':
      return jetbrainsIDEObj.RubyMine;

    // Rust
    case 'rust':
    case 'rocket':
      return jetbrainsIDEObj.RustRover;

    // other
    case 'debian-ssh':
    case 'custom':
    default:
      return jetbrainsIDEObj.IntelliJ;
  }
};

export default JetBrainsGuideDrawer;
