import { delDBByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBSource, DBSourceType, DBType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { deleteDatasource } from '@/services/chat2db/datasource';
import { useDBStore } from '@/store/db';
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
import { track } from '@sealos/gtm';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { getConfigByName } from '@/api/db';
import { load } from 'js-yaml';

enum Page {
  REMINDER = 'REMINDER',
  DELETION_WARNING = 'DELETION_WARNING'
}

const DelModal = ({
  dbName,
  dbType,
  onClose,
  onSuccess,
  source
}: {
  dbName: string;
  dbType: DBType;
  onClose: () => void;
  onSuccess: () => void;
  source?: DBSource;
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml] = useState<string>('');
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

  const getDatasourceIdFromYaml = async (
    dbName: string,
    dbType: DBType
  ): Promise<number | undefined> => {
    try {
      const yamlStr = await getConfigByName({ name: dbName, dbType });
      console.log(yamlStr);
      const doc = load(yamlStr) as any;
      return doc?.metadata?.labels?.['chat2db.io/id'];
    } catch (e) {
      console.error('Failed to get datasource id from yaml', e);
      return undefined;
    }
  };

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 获取 datasource id
      const dataSourceId = await getDatasourceIdFromYaml(dbName, dbType);
      const apiKey = process.env.NEXT_PUBLIC_CHAT2DB_API_KEY!;
      console.log(dataSourceId);
      // 2. 先删数据库
      await delDBByName(dbName);

      track({
        event: 'deployment_delete',
        module: 'database',
        context: 'app'
      });
      // 3. 再删数据源
      if (dataSourceId) {
        try {
          await deleteDatasource(dataSourceId, apiKey);
        } catch (e) {
          console.log('deleteDatasource error', e);
        }
      }

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

      track('error_occurred', {
        module: 'database',
        error_code: 'DELETE_ERROR'
      });
    }
    setLoading(false);
  }, [dbName, dbType, toast, t, onSuccess, onClose]);

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

          {/* {activePage === Page.REMINDER && source?.sourceType !== 'sealaf' && (
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
          )} */}

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
