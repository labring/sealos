'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import {
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepNumber,
  StepSeparator,
  StepCircle
} from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  macosAndLinuxScriptsTemplate,
  sshConfig,
  sshConfigInclude,
  sshConnectCommand,
  windowsScriptsTemplate
} from '@/constants/scripts';
import { downLoadBlob, useCopyData } from '@/utils/tools';

import ScriptCode from '../ScriptCode';
import { JetBrainsGuideData } from '../IDEButton';

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

const SshConnectModal = ({
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="h-[785px] w-[700px] max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="pl-10">{t('jetbrains_guide_config_ssh')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pb-6">
          <Tabs
            defaultValue={systemList[activeTab]}
            onValueChange={(value) => setActiveTab(systemList.indexOf(value))}
            className="mb-4"
          >
            <TabsList>
              {systemList.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Tabs
            defaultValue={stepEnum.OneClick}
            onValueChange={(value) => setActiveStep(value as stepEnum)}
            className="my-8"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={stepEnum.OneClick}>
                {t('jetbrains_guide_one_click_setup')}
              </TabsTrigger>
              <TabsTrigger value={stepEnum.StepByStep}>
                {t('jetbrains_guide_step_by_step')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeStep === stepEnum.OneClick && (
            <>
              <Stepper orientation="vertical" gap={0} className="mt-3">
                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>1</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex flex-1 flex-col gap-6">
                    <div
                      className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-primary p-2 hover:bg-primary/5"
                      onClick={() => {
                        if (script.platform === 'Windows') {
                          downLoadBlob(
                            script.script,
                            'text/plain',
                            `ssh-config-${jetbrainsGuideData.devboxName}.ps1`
                          );
                        } else {
                          downLoadBlob(
                            script.script,
                            'text/plain',
                            `ssh-config-${jetbrainsGuideData.devboxName}.sh`
                          );
                        }
                      }}
                    >
                      <FileText className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        {t('jetbrains_guide_click_to_download')}
                      </span>
                    </div>
                    <div className="text-sm leading-5 font-medium">
                      {script.platform === 'Windows'
                        ? t.rich('jetbrains_guide_one_click_setup_desc_windows', {
                            blue: (chunks) => (
                              <span className="font-bold text-primary">{chunks}</span>
                            )
                          })
                        : t.rich('jetbrains_guide_one_click_setup_desc', {
                            blue: (chunks) => (
                              <span className="font-bold text-primary">{chunks}</span>
                            )
                          })}
                    </div>
                    <div className="text-sm leading-5">
                      {t.rich('jetbrains_guide_one_click_setup_desc_2', {
                        lightColor: (chunks) => (
                          <span className="text-muted-foreground">{chunks}</span>
                        )
                      })}
                    </div>
                    <ScriptCode platform={script.platform} script={script.script} />
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>2</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex flex-1 flex-col gap-6">
                    <div className="text-sm">{t('jetbrains_guide_command')}</div>
                    <ScriptCode
                      oneLine={true}
                      defaultOpen={true}
                      platform={script.platform}
                      script={sshConnectCommand(jetbrainsGuideData.configHost)}
                    />
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepCircle className="absolute -top-3 left-2.5 h-2.5 w-2.5 bg-gray-100" />
                </Step>
              </Stepper>

              <div className="relative mt-8 h-[30px] w-full">
                <Button
                  variant="outline"
                  className="h-9 w-full border-green-600 text-green-600 hover:bg-green-50"
                  onClick={onClose}
                >
                  {t('jetbrains_guide_confirm')}
                </Button>
              </div>
            </>
          )}

          {activeStep === stepEnum.StepByStep && (
            <>
              <Stepper orientation="vertical" gap={0} className="relative mt-3">
                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>1</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex-1">
                    <div className="mb-3 text-sm">
                      {t.rich('jetbrains_guide_download_private_key', {
                        blue: (chunks) => <span className="font-bold text-primary">{chunks}</span>
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => {
                        downLoadBlob(
                          jetbrainsGuideData.privateKey,
                          'application/octet-stream',
                          `${jetbrainsGuideData.configHost}`
                        );
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {t('download_private_key')}
                    </Button>
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>2</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex h-10 flex-1 items-center">
                    <div className="text-sm">
                      {t.rich('jetbrains_guide_move_to_path', {
                        blue: (chunks) => <span className="font-bold text-primary">{chunks}</span>
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 hover:text-primary"
                      onClick={() => copyData('~/.ssh/sealos')}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>3</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex flex-1 flex-col gap-4">
                    <div className="text-sm">
                      {t.rich('jetbrains_guide_modified_config', {
                        blue: (chunks) => <span className="font-bold text-primary">{chunks}</span>
                      })}
                    </div>
                    <ScriptCode
                      oneLine={true}
                      defaultOpen={true}
                      platform={script.platform}
                      script={sshConfigInclude}
                    />
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>4</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex flex-1 flex-col gap-4">
                    <div className="text-sm">
                      {t.rich('jetbrains_guide_modified_file', {
                        blue: (chunks) => <span className="font-bold text-primary">{chunks}</span>
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
                  <StepSeparator />
                </Step>

                <Step>
                  <StepIndicator className="border-gray-100 bg-gray-100">
                    <StepStatus incomplete={<StepNumber>5</StepNumber>} />
                  </StepIndicator>
                  <div className="mt-1 mb-5 ml-2 flex flex-1 flex-col gap-4">
                    <div className="text-sm">{t('jetbrains_guide_command')}</div>
                    <ScriptCode
                      oneLine={true}
                      defaultOpen={true}
                      platform={script.platform}
                      script={sshConnectCommand(jetbrainsGuideData.configHost)}
                    />
                  </div>
                  <StepSeparator />
                </Step>

                <Step>
                  <StepCircle className="absolute -top-3 left-2.5 h-2.5 w-2.5 bg-gray-100" />
                </Step>
              </Stepper>

              <div className="relative mt-4 h-[30px] w-full">
                <Button
                  variant="outline"
                  className="h-9 w-full border-green-600 text-green-600 hover:bg-green-50"
                  onClick={onClose}
                >
                  {t('jetbrains_guide_confirm')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SshConnectModal;
