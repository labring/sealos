'use client';

import { Box, Button, Flex, MenuButton, Text, useDisclosure } from '@chakra-ui/react';
import { SealosMenu, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { delDevboxVersionByName, getAppsByDevboxId } from '@/api/devbox';
import DevboxStatusTag from '@/components/DevboxStatusTag';
import EditVersionDesModal from '@/components/modals/EditVersionDesModal';
import ReleaseModal from '@/components/modals/ReleaseModal';
import MyTable from '@/components/MyTable';
import { devboxIdKey, DevboxReleaseStatusEnum } from '@/constants/devbox';
import { DevboxVersionListItemType } from '@/types/devbox';

import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';

import { getTemplateConfig, listPrivateTemplateRepository } from '@/api/template';
import CreateTemplateModal from '@/app/[lang]/(platform)/template/updateTemplate/CreateTemplateModal';
import SelectTemplateModal from '@/app/[lang]/(platform)/template/updateTemplate/SelectActionModal';
import UpdateTemplateRepositoryModal from '@/app/[lang]/(platform)/template/updateTemplate/UpdateTemplateRepositoryModal';
import AppSelectModal from '@/components/modals/AppSelectModal';
import useReleaseDriver from '@/hooks/useReleaseDriver';
import { useDevboxStore } from '@/stores/devbox';
import { useEnvStore } from '@/stores/env';
import { AppListItemType } from '@/types/app';
import { parseTemplateConfig } from '@/utils/tools';
import MyIcon from '@/components/Icon';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);

const Version = () => {
  const { startReleaseGuide } = useReleaseDriver();
  const t = useTranslations();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

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
  const createTemplateModalHandler = useDisclosure();
  const selectTemplalteModalHandler = useDisclosure();
  const updateTemplateModalHandler = useDisclosure();
  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'delete_version_confirm_info'
  });
  const { refetch } = useQuery(
    ['initDevboxVersionList'],
    () => setDevboxVersionList(devbox!.name, devbox!.id),
    {
      refetchInterval:
        devboxVersionList.length > 0 &&
        !createTemplateModalHandler.isOpen &&
        !updateTemplateModalHandler.isOpen &&
        !selectTemplalteModalHandler.isOpen &&
        devboxVersionList[0].status.value === DevboxReleaseStatusEnum.Pending
          ? 3000
          : false,
      onSettled() {
        setInitialized(true);
      },
      enabled: !!devbox
    }
  );

  useEffect(() => {
    if (devboxVersionList?.length && devboxVersionList.length > 0) {
      startReleaseGuide();
    }
  }, [devboxVersionList.length]);

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
          protocol: network.protocol,
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
                  protocol: 'http',
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
        toast({
          title: t('delete_successful'),
          status: 'success'
        });
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
        toast({
          title: typeof error === 'string' ? error : error.message || t('delete_failed'),
          status: 'error'
        });
        console.error(error);
      }
      setIsLoading(false);
    },
    [setIsLoading, toast, t, refetch]
  );

  const columns: {
    title: string;
    dataIndex?: keyof DevboxVersionListItemType;
    key: string;
    render?: (item: DevboxVersionListItemType) => JSX.Element;
  }[] = [
    {
      title: t('version_number'),
      key: 'tag',
      render: (item: DevboxVersionListItemType) => (
        <Box color={'grayModern.900'} pl={'12px'}>
          {item.tag}
        </Box>
      )
    },
    {
      title: t('status'),
      key: 'status',
      render: (item: DevboxVersionListItemType) => (
        <DevboxStatusTag status={item.status} h={'27px'} thinMode />
      )
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item: DevboxVersionListItemType) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>;
      }
    },
    {
      title: t('version_description'),
      key: 'description',
      render: (item: DevboxVersionListItemType) => (
        <Flex alignItems="center" minH={'20px'} width={'full'}>
          <Box color={'grayModern.600'} noOfLines={1} w={'0'} flex={1}>
            {item.description}
          </Box>
        </Flex>
      )
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: DevboxVersionListItemType) => (
        <Flex alignItems={'center'}>
          <Button
            className="guide-online-button"
            mr={5}
            height={'27px'}
            w={'60px'}
            size={'sm'}
            h="32px"
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            isDisabled={item.status.value !== DevboxReleaseStatusEnum.Success}
            onClick={() => handleDeploy(item)}
          >
            {t('deploy')}
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton
                as={Button}
                variant={'square'}
                boxSize={'32px'}
                data-group
                isDisabled={item?.status?.value !== 'Success'}
              >
                <MyIcon
                  name={'more'}
                  color={'grayModern.600'}
                  _groupHover={{
                    color: 'brightBlue.600'
                  }}
                  fill={'currentcolor'}
                />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'edit'} w={'16px'} />
                    <Box ml={2}>{t('edit')}</Box>
                  </>
                ),
                onClick: () => {
                  setCurrentVersion(item);
                  onOpenEdit();
                }
              },
              {
                child: (
                  <>
                    <MyIcon name={'template'} w={'16px'} />
                    <Box ml={2}>{t('convert_to_runtime')}</Box>
                  </>
                ),
                onClick: () => {
                  setCurrentVersion(item);
                  // onOpenEdit()
                  // openTemplateModal({templateState: })
                  if (templateRepositoryList.length > 0) {
                    selectTemplalteModalHandler.onOpen();
                  } else {
                    createTemplateModalHandler.onOpen();
                  }
                }
              },
              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'16px'} />
                    <Box ml={2}>{t('delete')}</Box>
                  </>
                ),
                menuItemStyle: {
                  _hover: {
                    color: 'red.600',
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }
                },
                onClick: () => openConfirm(() => handleDelDevboxVersion(item.name))()
              }
            ]}
          />
        </Flex>
      )
    }
  ];
  return (
    <Box
      borderWidth={1}
      borderRadius="lg"
      pl={6}
      pt={4}
      pr={6}
      bg={'white'}
      h={'full'}
      position={'relative'}
    >
      <Flex alignItems="center" justifyContent={'space-between'} mb={5}>
        <Flex alignItems={'center'}>
          <MyIcon name="list" w={'15px'} h={'15px'} mr={'5px'} color={'grayModern.600'} />
          <Text fontSize="base" fontWeight={'bold'} color={'grayModern.600'}>
            {t('version_history')}
          </Text>
        </Flex>
        <Button
          className="guide-release-button"
          onClick={() => setOnOpenRelease(true)}
          bg={'white'}
          color={'grayModern.600'}
          borderWidth={1}
          mr={1}
          leftIcon={<MyIcon name="version" />}
          _hover={{
            color: 'brightBlue.600'
          }}
        >
          {t('release_version')}
        </Button>
      </Flex>
      <Loading loading={!initialized} fixed={false} />
      {devboxVersionList.length === 0 && initialized ? (
        <Flex
          justifyContent={'center'}
          alignItems={'center'}
          mt={10}
          flexDirection={'column'}
          gap={4}
        >
          <MyIcon name="empty" w={'40px'} h={'40px'} color={'white'} />
          <Box textAlign={'center'} color={'grayModern.600'}>
            {t('no_versions')}
          </Box>
        </Flex>
      ) : (
        <MyTable
          columns={columns}
          data={devboxVersionList}
          needRadius
          gridTemplateColumns={'105px 105px 144px minmax(0, 1fr) 140px'}
        />
      )}
      {!!currentVersion && (
        <EditVersionDesModal
          version={currentVersion}
          onSuccess={refetch}
          isOpen={isOpenEdit}
          onClose={onCloseEdit}
        />
      )}
      {!!onOpenRelease && !!devbox && (
        <ReleaseModal
          onSuccess={refetch}
          onClose={() => {
            setOnOpenRelease(false);
          }}
          devbox={{ ...devbox, sshPort: devbox.sshPort || 0 }}
        />
      )}
      {!!onOpenSelectApp && (
        <AppSelectModal
          apps={apps}
          devboxName={devbox?.name || ''}
          deployData={deployData}
          onSuccess={() => setOnOpenSelectApp(false)}
          onClose={() => setOnOpenSelectApp(false)}
        />
      )}
      <ConfirmChild />
      <CreateTemplateModal
        isOpen={createTemplateModalHandler.isOpen}
        onClose={createTemplateModalHandler.onClose}
        devboxReleaseName={currentVersion?.name || ''}
      />
      {templateRepositoryList.length > 0 && (
        <SelectTemplateModal
          onOpenCreate={createTemplateModalHandler.onOpen}
          onOpenUdate={(uid) => {
            const repo = templateRepositoryList.find((item) => item.uid === uid);
            setUpdateTemplateRepo(repo || null);
            updateTemplateModalHandler.onOpen();
          }}
          templateRepositoryList={templateRepositoryList}
          isOpen={selectTemplalteModalHandler.isOpen}
          onClose={selectTemplalteModalHandler.onClose}
        />
      )}
      {!!updateTemplateRepo && (
        <UpdateTemplateRepositoryModal
          templateRepository={updateTemplateRepo}
          isOpen={updateTemplateModalHandler.isOpen}
          onClose={updateTemplateModalHandler.onClose}
          devboxReleaseName={currentVersion?.name || ''}
        />
      )}
    </Box>
  );
};

export default Version;
