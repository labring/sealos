'use client';

import {
  ArrowBigUpDash,
  ArrowUpRight,
  Ellipsis,
  LayoutTemplate,
  PencilLine,
  Trash2
} from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useEnvStore } from '@/stores/env';
import { useConfirm } from '@/hooks/useConfirm';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { parseTemplateConfig } from '@/utils/tools';
import { DevboxVersionListItemType } from '@/types/devbox';
import { startDriver, startGuideRelease } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ReleaseModal from '@/components/dialogs/ReleaseDialog';
import EditVersionDesModal from '@/components/dialogs/EditVersionDesDialog';
import CreateTemplateDrawer from '@/components/drawers/CreateTemplateDrawer';
import CreateOrUpdateDrawer from '@/components/drawers/CreateOrUpdateDrawer';
import UpdateTemplateDrawer from '@/components/drawers/UpdateTemplateDrawer';
import DeployDevboxDrawer from '@/components/drawers/DeployDevboxDrawer';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

const Release = () => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);

  const { env } = useEnvStore();
  const { devboxDetail: devbox, devboxVersionList, setDevboxVersionList } = useDevboxStore();

  const [initialized, setInitialized] = useState(false);
  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [onOpenSelectApp, setOnOpenSelectApp] = useState(false);
  const [deployData, setDeployData] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<DevboxVersionListItemType | null>(null);
  const [updateTemplateRepo, setUpdateTemplateRepo] = useState<
    | null
    | Awaited<ReturnType<typeof listPrivateTemplateRepository>>['templateRepositoryList'][number]
  >(null);
  const [isCreateTemplateDrawerOpen, setIsCreateTemplateDrawerOpen] = useState(false);
  const [isCreateOrUpdateTemplateDrawerOpen, setIsCreateOrUpdateTemplateDrawerOpen] =
    useState(false);
  const [isUpdateTemplateDrawerOpen, setIsUpdateTemplateDrawerOpen] = useState(false);

  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'delete_version_confirm_info'
  });

  const { refetch } = useQuery(
    ['initDevboxVersionList'],
    () => setDevboxVersionList(devbox!.name, devbox!.id),
    {
      refetchInterval:
        devboxVersionList.length > 0 &&
        !isCreateTemplateDrawerOpen &&
        !isUpdateTemplateDrawerOpen &&
        !isCreateOrUpdateTemplateDrawerOpen &&
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

      // Check apps first
      const apps = await getAppsByDevboxId(devbox.id);

      // If no apps, create directly
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
        return;
      }

      // If has apps, show the drawer
      setOnOpenSelectApp(true);
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

  const handleConvertToRuntime = useCallback(
    (version: DevboxVersionListItemType) => {
      setCurrentVersion(version);
      if (templateRepositoryList.length > 0) {
        setIsCreateOrUpdateTemplateDrawerOpen(true); // choose create or update
      } else {
        setIsCreateTemplateDrawerOpen(true);
      }
    },
    [templateRepositoryList.length]
  );

  const releaseColumn = useMemo(
    () => [
      {
        title: t('version_number'),
        key: 'tag',
        render: (item: DevboxVersionListItemType) => (
          <div className="max-w-50 truncate text-zinc-900">{item.tag}</div>
        )
      },
      {
        title: t('status'),
        key: 'status',
        render: (item: DevboxVersionListItemType) => <DevboxStatusTag status={item.status} />
      },
      {
        title: t('create_time'),
        key: 'createTime',
        render: (item: DevboxVersionListItemType) => (
          <span>{dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}</span>
        )
      },
      {
        title: t('version_description'),
        key: 'description',
        render: (item: DevboxVersionListItemType) => (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="max-w-50 cursor-pointer truncate">{item.description}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] break-words whitespace-pre-wrap">
                <p>{item.description}</p>
              </TooltipContent>
            </Tooltip>
            <PencilLine
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                setCurrentVersion(item);
                setIsOpenEdit(true);
              }}
            />
          </div>
        )
      },
      {
        title: '',
        key: 'control',
        render: (item: DevboxVersionListItemType) => (
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              className="guide-online-button text-accent-foreground"
              variant="outline"
              disabled={item.status.value !== DevboxReleaseStatusEnum.Success}
              onClick={() => handleDeploy(item)}
            >
              {t('deploy')}
              <ArrowUpRight className="h-4 w-4 text-neutral-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={item?.status?.value !== 'Success'}>
                  <Ellipsis className="text-gray-600 hover:text-blue-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleConvertToRuntime(item)}>
                  <LayoutTemplate className="h-4 w-4 text-neutral-500" />
                  {t('convert_to_runtime')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => openConfirm(() => handleDelDevboxVersion(item.name))()}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    ],
    [t, handleDeploy, openConfirm, handleDelDevboxVersion, handleConvertToRuntime]
  );

  const { guideRelease, setGuideRelease, guideIDE } = useGuideStore();
  const isClientSide = useClientSideValue(true);
  const handleOpenRelease = useCallback(() => {
    setGuideRelease(true);
    setOnOpenRelease(true);
  }, [setOnOpenRelease, setGuideRelease]);

  useEffect(() => {
    if (!guideRelease && guideIDE && isClientSide) {
      startDriver(startGuideRelease(t, handleOpenRelease));
    }
  }, [guideRelease, handleOpenRelease, isClientSide, t, guideIDE]);

  if (!initialized || isLoading) return <Loading />;

  return (
    <div className="flex h-[40%] flex-col items-center gap-4 rounded-xl border-[0.5px] bg-white px-6 py-5 shadow-xs">
      <div className="flex w-full items-center justify-between !overflow-visible">
        <span className="text-lg/7 font-medium">{t('version_history')}</span>
        <Button className="guide-release-button" onClick={handleOpenRelease} variant="outline">
          <ArrowBigUpDash className="h-4 w-4 text-neutral-500" />
          {t('release_version')}
        </Button>
      </div>

      {devboxVersionList.length === 0 && initialized ? (
        <div className="flex h-full w-[300px] flex-col items-center justify-center gap-3">
          <div className="rounded-lg border border-dashed border-zinc-200 p-2">
            <ArrowBigUpDash className="h-6 w-6 text-zinc-400" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-semibold text-center text-sm text-black">{t('no_versions')}</span>
            <span className="text-center text-sm/5 text-neutral-500">
              {t('click_release_to_deploy_app')}
            </span>
          </div>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {releaseColumn.map((column) => (
                  <TableHead key={column.key}>{column.title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {devboxVersionList.map((item) => (
                <TableRow key={item.tag}>
                  {releaseColumn.map((column) => (
                    <TableCell key={`${item.tag}-${column.key}`}>{column.render(item)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
      {/* dialogs */}
      {!!devbox && (
        <ReleaseModal
          open={onOpenRelease}
          onSuccess={refetch}
          onClose={() => {
            setOnOpenRelease(false);
          }}
          devbox={{ ...devbox, sshPort: devbox.sshPort || 0 }}
        />
      )}
      {!!currentVersion && (
        <EditVersionDesModal
          open={isOpenEdit}
          version={currentVersion}
          onSuccess={refetch}
          onClose={() => setIsOpenEdit(false)}
        />
      )}
      {!!devbox && (
        <DeployDevboxDrawer
          open={!!onOpenSelectApp}
          devboxId={devbox.id}
          devboxName={devbox.name}
          deployData={deployData}
          onSuccess={() => setOnOpenSelectApp(false)}
          onClose={() => setOnOpenSelectApp(false)}
        />
      )}

      <ConfirmChild />
      <CreateTemplateDrawer
        isOpen={isCreateTemplateDrawerOpen}
        onClose={() => setIsCreateTemplateDrawerOpen(false)}
        devboxReleaseName={currentVersion?.name || ''}
      />
      {templateRepositoryList.length > 0 && (
        <CreateOrUpdateDrawer
          onOpenCreate={() => setIsCreateTemplateDrawerOpen(true)}
          onOpenUpdate={(uid) => {
            const repo = templateRepositoryList.find((item) => item.uid === uid);
            setUpdateTemplateRepo(repo || null);
            setIsUpdateTemplateDrawerOpen(true);
          }}
          templateRepositoryList={templateRepositoryList}
          isOpen={isCreateOrUpdateTemplateDrawerOpen}
          onClose={() => setIsCreateOrUpdateTemplateDrawerOpen(false)}
        />
      )}
      {!!updateTemplateRepo && (
        <UpdateTemplateDrawer
          templateRepository={updateTemplateRepo}
          isOpen={isUpdateTemplateDrawerOpen}
          onClose={() => setIsUpdateTemplateDrawerOpen(false)}
          devboxReleaseName={currentVersion?.name || ''}
        />
      )}
    </div>
  );
};

export default Release;
