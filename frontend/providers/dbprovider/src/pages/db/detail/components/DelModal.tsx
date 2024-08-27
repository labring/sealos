import { delDBByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBSource, DBSourceType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
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
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

enum Page {
  REMINDER = 'REMINDER',
  DELETION_WARNING = 'DELETION_WARNING'
}

const DelModal = ({
  dbName,
  onClose,
  onSuccess,
  source
}: {
  dbName: string;
  onClose: () => void;
  onSuccess: () => void;
  source?: DBSource;
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { message: toast } = useMessage();
  const [activePage, setActivePage] = useState<Page>(Page.REMINDER);
  const pageManuallyChangedRef = useRef(false);

  useEffect(() => {
    if (!pageManuallyChangedRef.current) {
      source?.hasSource ? setActivePage(Page.REMINDER) : setActivePage(Page.DELETION_WARNING);
    }
  }, [source]);

  const deleteTypeTipMap: Record<DBSourceType, I18nCommonKey> = {
    app_store: t('delete_template_app_tip'),
    sealaf: t('delete_sealaf_app_tip')
  };

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delDBByName(dbName);
      toast({
        title: t('delete_successful'),
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('delete_failed'),
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [dbName, toast, t, onSuccess, onClose]);

  const openTemplateApp = () => {
    if (!source?.hasSource) return;
    if (source?.sourceType === 'app_store') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-template',
        pathname: '/instance',
        query: { instanceName: source?.sourceName }
      });
    }
    if (source?.sourceType === 'sealaf') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-sealaf',
        pathname: '/',
        query: { instanceName: source?.sourceName }
      });
    }
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <MyIcon name="warning" width={'20px'} h={'20px'} />
            {activePage === Page.REMINDER ? t('remind') : t('delete_warning')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Box color={'grayModern.600'}>
            {activePage === Page.REMINDER && source?.sourceType
              ? deleteTypeTipMap[source?.sourceType]
              : t('delete_hint')}

            {activePage === Page.DELETION_WARNING && (
              <Box my={3}>
                {t('please_enter')}
                <Box
                  as={'span'}
                  px={1}
                  color={'grayModern.900'}
                  fontWeight={'bold'}
                  userSelect={'all'}
                >
                  {dbName}
                </Box>
                {t('confirm')}
              </Box>
            )}
          </Box>

          {activePage === Page.DELETION_WARNING && (
            <Input
              placeholder={`${t('please_enter')}：${dbName}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('Cancel')}
          </Button>

          {activePage === Page.REMINDER && source?.sourceType !== 'sealaf' && (
            <Button
              ml={3}
              variant={'outline'}
              onClick={() => {
                setActivePage(Page.DELETION_WARNING);
                pageManuallyChangedRef.current = true;
              }}
            >
              {t('delete_anyway')}
            </Button>
          )}

          <Button
            ml={3}
            variant={'solid'}
            isDisabled={activePage === Page.DELETION_WARNING && inputValue !== dbName}
            isLoading={loading}
            onClick={activePage === Page.REMINDER ? openTemplateApp : handleDelApp}
          >
            {activePage === Page.REMINDER ? t('confirm_to_go') : t('confirm_delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
