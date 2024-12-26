import { deleteTemplate } from '@/api/template';
import MyIcon from '@/components/Icon';
import {
  Button,
  ButtonGroup,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  Text
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

const DeleteTemplateVersionModal = ({
  uid,
  version,
  template,
  isLasted,
  ...props
}: Omit<ModalProps, 'children'> & {
  uid: string;
  version: string;
  template: string;
  isLasted: boolean;
}) => {
  const t = useTranslations();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const deleteVersion = useMutation(deleteTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['templateList']);
      queryClient.invalidateQueries(['template-repository-list']);
      message({
        title: t('delete_template_version_success'),
        status: 'success'
      });
    },
    onError: (error) => {
      message({
        title: error as string,
        status: 'error'
      });
    }
  });
  return (
    <Modal lockFocusAcrossFrames={false} {...props} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent maxW={'400px'} margin={'auto'}>
        <ModalHeader>
          <Flex gap={'10px'}>
            <MyIcon name="warning" boxSize={'20px'} />
            <Text fontSize={'16px'}>{t('prompt')}</Text>
          </Flex>
        </ModalHeader>
        <ModalBody px={'36px'} py={'24px'}>
          <ModalCloseButton />
          {t.rich('delete_template_version_prompt', {
            version: (
              <Text display={'inline'} fontWeight={'600'}>
                {version}
              </Text>
            ) as any,
            name: (
              <Text display={'inline'} fontWeight={'600'}>
                {template}
              </Text>
            ) as any
          })}
          {isLasted && <Text mt={'12px'}>{t('delete_lasted_template_version_prompt')}</Text>}
        </ModalBody>
        <ModalFooter pb={'24px'}>
          <ButtonGroup variant={'outline'}>
            <Button
              onClick={() => {
                props.onClose();
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={async () => {
                await deleteVersion.mutateAsync(uid);
                props.onClose();
              }}
              _hover={{
                color: 'red.600'
              }}
            >
              {t('delete')}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
export default DeleteTemplateVersionModal;
