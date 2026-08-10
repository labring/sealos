import { useToast } from '@/hooks/useToast';
import { parseDotenvEnvs, stringifyDotenvEnvs } from '@/utils/dotenvEnv';
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
  successCb: (e: AppEditType['envs']) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [inputVal, setInputVal] = useState(
    stringifyDotenvEnvs(
      defaultEnv
        .filter((item) => !item.valueFrom) // Only env that is not valuefrom can be edited
        .map((item) => ({ key: item.key, value: item.value }))
        .filter((item) => item.key)
    )
  );

  const onSubmit = useCallback(() => {
    const result = parseDotenvEnvs(inputVal);
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
            whiteSpace={'pre'}
            h={'350px'}
            maxH={'100%'}
            value={inputVal}
            resize={'both'}
            wrap={'off'}
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
