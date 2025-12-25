import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { ArrowUpRight, Settings } from 'lucide-react';

import { Button } from '@sealos/shadcn-ui/button';
import { SSHConnectionData } from '@/components/IDEButton';
import SshConnectDrawer from '@/components/drawers/SshConnectDrawer';
import { Stepper, Step, StepIndicator } from '@sealos/shadcn-ui/stepper';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sealos/shadcn-ui/drawer';

interface ZedDrawerProps {
  open: boolean;
  onClose: () => void;
  sshConnectionData: SSHConnectionData;
}

const ZedDrawer = ({ open, onClose, sshConnectionData }: ZedDrawerProps) => {
  const t = useTranslations();

  const [onConnecting, setOnConnecting] = useState(false);
  const [onOpenSSHConnectDrawer, setOnOpenSSHConnectDrawer] = useState(false);

  const connectZed = useCallback(async () => {
    setOnConnecting(true);

    const zedUri = `zed://ssh/${sshConnectionData.configHost}${sshConnectionData.workingDir}`;
    window.open(zedUri, '_blank');

    setOnConnecting(false);
  }, [sshConnectionData]);

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('use_zed')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-shrink-0 flex-col gap-5 p-6">
          <p className="text-sm/5 font-semibold">{t('zed_guide_prepare')}</p>
          <Stepper orientation="vertical" activeStep={-1}>
            <Step>
              <StepIndicator>1</StepIndicator>
              <div className="flex flex-col items-start gap-3">
                <span className="text-sm/5 text-zinc-900">
                  {t.rich('zed_guide_prepare_install', {
                    blue: (chunks) => <span className="font-medium text-blue-600">{chunks}</span>
                  })}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open('https://zed.dev', '_blank');
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Zed
                </Button>
              </div>
            </Step>
            <Step>
              <StepIndicator>2</StepIndicator>
              <div className="flex flex-col items-start gap-3">
                <span className="text-sm/5 text-zinc-900">
                  {t.rich('zed_guide_click_to_config', {
                    blue: (chunks) => <span className="font-medium text-blue-600">{chunks}</span>
                  })}
                </span>
                <Button variant="outline" onClick={() => setOnOpenSSHConnectDrawer(true)}>
                  <Settings className="h-4 w-4" />
                  {t('zed_guide_config_ssh')}
                </Button>
              </div>
            </Step>
          </Stepper>
          <Button variant="outline" onClick={connectZed} disabled={onConnecting}>
            {t('zed_guide_start_to_connect')}
          </Button>
          {onOpenSSHConnectDrawer && (
            <SshConnectDrawer
              open={onOpenSSHConnectDrawer}
              onClose={() => setOnOpenSSHConnectDrawer(false)}
              onSuccess={() => {}}
              sshConnectionData={sshConnectionData}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ZedDrawer;
