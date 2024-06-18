import { delAppByName } from '@/api/app';
import MyIcon from '@/components/Icon';
import { templateDeployKey } from '@/constants/account';
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
  ModalOverlay
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { has } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

enum Page {
  REMINDER = 'REMINDER',
  DELETION_WARNING = 'DELETION_WARNING'
}

const DelModal = ({
  appName,
  onClose,
  onSuccess,
  labels
}: {
  appName: string;
  onClose: () => void;
  onSuccess: () => void;
  labels: { [key: string]: string };
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { message: toast } = useMessage();
  const [activePage, setActivePage] = useState<Page>(Page.REMINDER);
  const pageManuallyChangedRef = useRef(false);

  useEffect(() => {
    if (!pageManuallyChangedRef.current) {
      const hasApplicationSource = has(labels, templateDeployKey);
      hasApplicationSource ? setActivePage(Page.REMINDER) : setActivePage(Page.DELETION_WARNING);
    }
  }, [labels]);

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delAppByName(appName);
      toast({
        title: `${t('success')}`,
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '删除出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [appName, toast, t, onSuccess, onClose]);

  const openTemplateApp = () => {
    if (!labels) return;
    const sourceName = labels[templateDeployKey];
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-template',
      pathname: '/instance',
      query: { instanceName: sourceName },
      messageData: { type: 'InternalAppCall', name: sourceName }
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <MyIcon name="warning" />
            {activePage === Page.REMINDER ? t('Remind') : t('Deletion warning')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Box color={'myGray.600'}>
            {activePage === Page.REMINDER
              ? t('Delete Template App Tip')
              : t(
                  'Are you sure you want to delete this application? If you proceed, all data for this project will be deleted'
                )}
            {activePage === Page.DELETION_WARNING && (
              <Box my={3}>
                {t('Please enter')}
                <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'}>
                  {appName}
                </Box>
                {t('To Confirm')}
              </Box>
            )}
          </Box>
          {activePage === Page.DELETION_WARNING && (
            <Input
              placeholder={t('please enter app name', { appName }) || ''}
              value={inputValue}
              bg={'myWhite.300'}
              onChange={(e) => setInputValue(e.target.value)}
            />
          )}
        </ModalBody>

        <ModalFooter>
          <Button width={'64px'} onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>
          {activePage === Page.REMINDER && (
            <Button
              ml={3}
              variant={'outline'}
              onClick={() => {
                setActivePage(Page.DELETION_WARNING);
                pageManuallyChangedRef.current = true;
              }}
            >
              {t('Delete anyway')}
            </Button>
          )}
          <Button
            ml={3}
            variant={'solid'}
            isDisabled={activePage === Page.DELETION_WARNING && inputValue !== appName}
            isLoading={loading}
            onClick={activePage === Page.REMINDER ? openTemplateApp : handleDelApp}
          >
            {activePage === Page.REMINDER ? t('Confirm to go') : t('Delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
