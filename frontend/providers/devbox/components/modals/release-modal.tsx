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
  Textarea
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { pauseDevbox, releaseDevbox, startDevbox } from '@/api/devbox';
import { useConfirm } from '@/hooks/useConfirm';
import { useEnvStore } from '@/stores/env';
import { DevboxListItemTypeV2 } from '@/types/devbox';
import { versionSchema } from '@/utils/vaildate';

const ReleaseModal = ({
  onClose,
  onSuccess,
  devbox
}: {
  devbox: Omit<DevboxListItemTypeV2, 'template'>;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const t = useTranslations();
  const { message: toast } = useMessage();

  const { env } = useEnvStore();

  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [releaseDes, setReleaseDes] = useState('');

  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'release_confirm_info',
    showCheckbox: true,
    checkboxLabel: 'pause_devbox_info'
  });

  const handleSubmit = () => {
    const tagResult = versionSchema.safeParse(tag);
    if (!tag) {
      setTagError(true);
    } else if (versionSchema.safeParse(tag).success === false) {
      toast({
        title: t('tag_format_error'),
        status: 'error'
      });
    } else {
      setTagError(false);
      openConfirm((enableRestartMachine: boolean) => handleReleaseDevbox(enableRestartMachine))();
    }
  };

  const handleReleaseDevbox = useCallback(
    async (enableRestartMachine: boolean) => {
      try {
        setLoading(true);
        // 1.pause devbox
        if (devbox.status.value === 'Running') {
          await pauseDevbox({ devboxName: devbox.name });
          // wait 3s
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        // 2.release devbox
        await releaseDevbox({
          devboxName: devbox.name,
          tag,
          releaseDes,
          devboxUid: devbox.id
        });
        // 3.start devbox
        if (enableRestartMachine) {
          await startDevbox({ devboxName: devbox.name });
        }
        toast({
          title: t('submit_release_successful'),
          status: 'success'
        });
        onSuccess();
        onClose();
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('submit_release_failed'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
    },
    [devbox.status.value, devbox.name, devbox.id, tag, releaseDes, toast, t, onSuccess, onClose]
  );

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent minW={'500px'} mt={'100px'} minH={'300px'} top={'50px'}>
          <ModalHeader>
            <Flex alignItems={'center'} gap={'10px'} ml={'14px'}>
              {t('release_version')}
            </Flex>
          </ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} />
          <ModalBody pb={4}>
            <Flex alignItems={'start'} gap={'5px'} mb={'24px'}>
              <Box w={'110px'} fontWeight={'bold'} fontSize={'lg'}>
                {t('image_name')}
              </Box>
              <Input
                defaultValue={`${env.registryAddr}/${env.namespace}/${devbox.name}`}
                isReadOnly
              />
            </Flex>
            <Flex alignItems={'start'} gap={'5px'}>
              <Box w={'110px'} fontWeight={'bold'} fontSize={'lg'}>
                {t('version_config')}
              </Box>
              <Flex gap={'5px'} direction={'column'}>
                <Box w={'100px'}>{t('version_number')}</Box>
                <Input
                  placeholder={t('enter_version_number')}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  mb={'8px'}
                  borderColor={tagError ? 'red.500' : undefined}
                />
                {tagError && (
                  <Box color="red.500" fontSize="sm">
                    {t('tag_required')}
                  </Box>
                )}
                <Box w={'100px'}>{t('version_description')}</Box>
                <Textarea
                  value={releaseDes}
                  minH={'150px'}
                  onChange={(e) => setReleaseDes(e.target.value)}
                  placeholder={t('enter_version_description')}
                />
              </Flex>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button
              variant={'solid'}
              onClick={handleSubmit}
              mr={'11px'}
              width={'80px'}
              isLoading={loading}
            >
              {t('publish')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmChild />
    </Box>
  );
};

export default ReleaseModal;
