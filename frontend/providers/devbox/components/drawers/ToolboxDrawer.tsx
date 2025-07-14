import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { ArrowUpRight, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectDrawer from '@/components/drawers/SshConnectDrawer';
import { Stepper, Step, StepIndicator } from '@/components/ui/stepper';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface ToolboxModalProps {
  open: boolean;
  onClose: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}

const ToolboxDrawer = ({ open, onClose, jetbrainsGuideData }: ToolboxModalProps) => {
  const t = useTranslations();

  const [onConnecting, setOnConnecting] = useState(false);
  const [onOpenSSHConnectDrawer, setOnOpenSSHConnectDrawer] = useState(false);

  const connectToolbox = useCallback(async () => {
    setOnConnecting(true);

    window.open(`jetbrains://gateway/ssh/environment?h=${jetbrainsGuideData.configHost}`, '_blank');

    setOnConnecting(false);
  }, [jetbrainsGuideData]);

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('use_jetbrains_toolbox')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-shrink-0 flex-col gap-5 p-6">
          {/* title*/}
          <p className="text-sm/5 font-semibold">{t('jetbrains_guide_prepare')}</p>
          {/* stepper */}
          <Stepper orientation="vertical" activeStep={-1}>
            {/* 1 */}
            <Step>
              <StepIndicator>1</StepIndicator>
              <div className="flex flex-col items-start gap-3">
                <span className="text-sm/5 text-zinc-900">
                  {t.rich('jetbrains_guide_prepare_install_toolbox', {
                    blue: (chunks) => <span className="font-medium text-blue-600">{chunks}</span>
                  })}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open('https://www.jetbrains.com/toolbox-app', '_blank');
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  JetBrains Toolbox
                </Button>
              </div>
            </Step>
            {/* 2 */}
            <Step>
              <StepIndicator>2</StepIndicator>
              <div className="flex flex-col items-start gap-3">
                <span className="text-sm/5 text-zinc-900">
                  {t.rich('jetbrains_guide_click_to_config', {
                    blue: (chunks) => <span className="font-medium text-blue-600">{chunks}</span>
                  })}
                </span>
                <Button variant="outline" onClick={() => setOnOpenSSHConnectDrawer(true)}>
                  <Settings className="h-4 w-4" />
                  {t('jetbrains_guide_config_ssh')}
                </Button>
              </div>
            </Step>
          </Stepper>
          {/* connect button*/}
          <Button variant="outline" onClick={connectToolbox} disabled={onConnecting}>
            {t('jetbrains_guide_start_to_connect')}
          </Button>
          {onOpenSSHConnectDrawer && (
            <SshConnectDrawer
              open={onOpenSSHConnectDrawer}
              onClose={() => setOnOpenSSHConnectDrawer(false)}
              onSuccess={() => {}}
              jetbrainsGuideData={jetbrainsGuideData}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ToolboxDrawer;
