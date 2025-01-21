import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import MyIcon from '@/components/Icon';
import { useMessage } from '@sealos/ui';
import { useState } from 'react';
import TemplateDropdown from './TemplateDropdown';

const SelectTemplateModal = ({
  isOpen,
  onClose,
  onOpenCreate,
  onOpenUdate,
  templateRepositoryList
}: {
  isOpen: boolean;
  onClose: () => void;
  templateRepositoryList: {
    iconId: string | null;
    name: string;
    description: null | string;
    uid: string;
  }[];
  onSubmit?: (data: FormData) => void;
  onOpenCreate: () => void;
  onOpenUdate: (templateRepoUid: string) => void;
}) => {
  const { message } = useMessage();
  const t = useTranslations();
  const [selectedTemplateRepoUid, setSelectedTemplateRepoUid] = useState(
    templateRepositoryList?.[0]?.uid
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent maxW="504px" margin={'auto'}>
        <ModalHeader>
          <Text>{t('create_or_update_template')}</Text>
        </ModalHeader>
        <ModalBody pt={'32px'} px={'52px'} pb={'24px'}>
          <ModalCloseButton />
          <Text mb={'10px'} color={'grayModern.900'} fontWeight={500}>
            {t('select_template_tips')}
          </Text>
          <TemplateDropdown
            templateRepositoryList={templateRepositoryList || []}
            selectedTemplateRepoUid={selectedTemplateRepoUid}
            setSelectedTemplateRepoUid={setSelectedTemplateRepoUid}
          />
        </ModalBody>
        <ModalFooter gap={'16px'} px={'52px'}>
          <Button
            variant={'unstyled'}
            color={'brightBlue.600'}
            display={'flex'}
            onClick={() => {
              onOpenCreate();
              onClose();
            }}
          >
            <MyIcon name="plus" boxSize={'20px'} />
            <Text> {t('create_template')}</Text>
          </Button>
          <Button
            variant={'solid'}
            onClick={() => {
              if (!selectedTemplateRepoUid) {
                return message({
                  title: t('select_template_tips'),
                  status: 'error'
                });
              }

              onOpenUdate(selectedTemplateRepoUid);
              onClose();
            }}
          >
            {t('confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SelectTemplateModal;
