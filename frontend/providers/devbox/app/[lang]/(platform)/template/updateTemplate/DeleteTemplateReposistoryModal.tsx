import { deleteTemplateRepository } from '@/api/template';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

const DeleteTemplateReposistoryModal = ({
  uid,
  templateRepositoryName,
  ...props
}: Omit<ModalProps, 'children'> & {
  templateRepositoryName: string;
  uid: string;
}) => {
  const t = useTranslations();
  const mutation = useMutation({
    mutationFn: (uid: string) => {
      return deleteTemplateRepository(uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
    }
  });
  const queryClient = useQueryClient();
  return (
    <Modal lockFocusAcrossFrames={false} {...props} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent maxW={'400px'} width={'400px'} margin={'auto'}>
        <ModalHeader>
          <Flex gap={'10px'}>
            <MyIcon name="warning" boxSize={'20px'} />
            <Text fontSize={'16px'}>{t('prompt')}</Text>
          </Flex>
        </ModalHeader>
        <ModalBody px={'36px'} py={'24px'}>
          <ModalCloseButton />
          {t.rich('delete_template_prompt', {
            name: (
              <Text display={'inline'} fontWeight={600}>
                {templateRepositoryName}
              </Text>
            ) as any
          })}
        </ModalBody>
        <ModalFooter pb={'24px'}>
          <ButtonGroup gap={'12px'}>
            <Button
              variant={'outline'}
              onClick={() => {
                props.onClose();
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant={'solid'}
              onClick={async () => {
                await mutation.mutateAsync(uid);
                await queryClient.invalidateQueries(['template-repository-private']);
                props.onClose();
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

export default DeleteTemplateReposistoryModal;
