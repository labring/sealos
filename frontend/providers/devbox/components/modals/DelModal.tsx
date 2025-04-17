import {
  Box,
  Button,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { delDevbox } from '@/api/devbox';
import MyIcon from '@/components/Icon';
import { useIDEStore } from '@/stores/ide';
import { DevboxDetailTypeV2, DevboxListItemTypeV2 } from '@/types/devbox';

const DelModal = ({
  devbox,
  onClose,
  refetchDevboxList,
  onSuccess
}: {
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
  onClose: () => void;
  onSuccess: () => void;
  refetchDevboxList: () => void;
}) => {
  const t = useTranslations();
  const { message: toast } = useMessage();
  const { removeDevboxIDE } = useIDEStore();

  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleDelDevbox = useCallback(async () => {
    try {
      setLoading(true);
      await delDevbox(devbox.name);
      removeDevboxIDE(devbox.name);
      toast({
        title: t('delete_successful'),
        status: 'success'
      });
      onSuccess();
      onClose();

      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = 3000;

      const retry = async () => {
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
          await refetchDevboxList();
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
    setLoading(false);
  }, [devbox.name, removeDevboxIDE, toast, t, onSuccess, onClose, refetchDevboxList]);

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false} size={'lg'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <MyIcon name="warning" width={'20px'} h={'20px'} />
            {t('delete_warning')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Box>{t('delete_warning_content')}</Box>
          <Box
            fontSize={'12px'}
            color={'grayModern.600'}
            mt={2}
            bg={'grayModern.50'}
            borderRadius={'4px'}
            p={2}
          >
            {t('delete_warning_content_2')}
          </Box>
          <Box mt={4}>
            {t.rich('please_enter_devbox_name_confirm', {
              name: devbox.name,
              strong: (chunks) => (
                <Text fontWeight={'bold'} display={'inline-block'} userSelect={'all'}>
                  {chunks}
                </Text>
              )
            })}
          </Box>
          <Input
            placeholder={devbox.name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            mt={4}
            w={'100%'}
            border={'1px solid'}
            borderColor={'grayModern.300'}
            borderRadius={'4px'}
            p={2}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('cancel')}
          </Button>
          <Button
            ml={3}
            variant={'solid'}
            isLoading={loading}
            onClick={handleDelDevbox}
            isDisabled={inputValue !== devbox.name}
          >
            {t('confirm_delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
