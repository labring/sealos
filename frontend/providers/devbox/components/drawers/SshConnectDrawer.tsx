'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileCode } from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stepper, Step, StepIndicator } from '@/components/ui/stepper';

import {
  macosAndLinuxScriptsTemplate,
  sshConfig,
  sshConfigInclude,
  sshConnectCommand,
  windowsScriptsTemplate
} from '@/constants/scripts';
import { downLoadBlob, useCopyData } from '@/utils/tools';

import ScriptCode from '@/components/ScriptCode';
import { JetBrainsGuideData } from '@/components/IDEButton';

const systemList = ['Windows', 'Mac', 'Linux'];

enum stepEnum {
  OneClick = 'one-click',
  StepByStep = 'step-by-step'
}

interface SshConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}

const SshConnectDrawer = ({
  onClose,
  jetbrainsGuideData,
  onSuccess,
  open
}: SshConnectModalProps) => {
  const t = useTranslations();
  const { copyData } = useCopyData();

  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(stepEnum.OneClick);

  useEffect(() => {
    const detectPlatform = () => {
      if (window.navigator.platform) {
        const platform = window.navigator.platform.toLowerCase();
        console.log('platform', platform);
        if (platform.includes('windows')) return 0;
        if (platform.includes('mac')) return 1;
        if (platform.includes('linux')) return 2;
      }

      const userAgent = window.navigator.userAgent.toLowerCase();
      console.log('userAgent', userAgent);
      if (userAgent.includes('win')) return 0;
      if (userAgent.includes('mac')) return 1;
      if (userAgent.includes('linux')) return 2;

      return 0;
    };

    setActiveTab(detectPlatform());
  }, []);

  const script = useMemo(() => {
    if (activeTab === 0) {
      return {
        platform: 'Windows',
        script: windowsScriptsTemplate(
          jetbrainsGuideData.privateKey,
          jetbrainsGuideData.configHost,
          jetbrainsGuideData.host,
          jetbrainsGuideData.port,
          jetbrainsGuideData.userName
        )
      };
    } else if (activeTab === 1) {
      return {
        platform: 'Mac',
        script: macosAndLinuxScriptsTemplate(
          jetbrainsGuideData.privateKey,
          jetbrainsGuideData.configHost,
          jetbrainsGuideData.host,
          jetbrainsGuideData.port,
          jetbrainsGuideData.userName
        )
      };
    } else {
      return {
        platform: 'Linux',
        script: macosAndLinuxScriptsTemplate(
          jetbrainsGuideData.privateKey,
          jetbrainsGuideData.configHost,
          jetbrainsGuideData.host,
          jetbrainsGuideData.port,
          jetbrainsGuideData.userName
        )
      };
    }
  }, [activeTab, jetbrainsGuideData]);

  const downloadScript = () => {
    if (script.platform === 'Windows') {
      downLoadBlob(script.script, 'text/plain', `ssh-config-${jetbrainsGuideData.devboxName}.ps1`);
    } else {
      downLoadBlob(script.script, 'text/plain', `ssh-config-${jetbrainsGuideData.devboxName}.sh`);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('jetbrains_guide_config_ssh')}</DrawerTitle>
        </DrawerHeader>
        {/* system tabs */}
        <Tabs
          defaultValue={systemList[activeTab]}
          onValueChange={(value) => setActiveTab(systemList.indexOf(value))}
        >
          <TabsList variant="underline">
            {systemList.map((item) => (
              <TabsTrigger key={item} value={item} variant="underline">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* main body */}
        <div className="flex flex-shrink-0 flex-col gap-5 p-6">
          <Tabs
            defaultValue={stepEnum.OneClick}
            onValueChange={(value) => setActiveStep(value as stepEnum)}
          >
            <TabsList className="w-60">
              <TabsTrigger value={stepEnum.OneClick}>
                {t('jetbrains_guide_one_click_setup')}
              </TabsTrigger>
              <TabsTrigger value={stepEnum.StepByStep}>
                {t('jetbrains_guide_step_by_step')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollArea className="max-h-[calc(100vh-200px)]">
            {activeStep === stepEnum.OneClick && (
              <Stepper orientation="vertical">
                <Step>
                  <StepIndicator>1</StepIndicator>
                  <div className="flex flex-col gap-3">
                    <span className="text-sm/5 font-semibold">{t('run_script')}</span>
                    <div className="flex w-[366px] flex-col gap-4">
                      <div className="flex flex-col gap-3">
                        <div
                          className="flex cursor-pointer flex-col items-center justify-center gap-6 rounded-xl border border-zinc-900 bg-white px-4 py-6 shadow-sm hover:bg-muted/50"
                          onClick={downloadScript}
                        >
                          <FileCode className="h-5 w-5 text-zinc-900" />
                          <span className="text-sm/5 font-medium text-zinc-900">
                            {t('download_script')}
                          </span>
                        </div>
                        <div className="text-sm/5 text-zinc-900">
                          {script.platform === 'Windows'
                            ? t.rich('jetbrains_guide_one_click_setup_desc_windows', {
                                blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                              })
                            : t.rich('jetbrains_guide_one_click_setup_desc', {
                                blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                              })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="text-sm text-zinc-500">
                          {t('jetbrains_guide_one_click_setup_desc_2')}
                        </div>
                        <ScriptCode platform={script.platform} script={script.script} />
                      </div>
                    </div>
                  </div>
                </Step>

                <Step>
                  <StepIndicator>2</StepIndicator>
                  <div className="flex w-[366px] min-w-0 flex-col gap-3">
                    <span className="text-sm/5 font-semibold">{t('verify_connection')}</span>
                    <ScriptCode
                      oneLine
                      defaultOpen
                      platform={script.platform}
                      script={sshConnectCommand(jetbrainsGuideData.configHost)}
                    />
                    <div className="text-sm/5 text-zinc-900">{t('jetbrains_guide_command')}</div>
                  </div>
                </Step>
              </Stepper>
            )}

            {activeStep === stepEnum.StepByStep && (
              <Stepper orientation="vertical">
                <Step>
                  <StepIndicator>1</StepIndicator>
                  <div className="flex w-[366px] flex-col gap-3">
                    <div className="text-sm/5 text-zinc-900">
                      {t.rich('jetbrains_guide_download_private_key', {
                        blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                      })}
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          downLoadBlob(
                            jetbrainsGuideData.privateKey,
                            'application/octet-stream',
                            `${jetbrainsGuideData.configHost}`
                          );
                        }}
                      >
                        <Download className="h-5 w-5" />
                        <span className="text-sm/5 font-medium text-zinc-900">
                          {t('download_private_key')}
                        </span>
                      </Button>
                    </div>
                  </div>
                </Step>

                <Step>
                  <StepIndicator>2</StepIndicator>
                  <div className="flex w-[366px] flex-col gap-3">
                    <span className="text-sm/5 text-zinc-900">
                      {t('jetbrains_guide_move_to_path')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm/5 text-blue-600">~/.ssh/sealos</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyData('~/.ssh/sealos')}
                        className="h-fit w-fit has-[>svg]:p-0"
                      >
                        <Copy className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </div>
                  </div>
                </Step>

                <Step>
                  <StepIndicator>3</StepIndicator>
                  <div className="flex w-[366px] flex-col gap-3">
                    <div className="text-sm/5 text-zinc-900">
                      {t.rich('jetbrains_guide_modified_config', {
                        blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                      })}
                    </div>
                    <ScriptCode
                      oneLine={true}
                      defaultOpen={true}
                      platform={script.platform}
                      script={sshConfigInclude}
                    />
                  </div>
                </Step>

                <Step>
                  <StepIndicator>4</StepIndicator>
                  <div className="flex w-[366px] flex-col gap-3">
                    <div className="text-sm/5 text-zinc-900">
                      {t.rich('jetbrains_guide_modified_file', {
                        blue: (chunks) => <span className="text-blue-600">{chunks}</span>
                      })}
                    </div>
                    <ScriptCode
                      platform={script.platform}
                      defaultOpen
                      script={sshConfig(
                        jetbrainsGuideData.configHost,
                        jetbrainsGuideData.host,
                        jetbrainsGuideData.port,
                        jetbrainsGuideData.userName
                      )}
                    />
                  </div>
                </Step>

                <Step>
                  <StepIndicator>5</StepIndicator>
                  <div className="flex w-[366px] flex-col gap-3">
                    <div className="text-sm/5 text-zinc-900">{t('jetbrains_guide_command')}</div>
                    <ScriptCode
                      oneLine={true}
                      defaultOpen={true}
                      platform={script.platform}
                      script={sshConnectCommand(jetbrainsGuideData.configHost)}
                    />
                  </div>
                </Step>
              </Stepper>
            )}
          </ScrollArea>
        </div>
        <DrawerFooter>
          <div
            className="flex w-full items-center justify-center rounded-b-2xl text-sm/5 font-medium text-zinc-900 hover:bg-zinc-100"
            onClick={onClose}
          >
            {t('setup_complete')}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default SshConnectDrawer;
