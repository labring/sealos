import {
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  IconButtonProps,
  Button,
  Center,
  Spinner,
  HStack,
  Link,
  VStack,
  Box,
  Badge,
  Flex,
  Divider
} from '@chakra-ui/react';
import UploadIcon from '@/components/Icons/UploadIcon';

type TFileItem = {
  file: File;
  path: string;
};
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putObject } from '@/api/s3';
import { useOssStore } from '@/store/ossStore';
import { useDropzone } from 'react-dropzone';
import { FolderPlaceholder, QueryKey } from '@/consts';
import { useTranslation } from 'next-i18next';
import { useToast } from '@/hooks/useToast';
import { TriangleAlert } from 'lucide-react';

export default function UploadModal({ ...styles }: Omit<IconButtonProps, 'aria-label'> & {}) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { t, i18n } = useTranslation('file');
  const handleFile = function (entry: FileSystemEntry, fileArray: TFileItem[]) {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file((f: File) => {
          const customFile = {
            file: f,
            path: entry.fullPath
          };
          fileArray.push(customFile);
          resolve(null);
        }, reject);
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        fileArray.push({
          file: new File([], FolderPlaceholder),
          path: entry.fullPath + '/' + FolderPlaceholder
        });
        dirReader.readEntries(function (entries) {
          const promises = [];
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            promises.push(handleFile(entry, fileArray));
          }
          Promise.all(promises).then(resolve, reject);
        });
      }
    });
  };
  const queryClient = useQueryClient();
  const s3client = useOssStore((s) => s.client);
  const bucket = useOssStore((s) => s.currentBucket);
  const prefix = useOssStore((s) => s.prefix);
  const [isLoading, setIsLoading] = useState(false);
  const mutation = useMutation({
    mutationFn: putObject(s3client!)
  });
  const { toast } = useToast();
  const { t: commonT } = useTranslation('common');

  // State for folder upload confirmation
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'preserve' | 'flatten'>('preserve');
  const [folderName, setFolderName] = useState('');

  // Helper functions
  const isFolderUpload = (files: File[]) => {
    if (files.length === 0) return false;
    const firstPath = Reflect.get(files[0], 'path') as string;
    return firstPath && firstPath.includes('/');
  };

  const getFolderName = (files: File[]) => {
    const firstPath = Reflect.get(files[0], 'path') as string;
    return firstPath.split('/')[0];
  };

  const processFilePath = (file: File, mode: 'preserve' | 'flatten') => {
    const path = Reflect.get(file, 'path') as string;

    if (mode === 'preserve') {
      return [...prefix, ...path.split('/')].filter((v) => v !== '').join('/');
    } else {
      const pathParts = path.split('/');
      const withoutFirstLevel = pathParts.slice(1);
      return [...prefix, ...withoutFirstLevel].filter((v) => v !== '').join('/');
    }
  };

  // Extract upload logic into a separate function
  const performUpload = (files: File[], mode: 'preserve' | 'flatten' = 'preserve') => {
    if (!bucket) return;
    setIsLoading(true);

    const values = files.map((file) => {
      const Key = processFilePath(file, mode);
      return {
        Bucket: bucket.name,
        Key,
        ContentType: file.type,
        Body: file
      };
    });

    const values2: typeof values = [];
    Promise.allSettled(
      values.map((v) => {
        return mutation.mutateAsync(v);
      })
    )
      .then((results) => {
        results.forEach((res, i) => {
          if (res.status === 'rejected') {
            values2.push(values[i]);
          }
        });
        values.length = 0;
        return Promise.allSettled(values2.map((v) => mutation.mutateAsync(v)));
      })
      .then((results) => {
        if (
          results.some((res) => {
            return res.status === 'rejected';
          })
        ) {
          toast({
            status: 'error',
            title: 'upload error'
          });
        } else {
          toast({
            status: 'success',
            title: 'upload success'
          });
        }
        // @ts-ignore
        inputRef.current && (inputRef.current.value = null);
        setIsLoading(false);
        queryClient.invalidateQueries([QueryKey.minioFileList]);
        onClose();
      });
  };
  const { getRootProps, getInputProps, inputRef } = useDropzone({
    noClick: true,
    noKeyboard: true,
    useFsAccessApi: false,
    // if use firefox, mime will be losed
    noDrag: window.navigator.userAgent.indexOf('Chrome') < 0,
    onDropAccepted(files) {
      if (!bucket) return;

      // Check if this is a folder upload
      if (isFolderUpload(files)) {
        // Show confirmation modal
        setPendingFiles(files);
        setFolderName(getFolderName(files));
        setUploadMode('preserve');
        setIsConfirmOpen(true);
      } else {
        // Single file upload, proceed directly
        performUpload(files);
      }
    },
    async getFilesFromEvent(event) {
      const files: File[] = [];
      if (event.type === 'drop') {
        const _files: TFileItem[] = [];
        const promises = [];
        const dataTransfer = (event as React.DragEvent).dataTransfer;
        for (const item of dataTransfer.items) {
          const entry = item.webkitGetAsEntry();
          if (!entry) return [];
          promises.push(handleFile(entry, _files));
        }
        return Promise.all(promises).then<File[], File[]>(
          () => {
            return _files.map((_file) => {
              const file = _file.file;
              Reflect.set(file, 'path', _file.path);
              return file;
            });
          },
          () => []
        );
      } else if (event.type === 'change') {
        const fileList = (event as React.ChangeEvent<HTMLInputElement>).target.files || [];
        for (const file of fileList) {
          // 支持文件夹
          const path = file.webkitRelativePath || file.name;
          Reflect.set(file, 'path', path);
          files.push(file);
        }
      }
      return files;
    }
  });
  const onButtonClick = (uploadType: 'folder' | 'file') => {
    if (uploadType === 'folder') {
      inputRef.current?.setAttribute('webkitdirectory', '');
      inputRef.current?.setAttribute('directory', '');
    } else {
      inputRef.current?.removeAttribute('webkitdirectory');
      inputRef.current?.removeAttribute('directory');
    }
    // openDialog()
    inputRef.current?.click();
  };
  return (
    <>
      <Button
        display={'flex'}
        gap={'8px'}
        p="4px"
        minW={'unset'}
        onClick={() => onOpen()}
        {...styles}
      >
        <UploadIcon boxSize="24px" color={'grayModern.500'} />
        <Text display={['none', null, null, null, 'initial']} color={'grayModern.900'}>
          {t('upload')}
        </Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent maxW={'530px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader>{t('upload')}</ModalHeader>
          <ModalBody h="100%" w="100%">
            {isLoading ? (
              <Center w="full">
                <Spinner size={'md'} mx="auto" />
              </Center>
            ) : (
              <Center
                // width={'510px'}
                h="180px"
                borderRadius={'4px'}
                border={'dashed'}
                borderColor={'grayModern.300'}
                transition={'0.3s'}
                bgColor={'grayModern.25'}
                {...getRootProps()}
              >
                <input {...getInputProps({ multiple: true })} />
                {i18n.language === 'zh' ? (
                  <HStack spacing={'5px'}>
                    <Text>打开</Text>
                    <Link
                      _hover={{
                        color: 'blue'
                      }}
                      variant={'unstyled'}
                      onClick={() => {
                        onButtonClick('file');
                      }}
                    >
                      文件
                    </Link>
                    <Text>或</Text>
                    <Link
                      _hover={{
                        color: 'blue'
                      }}
                      onClick={() => {
                        onButtonClick('folder');
                      }}
                      variant={'unstyled'}
                    >
                      文件夹
                    </Link>
                  </HStack>
                ) : (
                  <HStack spacing={'5px'}>
                    <Text>open</Text>
                    <Link
                      _hover={{
                        color: 'blue'
                      }}
                      onClick={() => {
                        onButtonClick('file');
                      }}
                      variant={'unstyled'}
                    >
                      file
                    </Link>
                    <Text>or</Text>
                    <Link
                      _hover={{
                        color: 'blue'
                      }}
                      onClick={() => {
                        onButtonClick('folder');
                      }}
                      variant={'unstyled'}
                    >
                      folder
                    </Link>
                  </HStack>
                )}
              </Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Folder Upload Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingFiles([]);
          // @ts-ignore
          inputRef.current && (inputRef.current.value = null);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent maxW={'530px'} bgColor={'#FFF'}>
          <ModalCloseButton />
          <ModalHeader>{t('prepareUpload')}</ModalHeader>
          <ModalBody px="32px" pt={'24px'} py="32px">
            <Text mb="8px" color={'#18181B'} fontSize={'16px'}>
              {t('selectedFolder')}: {folderName}
            </Text>
            <Text mb={'16px'} color="#18181B" fontSize="14px">
              {i18n.language === 'zh' ? (
                <>
                  包含{' '}
                  <Text as="span" color="#0884DD" fontWeight="500">
                    {pendingFiles.length}
                  </Text>{' '}
                  个文件
                </>
              ) : (
                <>
                  Contains{' '}
                  <Text as="span" color="#0884DD" fontWeight="500">
                    {pendingFiles.length}
                  </Text>{' '}
                  files
                </>
              )}
            </Text>

            <VStack align="stretch" spacing="16px">
              <Flex
                justifyContent={'space-between'}
                p="16px"
                border="1px solid"
                borderRadius="12px"
                borderColor={uploadMode === 'preserve' ? 'brightBlue.500' : 'grayModern.200'}
                cursor="pointer"
                onClick={() => setUploadMode('preserve')}
              >
                <Flex alignItems={'start'} gap={'8px'}>
                  <Center
                    boxSize={'16px'}
                    mt={'2px'}
                    borderRadius={'full'}
                    border={'1px solid'}
                    borderColor={uploadMode === 'preserve' ? 'brightBlue.500' : 'grayModern.250'}
                    boxShadow={
                      uploadMode === 'preserve'
                        ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                        : 'none'
                    }
                  >
                    {uploadMode === 'preserve' && (
                      <Box boxSize={'6px'} borderRadius={'full'} bg={'brightBlue.500'}></Box>
                    )}
                  </Center>
                  <Box>
                    <Text fontWeight="500" color={'grayModern.900'}>
                      {t('preserveStructure')}
                    </Text>
                    <Text mt="4px" fontSize="12px" color="grayModern.600">
                      {t('pathExample')}: /{folderName}/index.html
                    </Text>
                  </Box>
                </Flex>
                <Badge height={'20px'} borderRadius={'full'} px={'10px'}>
                  {t('default')}
                </Badge>
              </Flex>

              <Box
                p="16px"
                border="1px solid"
                borderRadius="12px"
                borderColor={uploadMode === 'flatten' ? 'brightBlue.500' : 'grayModern.200'}
                cursor="pointer"
                onClick={() => setUploadMode('flatten')}
              >
                <Flex justifyContent={'space-between'}>
                  <Flex alignItems={'start'} gap={'8px'}>
                    <Center
                      boxSize={'16px'}
                      mt={'2px'}
                      borderRadius={'full'}
                      border={'1px solid'}
                      borderColor={uploadMode === 'flatten' ? 'brightBlue.500' : 'grayModern.250'}
                      boxShadow={
                        uploadMode === 'flatten'
                          ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                          : 'none'
                      }
                    >
                      {uploadMode === 'flatten' && (
                        <Box boxSize={'6px'} borderRadius={'full'} bg={'brightBlue.500'}></Box>
                      )}
                    </Center>
                    <Box>
                      <Text fontWeight="500" color={'grayModern.900'}>
                        {t('flattenStructure')}
                      </Text>
                      <Text mt="4px" fontSize="12px" color="grayModern.600">
                        {t('pathExample')}: index.html
                      </Text>
                    </Box>
                  </Flex>
                  <Badge height={'20px'} borderRadius={'full'} px={'10px'} bg={'#F0FBFF'}>
                    {t('forStaticHosting')}
                  </Badge>
                </Flex>
                <Divider
                  my={'12px'}
                  orientation="horizontal"
                  borderStyle="dashed"
                  borderColor="grayModern.200"
                />
                <Flex alignItems={'center'}>
                  <TriangleAlert color="#EA580C" size={12} />
                  <Text fontSize={'12px'} fontWeight={400} color={'#18181B'} ml={'4px'}>
                    {t('overwriteWarning')}
                  </Text>
                </Flex>
              </Box>
            </VStack>

            <HStack mt="32px" spacing="16px" justifyContent="flex-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setPendingFiles([]);
                  // @ts-ignore
                  inputRef.current && (inputRef.current.value = null);
                }}
              >
                {commonT('cancel')}
              </Button>
              <Button
                variant="solid"
                onClick={() => {
                  setIsConfirmOpen(false);
                  performUpload(pendingFiles, uploadMode);
                  setPendingFiles([]);
                }}
              >
                {t('confirmUpload')}
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
