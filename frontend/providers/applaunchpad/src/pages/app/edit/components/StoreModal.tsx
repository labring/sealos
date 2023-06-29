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
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import MyFormControl from '@/components/FormControl';
import { useTranslation } from 'next-i18next';
import { pathToNameFormat } from '@/utils/tools';

export type StoreType = {
  id?: string;
  name: string;
  path: string;
  value: number;
};

const StoreModal = ({
  defaultValue = {
    name: '',
    path: '',
    value: 1
  },
  listNames,
  isEditStore,
  successCb,
  closeCb
}: {
  defaultValue?: StoreType;
  listNames: string[];
  isEditStore: boolean;
  successCb: (e: StoreType) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();
  const type = useMemo(() => (!!defaultValue.id ? 'create' : 'edit'), [defaultValue]);
  const minVal = useMemo(
    () => (isEditStore ? defaultValue.value : 1),
    [defaultValue.value, isEditStore]
  );
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });
  const textMap = {
    create: {
      title: `${t('Update')} ${t('Storage')}`
    },
    edit: {
      title: `${t('Add')} ${t('Storage')}`
    }
  };

  return (
    <>
      <Modal isOpen onClose={closeCb}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{textMap[type].title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={5} isInvalid={!!errors.value}>
              <Box mb={1}>{t('capacity')} </Box>
              <Tooltip label={`${t('Storage Range')}: ${minVal}~20 Gi`}>
                <NumberInput max={20} min={minVal} step={1} position={'relative'}>
                  <Box
                    position={'absolute'}
                    right={10}
                    top={'50%'}
                    transform={'translateY(-50%)'}
                    color={'blackAlpha.600'}
                  >
                    Gi
                  </Box>
                  <NumberInputField
                    {...register('value', {
                      required: t('Storage Value can not empty') || 'Storage Value can not empty',
                      min: {
                        value: minVal,
                        message: `${t('Min Storage Value')} ${minVal} Gi`
                      },
                      max: {
                        value: 20,
                        message: `${t('Max Storage Value')} 20 Gi`
                      },
                      valueAsNumber: true
                    })}
                    max={20}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Tooltip>
            </FormControl>
            <MyFormControl showError errorText={errors.path?.message} pb={2}>
              <Box mb={1}>{t('mount path')}</Box>
              <Input
                placeholder="如：/data"
                title={
                  isEditStore
                    ? t('Can not change storage path') || 'Can not change storage path'
                    : ''
                }
                disabled={isEditStore}
                {...register('path', {
                  required: t('Storage path can not empty') || 'Storage path can not empty',
                  pattern: {
                    value: /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/,
                    message: t('Mount Path Auth')
                  },
                  validate: (e) => {
                    if (listNames.includes(e.toLocaleLowerCase())) {
                      return t('ConfigMap Path Conflict') || 'ConfigMap Path Conflict';
                    }
                    return true;
                  },
                  onChange(e) {
                    setValue('name', pathToNameFormat(e.target.value));
                  }
                })}
              />
            </MyFormControl>
          </ModalBody>

          <ModalFooter>
            <Button w={'110px'} variant={'primary'} onClick={handleSubmit(successCb)}>
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default StoreModal;
