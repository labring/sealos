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
  Link
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
  const { getRootProps, getInputProps, isDragAccept, inputRef } = useDropzone({
    noClick: true,
    noKeyboard: true,
    useFsAccessApi: false,
    // if use firefox, mime will be losed
    noDrag: window.navigator.userAgent.indexOf('Chrome') < 0,
    onDropAccepted(files) {
      if (!bucket) return;
      setIsLoading(true);
      const values = files.map((file) => {
        // clear '/' and merege path
        const Key = [...prefix, ...(Reflect.get(file, 'path') as string).split('/')]
          .filter((v) => v !== '')
          .join('/');
        const reqV = {
          Bucket: bucket.name,
          Key,
          ContentType: file.type,
          Body: file
        };
        return reqV;
      });
      const values2: typeof values = [];
      Promise.allSettled(
        values.map((v) => {
          return mutation.mutateAsync(v);
        })
      )
        .then((results) => {
          // retry
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
        <ModalContent
          borderRadius={'4px'}
          maxW={'560px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">{t('upload')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px">
            {isLoading ? (
              <Center w="full">
                <Spinner size={'md'} mx="auto" />
              </Center>
            ) : (
              <Center
                width={'510px'}
                h="180px"
                borderRadius={'4px'}
                border={'dashed'}
                borderColor={'grayModern.200'}
                transition={'0.3s'}
                bgColor={isDragAccept ? 'white_.700' : 'white_.500'}
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
    </>
  );
}
