import React, { useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  Box,
  Textarea,
  Input
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import MyFormControl from '@/components/FormControl';
import { useTranslation } from 'next-i18next';

export type ConfigMapType = {
  id?: string;
  mountPath: string;
  value: string;
};

const ConfigmapModal = ({
  defaultValue = {
    mountPath: '',
    value: ''
  },
  listNames,
  successCb,
  closeCb
}: {
  defaultValue?: ConfigMapType;
  listNames: string[];
  successCb: (e: ConfigMapType) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();
  const type = useMemo(() => (!defaultValue.id ? 'create' : 'edit'), [defaultValue]);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });
  const textMap = {
    create: {
      title: 'Add'
    },
    edit: {
      title: 'Update'
    }
  };

  return (
    <>
      <Modal isOpen onClose={closeCb} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent maxH={'90vh'} maxW={'90vw'} minW={'530px'} w={'auto'}>
          <ModalHeader>
            {t(textMap[type].title)}
            {t('ConfigMap Tip')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <MyFormControl showError errorText={errors.mountPath?.message}>
              <Box mb={'8px'} fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                {' '}
                {t('filename')}
              </Box>
              <Input
                width={'100%'}
                placeholder={`${t('File Name')}: /etc/kubernetes/admin.conf`}
                {...register('mountPath', {
                  required: t('Filename can not empty') || 'Filename can not empty',
                  pattern: {
                    value: /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/,
                    message: t('Mount Path Auth')
                  },
                  validate: (e) => {
                    if (listNames.includes(e.toLocaleLowerCase())) {
                      return t('ConfigMap Path Conflict') || 'ConfigMap Path Conflict';
                    }
                    return true;
                  }
                })}
              />
            </MyFormControl>
            <FormControl isInvalid={!!errors.value}>
              <Box mb={'8px'} fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                {t('file value')}{' '}
              </Box>
              <Textarea
                rows={10}
                resize={'both'}
                {...register('value', {
                  required: t('File Value can not empty') || 'File Value can not empty'
                })}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button w={'88px'} onClick={handleSubmit(successCb)}>
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ConfigmapModal;
