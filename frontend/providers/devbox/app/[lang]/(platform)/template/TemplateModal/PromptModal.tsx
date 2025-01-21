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
import { useTranslations } from 'next-intl';

const OverviewTemplateVersionModal = ({
  onSubmit,
  version,
  template,
  ...props
}: Omit<ModalProps, 'children'> & { onSubmit: () => void; version: string; template: string }) => {
  const t = useTranslations();
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
          {t.rich('overview_template_version_prompt', {
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
        </ModalBody>
        <ModalFooter pb={'24px'}>
          <ButtonGroup variant={'solid'}>
            <Button
              variant={'outline'}
              onClick={() => {
                props.onClose();
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                onSubmit();
                props.onClose();
              }}
            >
              {t('continue')}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
export default OverviewTemplateVersionModal;
