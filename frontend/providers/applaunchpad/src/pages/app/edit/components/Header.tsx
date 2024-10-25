import { exportApp, getNodes, uploadApp } from '@/api/app';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { useGlobalStore } from '@/store/global';
import { AppEditType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import {
  Box,
  Button,
  Flex,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { MySelect, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

const Header = ({
  appName,
  title,
  yamlList,
  applyCb,
  applyBtnText,
  namespace,
  formHook
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
  namespace: string;
  formHook: UseFormReturn<AppEditType, any, undefined>;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();
  const { message: toast } = useMessage();
  const [exportLoading, setExportLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [downloadPath, setDownloadPath] = useState('');
  const isEdit = !!router.query.name;
  const [files, setFiles] = useState<File[]>([]);
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      appName ? `${appName}.yaml` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
    toast({
      status: 'success',
      title: 'success'
    });
  }, [appName, toast, yamlList]);

  const handleExportApp = async () => {
    setExportLoading(true);
    const images = formHook?.getValues().containers.map((item) => {
      if (!item.imageName.includes('sealos.hub:5000')) {
        return { name: `sealos.hub:5000/${item.imageName}` };
      } else {
        return { name: item.imageName };
      }
    });

    try {
      const exportYamlString = yamlList.map((i) => i.value).join('---\n');

      const result = await exportApp({
        yaml: exportYamlString,
        images: images,
        appname: appName,
        namespace: namespace
      });

      if (result?.error) {
        toast({
          status: 'error',
          duration: null,
          isClosable: true,
          title: result.error
        });
      } else {
        setDownloadPath(result.downloadPath);
        onOpen();
      }
    } catch (error) {
      toast({
        status: 'error',
        title: 'error'
      });
    }
    setExportLoading(false);
  };

  const { data: nodesData } = useQuery(['getNodes'], () => getNodes());

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        gap={'6px'}
        onClick={() => router.replace(lastRoute)}
      >
        <MyIcon name="arrowLeft" w={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>

      {isEdit && (
        <MySelect
          mr={'14px'}
          borderColor={'#02A7F0'}
          _hover={{
            bg: 'white'
          }}
          bg={'white'}
          width={'120px'}
          value={formHook?.getValues('nodeName') || ''}
          list={
            nodesData
              ? nodesData?.map((item) => ({
                  label: item.name,
                  value: item.name
                }))
              : []
          }
          onchange={(val: any) => {
            formHook?.setValue('nodeName', val);
            applyCb();
          }}
        />
      )}

      {isEdit && (
        <Button
          isLoading={exportLoading}
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          variant={'outline'}
          onClick={handleExportApp}
        >
          {t('Export')}应用
        </Button>
      )}

      {!isEdit && (
        <Button
          flexShrink={'0'}
          leftIcon={
            <Icon w="20px" h="20px" fill={'currentcolor'}>
              <path d="M11 19.7908V13.7908H5V11.7908H11V5.79077H13V11.7908H19V13.7908H13V19.7908H11Z" />
            </Icon>
          }
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          variant={'outline'}
          onClick={() => {
            setFiles([]);
            onUploadOpen();
          }}
        >
          {t('upload_file')}
        </Button>
      )}

      <Modal isOpen={isUploadOpen} onClose={onUploadClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader> {t('upload_file')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onUploadClose}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await uploadApp({
                    appname: appName,
                    namespace: namespace,
                    file: files[0]
                  });
                  toast({
                    status: 'success',
                    title: '上传并提取成功'
                  });
                  onUploadClose();
                } catch (error) {
                  toast({
                    status: 'error',
                    title: 'error'
                  });
                }
              }}
            >
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Button h={'40px'} mr={'14px'} minW={'140px'} variant={'outline'} onClick={handleExportYaml}>
        {t('Export')}编排
      </Button>

      <Button
        className="driver-deploy-button"
        minW={'140px'}
        h={'40px'}
        onClick={applyCb}
        _focusVisible={{ boxShadow: '' }}
      >
        {t(applyBtnText)}
      </Button>
      <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>打包成功</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box>文件下载地址</Box>
            <Link href={downloadPath}>{downloadPath}</Link>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default Header;
