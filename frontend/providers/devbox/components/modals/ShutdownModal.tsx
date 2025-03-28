import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { shutdownDevbox } from '@/api/devbox';
import { DevboxDetailTypeV2, DevboxListItemTypeV2, ShutdownModeType } from '@/types/devbox';

const ReleaseModal = ({
  onSuccess,
  onClose,
  devbox
}: {
  onSuccess: () => void;
  onClose: () => void;
  devbox: DevboxListItemTypeV2 | DevboxDetailTypeV2;
}) => {
  const t = useTranslations();
  const { message: toast } = useMessage();
  const [loading, setLoading] = useState(false);
  const [shutdownMode, setShutdownMode] = useState<ShutdownModeType>('Stopped');

  const handleShutdown = useCallback(async () => {
    try {
      setLoading(true);
      await shutdownDevbox({ devboxName: devbox.name, shutdownMode });
      toast({
        title: t('pause_success'),
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('pause_error'),
        status: 'error'
      });
      console.error(error);
    }
    onSuccess();
    setLoading(false);
  }, [onSuccess, setLoading, t, toast, devbox.name, shutdownMode]);

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent minW={'500px'} mt={'100px'} minH={'300px'} top={'50px'}>
          <ModalHeader>
            <Flex alignItems={'center'} gap={'10px'} ml={'14px'} fontSize={'16px'}>
              {t('choose_shutdown_mode')}
            </Flex>
          </ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} />
          <ModalBody pb={4} gap={'10px'}>
            {/* normal mode */}
            <Box
              onClick={() => setShutdownMode('Stopped')}
              p={'10px'}
              borderRadius={'4px'}
              borderWidth={1}
              borderColor={shutdownMode === 'Stopped' ? 'blue.500' : 'gray.300'}
              boxShadow={
                shutdownMode === 'Stopped' ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)' : 'none'
              }
            >
              <Box>{t('normal_shutdown_mode')}</Box>
              <Box>{t('normal_shutdown_mode_desc')}</Box>
            </Box>
            {/* cold mode */}
            <Box
              onClick={() => setShutdownMode('Shutdown')}
              p={'10px'}
              borderRadius={'4px'}
              borderWidth={1}
              borderColor={shutdownMode === 'Shutdown' ? 'blue.500' : 'gray.300'}
              boxShadow={
                shutdownMode === 'Shutdown' ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)' : 'none'
              }
            >
              <Box>{t('cold_shutdown_mode')}</Box>
              <Box>{t('cold_shutdown_mode_desc')}</Box>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              variant={'solid'}
              onClick={handleShutdown}
              mr={'11px'}
              width={'80px'}
              isLoading={loading}
            >
              {t('confirm_shutdown')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ReleaseModal;
