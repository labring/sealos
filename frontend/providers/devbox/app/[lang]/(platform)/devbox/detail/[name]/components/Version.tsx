'use client';

import { toast } from 'sonner';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { ArrowBigUpDash, Ellipsis, LayoutTemplate, PencilLine, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useEnvStore } from '@/stores/env';
import { AppListItemType } from '@/types/app';
import { useConfirm } from '@/hooks/useConfirm';
import { useDevboxStore } from '@/stores/devbox';
import { parseTemplateConfig } from '@/utils/tools';
import { DevboxVersionListItemType } from '@/types/devbox';
import { delDevboxVersionByName, getAppsByDevboxId } from '@/api/devbox';
import { devboxIdKey, DevboxReleaseStatusEnum } from '@/constants/devbox';
import { getTemplateConfig, listPrivateTemplateRepository } from '@/api/template';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import DevboxStatusTag from '@/components/StatusTag';
import ReleaseModal from '@/components/modals/ReleaseModal';
import EditVersionDesModal from '@/components/modals/EditVersionDesModal';
import CreateTemplateModal from '@/app/[lang]/(platform)/template/updateTemplate/CreateTemplateModal';
import SelectTemplateModal from '@/app/[lang]/(platform)/template/updateTemplate/SelectActionModal';
import UpdateTemplateRepositoryModal from '@/app/[lang]/(platform)/template/updateTemplate/UpdateTemplateRepositoryModal';
import AppSelectModal from '@/components/modals/AppSelectModal';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

const Version = () => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);

  const { env } = useEnvStore();
  const { devboxDetail: devbox, devboxVersionList, setDevboxVersionList } = useDevboxStore();

  const [initialized, setInitialized] = useState(false);
  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [onOpenSelectApp, setOnOpenSelectApp] = useState(false);
  const [apps, setApps] = useState<AppListItemType[]>([]);
  const [deployData, setDeployData] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<DevboxVersionListItemType | null>(null);
  const [updateTemplateRepo, setUpdateTemplateRepo] = useState<
    | null
    | Awaited<ReturnType<typeof listPrivateTemplateRepository>>['templateRepositoryList'][number]
  >(null);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
  const [isUpdateTemplateModalOpen, setIsUpdateTemplateModalOpen] = useState(false);

  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'delete_version_confirm_info'
  });

  const { refetch } = useQuery(
    ['initDevboxVersionList'],
    () => setDevboxVersionList(devbox!.name, devbox!.id),
    {
      refetchInterval:
        devboxVersionList.length > 0 &&
        !isCreateTemplateModalOpen &&
        !isUpdateTemplateModalOpen &&
        !isSelectTemplateModalOpen &&
        (devboxVersionList[0].status.value === DevboxReleaseStatusEnum.Pending ||
          devboxVersionList[0].status.value === DevboxReleaseStatusEnum.Failed)
          ? 3000
          : false,
      onSettled() {
        setInitialized(true);
      },
      enabled: !!devbox
    }
  );

  const listPrivateTemplateRepositoryQuery = useQuery(
    ['template-repository-list', 'template-repository-private'],
    () => {
      return listPrivateTemplateRepository({
        page: 1,
        pageSize: 100
      });
    }
  );
  const templateRepositoryList =
    listPrivateTemplateRepositoryQuery.data?.templateRepositoryList || [];

  const handleDeploy = useCallback(
    async (version: DevboxVersionListItemType) => {
      if (!devbox) return;
      const result = await getTemplateConfig(devbox.templateUid);
      const config = parseTemplateConfig(result.template.config);
      const releaseArgs = config.releaseArgs.join(' ');
      const releaseCommand = config.releaseCommand.join(' ');
      const { cpu, memory, networks, name } = devbox;
      const newNetworks = networks.map((network) => {
        return {
          port: network.port,
          appProtocol: network.protocol,
          protocol: 'TCP',
          openPublicDomain: network.openPublicDomain,
          domain: env.ingressDomain
        };
      });
      const imageName = `${env.registryAddr}/${env.namespace}/${devbox.name}:${version.tag}`;

      const transformData = {
        appName: `${name}-release-${nanoid()}`,
        cpu: cpu,
        memory: memory,
        imageName: imageName,
        networks:
          newNetworks.length > 0
            ? newNetworks
            : [
                {
                  port: 80,
                  protocol: 'TCP',
                  appProtocol: 'HTTP',
                  openPublicDomain: false,
                  domain: env.ingressDomain
                }
              ],
        runCMD: releaseCommand,
        cmdParam: releaseArgs,
        labels: {
          [devboxIdKey]: devbox.id
        }
      };
      setDeployData(transformData);
      const apps = await getAppsByDevboxId(devbox.id);

      // when: there is no app,create a new app
      if (apps.length === 0) {
        const tempFormDataStr = encodeURIComponent(JSON.stringify(transformData));
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-applaunchpad',
          pathname: '/redirect',
          query: { formData: tempFormDataStr },
          messageData: {
            type: 'InternalAppCall',
            formData: tempFormDataStr
          }
        });
      }

      // when: there have apps,show the app select modal
      if (apps.length >= 1) {
        setApps(apps);
        setOnOpenSelectApp(true);
      }
    },
    [devbox, env.ingressDomain, env.namespace, env.registryAddr]
  );

  const handleDelDevboxVersion = useCallback(
    async (versionName: string) => {
      try {
        setIsLoading(true);
        await delDevboxVersionByName(versionName);
        toast.success(t('delete_successful'));
        let retryCount = 0;
        const maxRetries = 3;
        const retryInterval = 3000;

        const retry = async () => {
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
            await refetch();
            retryCount++;
          }
        };
        retry();
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : error.message || t('delete_failed'));
        console.error(error);
      }
      setIsLoading(false);
    },
    [setIsLoading, t, refetch]
  );

  if (!initialized || isLoading) return <Loading />;

  return (
    <div className="relative h-full rounded-lg border bg-white p-6">
      <div className="mb-5 flex items-center justify-between py-1 pr-0.5">
        <div className="flex items-center">
          <span className="text-base font-bold text-gray-600">{t('version_history')}</span>
        </div>
        <Button
          className="guide-release-button"
          onClick={() => setOnOpenRelease(true)}
          variant="outline"
          size="default"
        >
          <ArrowBigUpDash className="mr-2" />
          {t('release_version')}
        </Button>
      </div>

      {devboxVersionList.length === 0 && initialized ? (
        <div className="mt-10 flex flex-col items-center justify-center gap-4">
          <ArrowBigUpDash className="h-[40px] w-[40px] text-white" />
          <div className="text-center text-gray-600">{t('no_versions')}</div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('version_number')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('create_time')}</TableHead>
              <TableHead>{t('version_description')}</TableHead>
              <TableHead>{t('control')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devboxVersionList.map((item) => (
              <TableRow key={item.tag}>
                <TableCell className="pl-3 text-gray-900">{item.tag}</TableCell>
                <TableCell>
                  <DevboxStatusTag status={item.status} className="h-[27px]" />
                </TableCell>
                <TableCell className="text-gray-600">{item.createTime}</TableCell>
                <TableCell>
                  <div className="flex min-h-[20px] w-full items-center">
                    <div className="flex-1 truncate text-gray-600">{item.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      className="guide-online-button mr-5"
                      variant="secondary"
                      size="sm"
                      disabled={item.status.value !== DevboxReleaseStatusEnum.Success}
                      onClick={() => handleDeploy(item)}
                    >
                      {t('deploy')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={item?.status?.value !== 'Success'}
                        >
                          <Ellipsis className="text-gray-600 hover:text-blue-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentVersion(item);
                            setIsOpenEdit(true);
                          }}
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentVersion(item);
                            if (templateRepositoryList.length > 0) {
                              setIsSelectTemplateModalOpen(true);
                            } else {
                              setIsCreateTemplateModalOpen(true);
                            }
                          }}
                        >
                          <LayoutTemplate className="mr-2 h-4 w-4" />
                          {t('convert_to_runtime')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => openConfirm(() => handleDelDevboxVersion(item.name))()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!!currentVersion && (
        <EditVersionDesModal
          open={isOpenEdit}
          version={currentVersion}
          onSuccess={refetch}
          onClose={() => setIsOpenEdit(false)}
        />
      )}
      <ReleaseModal
        open={!!onOpenRelease && !!devbox}
        onSuccess={refetch}
        onClose={() => {
          setOnOpenRelease(false);
        }}
        devbox={{ ...devbox!, sshPort: devbox!.sshPort || 0 }}
      />

      <AppSelectModal
        open={!!onOpenSelectApp}
        apps={apps}
        devboxName={devbox?.name || ''}
        deployData={deployData}
        onSuccess={() => setOnOpenSelectApp(false)}
        onClose={() => setOnOpenSelectApp(false)}
      />
      <ConfirmChild />
      <CreateTemplateModal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        devboxReleaseName={currentVersion?.name || ''}
      />
      {templateRepositoryList.length > 0 && (
        <SelectTemplateModal
          onOpenCreate={() => setIsCreateTemplateModalOpen(true)}
          onOpenUpdate={(uid) => {
            const repo = templateRepositoryList.find((item) => item.uid === uid);
            setUpdateTemplateRepo(repo || null);
            setIsUpdateTemplateModalOpen(true);
          }}
          templateRepositoryList={templateRepositoryList}
          isOpen={isSelectTemplateModalOpen}
          onClose={() => setIsSelectTemplateModalOpen(false)}
        />
      )}
      {!!updateTemplateRepo && (
        <UpdateTemplateRepositoryModal
          templateRepository={updateTemplateRepo}
          isOpen={isUpdateTemplateModalOpen}
          onClose={() => setIsUpdateTemplateModalOpen(false)}
          devboxReleaseName={currentVersion?.name || ''}
        />
      )}
    </div>
  );
};

export default Version;
