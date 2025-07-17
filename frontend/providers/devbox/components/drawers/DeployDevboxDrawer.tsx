import { useCallback } from 'react';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useQuery } from '@tanstack/react-query';

import { useEnvStore } from '@/stores/env';
import { AppListItemType } from '@/types/app';
import { getAppsByDevboxId } from '@/api/devbox';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loading } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface DeployDevboxDrawerProps {
  devboxName: string;
  devboxId: string;
  deployData: DeployData;
  onSuccess: () => void;
  onClose: () => void;
  open: boolean;
}

export default function DeployDevboxDrawer({
  deployData,
  devboxName,
  devboxId,
  onSuccess,
  onClose,
  open
}: DeployDevboxDrawerProps) {
  const t = useTranslations();
  const { env } = useEnvStore();

  const { data: apps, isLoading } = useQuery(
    ['apps', devboxId],
    () => getAppsByDevboxId(devboxId),
    {
      refetchInterval: 3000,
      enabled: open
    }
  );

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
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="min-w-[650px]">
        <DrawerHeader>
          <DrawerTitle>{t('deploy')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex w-full flex-col gap-5 p-6">
          {/* create directly */}
          <div className="flex h-32 w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-white bg-[url('/images/plaid-background.svg')] bg-cover bg-center p-6">
            <div className="flex w-[400px] flex-col gap-3">
              <span className="text-lg/7 font-semibold">{t('create_directly')}</span>
              <Button onClick={handleCreate} className="w-fit">
                <span className="text-sm">{t('deploy')}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <span className="leading-6">{t('update_matched_apps_notes')}</span>
          <ScrollArea className="h-[50vh] w-full">
            {isLoading ? (
              <Loading />
            ) : (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="[&>th]:bg-white">
                    <TableHead className="w-[175px]">{t('app_name')}</TableHead>
                    <TableHead>{t('current_image_name')}</TableHead>
                    <TableHead>{t('create_time')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apps?.map((item) => (
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
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
