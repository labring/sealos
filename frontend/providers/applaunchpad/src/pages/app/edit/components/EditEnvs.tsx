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
import { parseDotenvEnvs, stringifyDotenvEnvs } from '@/utils/dotenvEnv';

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
