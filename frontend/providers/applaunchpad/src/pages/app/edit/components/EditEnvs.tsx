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
import { AppEditType } from '@/types/app';
import { useToast } from '@/hooks/useToast';

type EditableEnv = {
  key: string;
  value: string;
  valueFrom?: any;
};

const findDuplicateEnvKey = (envs: EditableEnv[]) => {
  const seenKeys = new Set<string>();

  for (const env of envs) {
    const key = env.key.trim();
    if (!key) continue;
    if (seenKeys.has(key)) return key;
    seenKeys.add(key);
  }

  return '';
};

const EditEnvs = ({
  defaultEnv = [],
  successCb,
  onClose
}: {
  defaultEnv: AppEditType['envs'];
  successCb: (e: { key: string; value: string }[]) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [inputVal, setInputVal] = useState(
    defaultEnv
      .filter((item) => !item.valueFrom) // Only env that is not valuefrom can be edited
      .map((item) => `${item.key}=${item.value}`)
      .join('\n')
  );

  const onSubmit = useCallback(() => {
    const lines = inputVal.split('\n').filter((item) => item);
    const result = lines
      .map((str): [string, string] | undefined => {
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
        return undefined;
      })
      .filter((item): item is [string, string] => !!item)
      .map((item) => {
        // remove quotation
        const key = item[0].replace(/^['"]|['"]$/g, '').trim();
        const value = item[1].replace(/^['"]|['"]$/g, '').trim();

        return {
          key,
          value
        };
      });
    const nextEnv = [...defaultEnv.filter((item) => item.valueFrom), ...result];
    const duplicateKey = findDuplicateEnvKey(nextEnv);

    if (duplicateKey) {
      toast({
        title: t('Env Variable Name Conflict', { name: duplicateKey }),
        status: 'error'
      });
      return;
    }

    // concat valueFrom env
    successCb(nextEnv);
    onClose();
  }, [defaultEnv, inputVal, onClose, successCb, t, toast]);

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
            whiteSpace={'pre-wrap'}
            h={'350px'}
            maxH={'100%'}
            value={inputVal}
            resize={'both'}
            placeholder={t('Env Placeholder') || ''}
            overflowX={'auto'}
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
