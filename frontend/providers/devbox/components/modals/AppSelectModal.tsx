import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Button,
  ModalHeader,
  Text,
  Divider
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { customAlphabet } from 'nanoid';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { AppListItemType } from '@/types/app';

import MyIcon from '../Icon';
import MyTable from '../MyTable';
import { useEnvStore } from '@/stores/env';

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

const AppSelectModal = ({
  apps,
  deployData,
  devboxName,
  onSuccess,
  onClose
}: {
  apps: AppListItemType[];
  devboxName: string;
  deployData: DeployData;
  onSuccess: () => void;
  onClose: () => void;
}) => {
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

  const columns: {
    title: string;
    dataIndex?: keyof AppListItemType;
    key: string;
    width?: string;
    render?: (item: AppListItemType) => JSX.Element;
  }[] = [
    {
      title: t('app_name'),
      dataIndex: 'name',
      key: 'name',
      render: (item: AppListItemType) => {
        return (
          <Text ml={4} color={'grayModern.600'}>
            {item.name}
          </Text>
        );
      }
    },
    {
      title: t('current_image_name'),
      dataIndex: 'imageName',
      key: 'imageName',
      render: (item: AppListItemType) => {
        // note: no same devbox matched image will be dealt.
        const dealImageName = item.imageName.startsWith(
          `${env.registryAddr}/${env.namespace}/${devboxName}`
        )
          ? item.imageName.replace(`${env.registryAddr}/${env.namespace}/`, '')
          : '-';
        return <Text color={'grayModern.600'}>{dealImageName}</Text>;
      }
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item: AppListItemType) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>;
      }
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: AppListItemType) => (
        <Flex>
          <Button
            height={'27px'}
            w={'60px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            borderWidth={1}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            onClick={() => handleUpdate(item)}
          >
            {t('to_update')}
          </Button>
        </Flex>
      )
    }
  ];

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent top={'30%'} maxWidth={'800px'} w={'700px'}>
          <ModalHeader pl={10}>{t('deploy')}</ModalHeader>
          <ModalBody pb={4}>
            <Flex
              alignItems={'center'}
              direction={'column'}
              mb={2}
              justifyContent={'space-between'}
              p={4}
            >
              <Text fontSize={'lg'} fontWeight={'medium'}>
                {t('create_directly')}
              </Text>
              <Button
                onClick={handleCreate}
                height={'36px'}
                mt={4}
                size={'md'}
                px={8}
                fontSize={'base'}
                leftIcon={<MyIcon name="rocket" w={'15px'} h={'15px'} color={'white'} />}
              >
                {t('deploy')}
              </Button>
            </Flex>
            <Divider />
            <Box mt={4}>
              <Flex alignItems={'center'} mb={4} justifyContent={'center'}>
                <Text fontSize={'lg'} fontWeight={'medium'}>
                  {t('update_matched_apps_notes')}
                </Text>
              </Flex>
              <MyTable columns={columns} data={apps} />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AppSelectModal;
