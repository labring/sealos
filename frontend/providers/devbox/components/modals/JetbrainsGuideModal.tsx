import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Info, Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectDrawer from '@/components/modals/SshConnectDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { cn } from '@/lib/utils';
import { execCommandInDevboxPod } from '@/api/devbox';

interface JetBrainsGuideModalProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}

const JetBrainsGuideModal = ({ open, onClose, jetbrainsGuideData }: JetBrainsGuideModalProps) => {
  const t = useTranslations();

  const controllerRef = useRef<AbortController | null>(null);

  const recommendIDE = runtimeTypeToIDEType(jetbrainsGuideData.runtimeType);

  const [selectedIDE, setSelectedIDE] = useState<JetbrainsIDEObj>(recommendIDE);

  const [progress, setProgress] = useState(0);
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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[785px] w-[700px] max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="pl-10">{t('use_jetbrains')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pb-6">
          {/* prepare */}
          <div className="pb-6">
            <h3 className="mb-6 text-lg font-bold">{t('jetbrains_guide_prepare')}</h3>
            <div className="relative mt-4">
              {/* 1 */}
              <div className="relative pb-5 pl-8 before:absolute before:top-3 before:left-3 before:h-full before:w-[1px] before:bg-border">
                <div className="absolute top-1 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  1
                </div>
                <div className="mt-1">
                  <div className="mb-3 text-sm">
                    {t.rich('jetbrains_guide_prepare_install', {
                      blue: (chunks) => (
                        <span className="inline-block font-bold text-blue-600">{chunks}</span>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-blue-600"
                    onClick={() => {
                      window.open('https://code-with-me.jetbrains.com/remoteDev', '_blank');
                    }}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    JetBrains Gateway
                  </Button>
                </div>
              </div>
              {/* 2 */}
              <div className="relative pb-5 pl-8 before:absolute before:top-3 before:left-3 before:h-full before:w-[1px] before:bg-border">
                <div className="absolute top-1 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  2
                </div>
                <div className="mt-1">
                  <div className="mb-3 text-sm">
                    {t.rich('jetbrains_guide_click_to_config', {
                      blue: (chunks) => (
                        <span className="inline-block font-bold text-blue-600">{chunks}</span>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-blue-600"
                    onClick={() => setOnOpenSSHConnectDrawer(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t('jetbrains_guide_config_ssh')}
                  </Button>
                </div>
              </div>
              {/* done */}
              <div className="absolute -bottom-1 left-3 h-2.5 w-2.5 rounded-full bg-muted" />
            </div>
          </div>
          <Separator />
          <div className="pt-6 pb-6">
            <div className="mb-6 flex items-center">
              <h3 className="mr-2 text-lg font-bold">{t('jetbrains_guide_start_to_use')}</h3>
            </div>
            <p className="text-sm font-normal">{t('jetbrains_guide_select_ide')}</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {Object.values(jetbrainsIDEObj).map((ideType: any) => (
                <div key={ideType.value}>
                  <div
                    className={cn(
                      'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border p-4',
                      selectedIDE === ideType
                        ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_2.4px_rgba(33,155,244,0.15)]'
                        : 'border-gray-200 bg-gray-50 hover:bg-blue-50',
                      onConnecting && 'cursor-not-allowed opacity-50 hover:bg-gray-50'
                    )}
                    onClick={() => {
                      if (!onConnecting) {
                        setSelectedIDE(ideType);
                      }
                    }}
                  >
                    {/* <MyIcon name={ideType.value as any} className="h-9 w-9 text-gray-600" /> */}
                    <span>{ideType.label}</span>
                    {recommendIDE === ideType && (
                      <div className="absolute top-1.5 left-0 rounded-r bg-yellow-100 px-2.5 py-0.5 text-xs text-yellow-600">
                        {t('recommend')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className={cn(
                'relative mt-4 h-9 w-full',
                onConnecting
                  ? 'border-blue-500'
                  : 'border-gray-200 hover:border-blue-500 hover:text-blue-600'
              )}
              variant="outline"
              onClick={debouncedHandleConnectIDE}
              disabled={onConnecting}
            >
              {onConnecting ? (
                <div className="relative flex w-full items-center justify-center">
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
                    {t('jetbrains_guide_cancel')}
                  </button>
                  <Progress value={progress} className="absolute right-0 -bottom-2.5 left-0" />
                </div>
              ) : (
                t('jetbrains_guide_start_to_connect')
              )}
            </Button>
            {onConnecting && (
              <div className="mt-4 flex items-center justify-center rounded-lg bg-blue-50 p-2">
                <Info className="mr-1 h-4 w-4 text-blue-600" />
                <span className="text-sm font-normal text-blue-600">
                  {t('jetbrains_guide_connecting_info')}
                </span>
              </div>
            )}
          </div>
          <SshConnectDrawer
            open={onOpenSSHConnectDrawer}
            onClose={() => setOnOpenSSHConnectDrawer(false)}
            onSuccess={() => {}}
            jetbrainsGuideData={jetbrainsGuideData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

export default JetBrainsGuideModal;
