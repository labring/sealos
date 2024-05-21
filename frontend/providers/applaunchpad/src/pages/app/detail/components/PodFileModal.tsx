import {
  kubeFile_delete,
  kubeFile_ls,
  kubeFile_mkdir,
  kubeFile_rename,
  kubeFile_upload
} from '@/api/kubeFile';
import MyIcon from '@/components/Icon';
import { useSelectFile } from '@/hooks/useSelectFile';
import { MOCK_APP_DETAIL, MOCK_PODS } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { UPLOAD_LIMIT } from '@/store/static';
import type { PodDetailType } from '@/types/app';
import { TFile } from '@/utils/kubeFileSystem';
import { formatSize, formatTime } from '@/utils/tools';
import { getUserKubeConfig } from '@/utils/user';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  CircularProgress,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  MenuButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { MyTooltip, SealosMenu, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useMemo, useState } from 'react';
import styles from '../index.module.scss';

type HandleType = 'delete' | 'rename' | 'mkdir-file' | 'mkdir' | 'download';

const PodFile = ({
  isOpen,
  onClose,
  pod: podDetail = MOCK_PODS[0],
  pods = [],
  podAlias = '',
  setPodDetail
}: {
  isOpen: boolean;
  onClose: () => void;
  pod: PodDetailType;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setPodDetail: (name: string) => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { message } = useMessage();
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();
  const [storeDetail, setStoreDetail] = useState<{
    name: string;
    path: string;
    value: number;
  }>(appDetail.storeList[0] || { name: '/', path: '/', value: 10 });

  const [fileProgress, setFileProgress] = useState<number>(0);
  const [appName, setAppName] = useState(appDetail.appName);
  const [basePath, setBasePath] = useState(storeDetail?.path || '/');
  const basePathArray = useMemo(() => basePath?.split('/')?.filter(Boolean), [basePath]);
  const {
    isOpen: isInternalOpen,
    onOpen: onInternalOpen,
    onClose: onInternalClose
  } = useDisclosure();
  const [handle, setHandle] = useState<HandleType>('rename');
  const [newFileName, setNewFileName] = useState('');
  const [currentFile, setCurrentFile] = useState<TFile>();
  const [showHidden, setShowHidden] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isUploadLoading, setIsUploadLoading] = useState(false);

  const { File, onOpen: openUploadFile } = useSelectFile({
    fileType: '*',
    multiple: true
  });

  const { data, refetch } = useQuery(
    ['KubeFileSystem-ls', basePath, showHidden, podDetail.podName, appName],
    () =>
      kubeFile_ls({
        containerName: appName,
        podName: podDetail.podName,
        path: basePath,
        showHidden: showHidden
      }),
    {
      enabled: !!basePath
    }
  );

  const sortData = useMemo(() => {
    if (!data) return null;
    const resultData = data.directories.concat(data.files);
    if (!searchValue.trim()) {
      return resultData;
    }
    return resultData.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()));
  }, [data, searchValue]);

  const getFileType = (file: TFile) => {
    const knownTypes = ['csv', 'pdf', 'png', 'txt', 'yaml'];
    const kind = file.kind;
    const name = file.name;

    if (kind === 'd') {
      return 'folder';
    } else {
      const fileExtension = name.split('.').pop();
      const fileType = fileExtension
        ? knownTypes.includes(fileExtension.toLowerCase())
          ? fileExtension.toLowerCase()
          : 'default'
        : 'default';
      return fileType;
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === basePathArray.length - 1) {
      return;
    }
    const newPath = `/${basePathArray.slice(0, index + 1).join('/')}`;
    setBasePath(newPath);
  };

  const handleDelete = async () => {
    try {
      if (!currentFile) return;
      const res = await kubeFile_delete({
        podName: podDetail.podName,
        containerName: appName,
        path: currentFile.path
      });
      message({
        title: 'success'
      });
    } catch (error) {}
  };

  const handleRename = async () => {
    try {
      if (!currentFile || !newFileName) return;
      const from = currentFile.path;
      const to = currentFile.path.replace(/\/[^/]+$/, `/${newFileName}`);
      await kubeFile_rename({
        podName: podDetail.podName,
        containerName: appName,
        from,
        to
      });
      message({
        title: 'success'
      });
    } catch (error) {}
  };

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>, file: TFile) => {
    try {
      e.stopPropagation();
      setCurrentFile(file);
      if (!file) return;
      const res = await fetch('/api/kubeFileSystem/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: encodeURIComponent(getUserKubeConfig())
        },
        body: JSON.stringify({
          podName: podDetail.podName,
          containerName: appName,
          path: file.path
        })
      });

      if (res.ok) {
        const cloneRes = res.clone();
        const contentLength = file.size;

        let downloaded = 0;
        const reader = res.body?.getReader();
        if (!reader) return;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setFileProgress(100);
            break;
          }
          downloaded += value.length;
          const progress = Math.round((downloaded / contentLength) * 100);
          setFileProgress(progress);
        }

        const blob = await cloneRes.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {}
  };

  const openModal = (e: MouseEvent<HTMLButtonElement>, handle: HandleType, file?: TFile) => {
    e.stopPropagation();
    onInternalOpen();
    setHandle(handle);
    setCurrentFile(file);
  };

  const handleConfirm = async () => {
    switch (handle) {
      case 'rename':
        await handleRename();
        break;
      case 'delete':
        await handleDelete();
        break;
      case 'mkdir':
        await createFolder();
        break;
      default:
        break;
    }
    onInternalClose();
    setNewFileName('');
    refetch();
  };

  const uploadFile = async (files: File[]) => {
    setIsUploadLoading(true);
    try {
      const filteredFiles = files.filter((file) => {
        if (file.size > UPLOAD_LIMIT * 1024 * 1024) {
          message({
            status: 'info',
            title: t('File is too large tip', { name: file.name })
          });
          return false;
        }
        return true;
      });
      const uploadPromises = filteredFiles.map(async (file) => {
        const name = file.name;
        const form = new FormData();
        form.append('file', file, encodeURIComponent(file.name));
        return await kubeFile_upload(
          {
            podName: podDetail.podName,
            containerName: appName,
            path: `${basePath}/${name}`
          },
          form
        );
      });
      await Promise.all(uploadPromises);
      refetch();
    } catch (error) {
      refetch();
    }
    setIsUploadLoading(false);
  };

  const createFolder = async () => {
    try {
      if (!newFileName) return;
      await kubeFile_mkdir({
        podName: podDetail.podName,
        containerName: appName,
        path: `${basePath}/${newFileName}`
      });
      message({
        title: 'success'
      });
    } catch (error) {}
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent h={'90vh'} maxW={'90vw'} m={0} display={'flex'} flexDirection={'column'}>
          <ModalHeader>
            <Flex alignItems={'center'} gap={'16px'}>
              <Box>{t('File Management')}</Box>
              <SealosMenu
                width={240}
                Button={
                  <MenuButton
                    as={Button}
                    variant={'outline'}
                    leftIcon={<MyIcon name="pods" width={'16px'} height={'16px'} />}
                    minW={'240px'}
                    h={'32px'}
                    textAlign={'start'}
                    bg={'grayModern.100'}
                    border={theme.borders.base}
                    borderRadius={'md'}
                  >
                    <Flex alignItems={'center'}>
                      <Box flex={1}>{podAlias}</Box>
                      <ChevronDownIcon ml={2} />
                    </Flex>
                  </MenuButton>
                }
                menuList={pods.map((item) => ({
                  isActive: item.podName === podDetail.podName,
                  child: <Box>{item.alias}</Box>,
                  onClick: () => setPodDetail(item.podName)
                }))}
              />
              {storeDetail && (
                <SealosMenu
                  width={240}
                  Button={
                    <MenuButton
                      as={Button}
                      variant={'outline'}
                      leftIcon={<MyIcon name="hardDrive" width={'16px'} height={'16px'} />}
                      minW={'240px'}
                      h={'32px'}
                      textAlign={'start'}
                      bg={'grayModern.100'}
                      border={theme.borders.base}
                      borderRadius={'md'}
                    >
                      <Flex alignItems={'center'}>
                        <Box flex={1}>{storeDetail?.path}</Box>
                        <ChevronDownIcon ml={2} />
                      </Flex>
                    </MenuButton>
                  }
                  menuList={appDetail.storeList.map((item) => ({
                    isActive: item.name === storeDetail?.name,
                    child: <Box>{item.path}</Box>,
                    onClick: () => {
                      setBasePath(item.path);
                      setStoreDetail(item);
                    }
                  }))}
                />
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow={'auto'} py={'20px'}>
            <Flex flexDirection={'column'}>
              <Flex
                height={'24px'}
                fontSize={'md'}
                fontWeight={'bold'}
                mb={'16px'}
                cursor={'pointer'}
              >
                {basePathArray.map((p, index, arr) => (
                  <Flex key={p}>
                    <Flex
                      alignItems={'center'}
                      onClick={() => handleBreadcrumbClick(index)}
                      color={index === arr.length - 1 ? 'grayModern.900' : 'grayModern.500'}
                    >
                      {index === 0 && <MyIcon name="home" width={'16px'} />}
                      <Text px={'6px'}>{p}</Text>
                    </Flex>
                    <Text
                      px={'4px'}
                      color={'grayModern.250'}
                      opacity={index === arr.length - 1 ? 0 : 1}
                    >
                      /
                    </Text>
                  </Flex>
                ))}
              </Flex>
              {/* header */}
              <Flex h={'32px'} alignItems={'center'} mb="16px" position={'relative'}>
                <File
                  onSelect={(e) => {
                    uploadFile(e);
                  }}
                />
                <InputGroup width={'230px'} mr={'24px'}>
                  <InputLeftElement pointerEvents="none">
                    <MyIcon name="search" w={'16px'} h={'16px'} color={'grayModern.600'} />
                  </InputLeftElement>
                  <Input
                    placeholder={t('filename') || 'filename'}
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                    }}
                  ></Input>
                </InputGroup>
                <Switch
                  mr={'8px'}
                  isChecked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                <Text fontSize={'base'} fontWeight={'bold'} color={'grayModern.600'}>
                  {t('show hidden files')}
                </Text>
                <Flex ml={'auto'} gap={'12px'}>
                  <Button
                    size={'sm'}
                    variant={'outline'}
                    height={'32px'}
                    leftIcon={<MyIcon name="folderLine" width={'16px'} />}
                    onClick={(e) => openModal(e, 'mkdir')}
                  >
                    {t('Create Folder')}
                  </Button>
                  <Button
                    isLoading={isUploadLoading}
                    size={'sm'}
                    variant={'outline'}
                    height={'32px'}
                    width={'75px'}
                    leftIcon={<MyIcon name="upload" width={'16px'} />}
                    onClick={openUploadFile}
                  >
                    {t('upload')}
                  </Button>
                </Flex>
              </Flex>
              <TableContainer className={styles.fileSystemTable}>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>{t('File Name')}</Th>
                      <Th>{t('Attribute')}</Th>
                      <Th>{t('Owner')}</Th>
                      <Th>{t('Group')}</Th>
                      <Th>{t('Size')}</Th>
                      <Th>{t('Update Time')}</Th>
                      <Th>{t('Operation')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortData?.map((item) => {
                      return (
                        <Tr
                          key={item.name}
                          _hover={{
                            bg: '#FBFBFC'
                          }}
                          onClick={() => {
                            if (item.kind === 'd') {
                              setBasePath(item.path);
                            }
                          }}
                          cursor={'pointer'}
                        >
                          <Td color={'grayModern.900'} fontSize={'md'}>
                            <Flex alignItems={'center'} gap={'8px'}>
                              <MyIcon
                                name={getFileType(item) as any}
                                width={'24px'}
                                height={'24px'}
                                color={'#219BF4'}
                              ></MyIcon>
                              <Text>{item.name}</Text>
                            </Flex>
                          </Td>
                          <Td>{item.attr}</Td>
                          <Td>{item.owner}</Td>
                          <Td>{item.group}</Td>
                          <Td>{formatSize(item.size)}</Td>
                          <Td>{formatTime(item.updateTime, 'YYYY-MM-DD HH:mm')}</Td>
                          <Td>
                            <Flex alignItems={'center'}>
                              <MyTooltip label={t('rename')} offset={[0, 10]}>
                                <Button
                                  variant={'square'}
                                  onClick={(e) => openModal(e, 'rename', item)}
                                >
                                  <MyIcon name="rename" w="18px" h="18px" fill={'#485264'} />
                                </Button>
                              </MyTooltip>
                              {item.kind !== 'd' && (
                                <>
                                  {fileProgress !== 0 &&
                                  fileProgress !== 100 &&
                                  currentFile?.path === item.path ? (
                                    <Center w={'30px'} h={'30px'}>
                                      <CircularProgress
                                        size={'18px'}
                                        value={fileProgress}
                                        color="blue.500"
                                      />
                                    </Center>
                                  ) : (
                                    <MyTooltip offset={[0, 10]} label={t('download')}>
                                      <Button
                                        variant={'square'}
                                        onClick={(e) => handleDownload(e, item)}
                                      >
                                        <MyIcon
                                          name={'download'}
                                          w="18px"
                                          h="18px"
                                          fill={'#485264'}
                                        />
                                      </Button>
                                    </MyTooltip>
                                  )}
                                </>
                              )}
                              <MyTooltip offset={[0, 10]} label={t('Delete')}>
                                <Button
                                  variant={'square'}
                                  onClick={(e) => openModal(e, 'delete', item)}
                                >
                                  <MyIcon name={'delete'} w="18px" h="18px" fill={'#485264'} />
                                </Button>
                              </MyTooltip>
                            </Flex>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
      <Modal isOpen={isInternalOpen} onClose={onInternalClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {handle === 'delete' && t('Are you sure you want to delete the file or folder?')}
            {handle === 'rename' && t('rename')}
            {handle === 'mkdir' && t('Create Folder')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {handle === 'rename' && (
              <Flex flexDirection={'column'} gap={'24px'}>
                <Flex gap={'40px'} alignItems={'center'}>
                  <Text>{t('original filename')}</Text>
                  <Text>{currentFile?.name}</Text>
                </Flex>
                <Flex gap={'40px'} alignItems={'center'}>
                  <Text flexShrink={0}>{t('new filename')}</Text>
                  <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
                </Flex>
              </Flex>
            )}
            {handle === 'delete' && (
              <Text>{t('Note that you cannot retrieve it after deletion')}</Text>
            )}
            {handle === 'mkdir' && (
              <Flex gap={'40px'} alignItems={'center'}>
                <Text flexShrink={0}>{t('Folder Name')}</Text>
                <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
              </Flex>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              width={'88px'}
              variant={'outline'}
              onClick={() => {
                onInternalClose();
              }}
            >
              {t('Cancel')}
            </Button>
            <Button width={'88px'} ml={3} onClick={handleConfirm}>
              {t('Yes')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PodFile;
