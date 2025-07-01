'use client';

import { useCallback } from 'react';
import { Rocket } from 'lucide-react';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useEnvStore } from '@/stores/env';
import { AppListItemType } from '@/types/app';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

interface NetworkConfig {
  port: number;
  protocol: string;
  openPublicDomain: boolean;
  domain: string;
}

interface DeployData {
  appName: string;
  cpu: number;
  memory: number;
  imageName: string;
  networks: NetworkConfig[];
  runCMD: string;
  cmdParam: string[];
  labels: {
    [key: string]: string;
  };
}

interface AppSelectModalProps {
  apps: AppListItemType[];
  devboxName: string;
  deployData: DeployData;
  onSuccess: () => void;
  onClose: () => void;
  open: boolean;
}

export default function AppSelectModal({
  apps,
  deployData,
  devboxName,
  onSuccess,
  onClose,
  open
}: AppSelectModalProps) {
  const t = useTranslations();
  const { env } = useEnvStore();

  const handleCreate = useCallback(() => {
    const tempFormData = { ...deployData, appName: `${deployData.appName}-${nanoid()}` };
    const tempFormDataStr = encodeURIComponent(JSON.stringify(tempFormData));
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-applaunchpad',
      pathname: '/redirect',
      query: { formData: tempFormDataStr },
      messageData: {
        type: 'InternalAppCall',
        formData: tempFormDataStr
      }
    });
  }, [deployData]);

  const handleUpdate = useCallback(
    (item: AppListItemType) => {
      const tempFormData = {
        appName: item.name,
        imageName: deployData.imageName
      };
      const tempFormDataStr = encodeURIComponent(JSON.stringify(tempFormData));
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-applaunchpad',
        pathname: '/redirect',
        query: { formData: tempFormDataStr },
        messageData: {
          type: 'InternalAppCall',
          formData: tempFormDataStr
        }
      });
      onSuccess();
    },
    [deployData, onSuccess]
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('deploy')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <DialogDescription>{t('create_directly')}</DialogDescription>
            <Button onClick={handleCreate} size="lg">
              <Rocket className="mr-2 h-4 w-4" />
              <span>{t('deploy')}</span>
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <DialogDescription className="text-center">
              {t('update_matched_apps_notes')}
            </DialogDescription>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('app_name')}</TableHead>
                  <TableHead>{t('current_image_name')}</TableHead>
                  <TableHead>{t('create_time')}</TableHead>
                  <TableHead>{t('control')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="ml-4 text-muted-foreground">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.imageName.startsWith(
                        `${env.registryAddr}/${env.namespace}/${devboxName}`
                      )
                        ? item.imageName.replace(`${env.registryAddr}/${env.namespace}/`, '')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.createTime}</TableCell>
                    <TableCell>
                      <div className="flex">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:text-primary"
                          onClick={() => handleUpdate(item)}
                        >
                          {t('to_update')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
