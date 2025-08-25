import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Textarea,
  Box
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { CronJobEditType } from '@/types/job';

const EditEnvs = ({
  defaultEnv = [],
  successCb,
  onClose
}: {
  defaultEnv: CronJobEditType['envs'];
  successCb: (e: { key: string; value: string }[]) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = useState(
    defaultEnv
      .filter((item) => !item.valueFrom) // Only env that is not valuefrom can be edited
      .map((item) => `${item.key}=${item.value}`)
      .join('\n')
  );

  const onSubmit = useCallback(() => {
    const lines = inputVal.split('\n').filter((item) => item);
    const result = lines
      .map((str) => {
        // replace special symbol
        str = str.trim();
        if (/^-\s*/.test(str)) {
          str = str.replace(/^-\s*/, '');
        }
        if (str.includes('=')) {
          const i = str.indexOf('=');
          return [str.slice(0, i), str.slice(i + 1)];
        } else if (str.includes(':')) {
          const i = str.indexOf(':');
          return [str.slice(0, i), str.slice(i + 1)];
        }
        return '';
      })
      .filter((item) => item)
      .map((item) => {
        // remove quotation
        const key = item[0].replace(/^['"]|['"]$/g, '').trim();
        const value = item[1].replace(/^['"]|['"]$/g, '').trim();

        return {
          key,
          value
        };
      });

    // concat valueFrom env
    successCb([...defaultEnv.filter((item) => item.valueFrom), ...result]);
    onClose();
  }, [defaultEnv, inputVal, onClose, successCb]);

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent maxH={'90vh'} maxW={'90vw'} minW={'530px'} w={'auto'}>
        <ModalHeader>{t('Edit Environment Variables')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box fontSize={'14px'} fontWeight={500} color={'messenger.900'} mb={'8px'}>
            {t('Environment Variables')}
          </Box>
          <Textarea
            h={'350px'}
            maxH={'100%'}
            value={inputVal}
            resize={'both'}
            placeholder={t('Env Placeholder') || ''}
            overflowX={'auto'}
            whiteSpace={inputVal === '' ? 'pre-wrap' : 'nowrap'}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button w={'88px'} onClick={onSubmit}>
            {t('Confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditEnvs;
