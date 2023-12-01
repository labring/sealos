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
  Input
} from '@chakra-ui/react';
import CreateFolderIcon from '@/components/Icons/CreateFolderIcon';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { putObject } from '@/api/s3';
import { useOssStore } from '@/store/ossStore';
import { FolderPlaceholder, QueryKey } from '@/consts';
import { useTranslation } from 'next-i18next';
import { useToast } from '@/hooks/useToast';
export default function CreateFolderModal({ ...styles }: Omit<IconButtonProps, 'aria-label'>) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const [folderName, setFolderName] = useState('');
  const queryClient = useQueryClient();
  const oss = useOssStore();
  const { t } = useTranslation('file');
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: putObject(oss.client!),
    onSuccess() {
      queryClient.invalidateQueries([QueryKey.minioFileList]);
      onClose();
    },
    onError(error) {
      toast({
        //@ts-ignore
        title: error.message,
        status: 'error'
      });
      onClose();
    }
  });
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
        <CreateFolderIcon boxSize="24px" color={'grayModern.500'} />
        <Text color="grayModern.900" display={['none', null, null, null, 'initial']}>
          {t('createFolder')}
        </Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'560px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">{t('createFolder')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px" display={'flex'} flexDir={'column'}>
            <Text mb="12px">{t('folderName')}</Text>
            <Input
              mb="20px"
              type="text"
              variant={'secondary'}
              placeholder="name"
              value={folderName}
              onChange={(v) => setFolderName(v.target.value.trim())}
            />
            <Button
              variant={'primary'}
              alignSelf={'self-end'}
              px="43px"
              py="8px"
              onClick={() => {
                const Bucket = oss.currentBucket?.name;
                const Key = [...oss.prefix, folderName, FolderPlaceholder].join('/');
                Bucket && Key && mutation.mutate({ Bucket, Key });
              }}
            >
              {t('confirm')}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
