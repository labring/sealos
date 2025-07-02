import { useCallback } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useEnvStore } from '@/stores/env';
import { AppListItemType } from '@/types/app';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
      <DialogContent className="min-w-[650px]">
        <DialogHeader>
          <DialogTitle>{t('deploy')}</DialogTitle>
        </DialogHeader>

        <div className="flex w-full flex-col gap-5">
          {/* create directly */}
          <div className="flex h-32 w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
            <div className="flex w-[400px] flex-col gap-3">
              <span className="text-lg/7 font-semibold">{t('create_directly')}</span>
              <Button onClick={handleCreate} className="w-fit">
                <span className="text-sm">{t('deploy')}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <span className="leading-6">{t('update_matched_apps_notes')}</span>
          <div className="w-full">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[175px]">{t('app_name')}</TableHead>
                  <TableHead>{t('current_image_name')}</TableHead>
                  <TableHead>{t('create_time')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="w-[175px] truncate text-black">{item.name}</TableCell>
                    <TableCell>
                      {item.imageName.startsWith(
                        `${env.registryAddr}/${env.namespace}/${devboxName}`
                      )
                        ? item.imageName.replace(`${env.registryAddr}/${env.namespace}/`, '')
                        : '-'}
                    </TableCell>
                    <TableCell>{item.createTime}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" onClick={() => handleUpdate(item)}>
                        {t('to_update')}
                      </Button>
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
