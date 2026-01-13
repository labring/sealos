import React, { useCallback, useMemo } from 'react';
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
  NumberDecrementStepper
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import MyFormControl from '@/components/FormControl';
import { useTranslation } from 'next-i18next';
import { mountPathToConfigMapKey } from '@/utils/tools';
import { MyTooltip } from '@sealos/ui';
import { StorageType } from '@/types/app';

export type StoreType = {
  id?: string;
  name: string;
  path: string;
  value: number;
  storageType?: StorageType;
};

const StoreModal = ({
  defaultValue = {
    name: '',
    path: '',
    value: 1,
    storageType: 'local'
  },
  minValue,
  maxValue,
  listNames,
  isEditStore,
  successCb,
  closeCb
}: {
  defaultValue?: StoreType;
  minValue: number;
  maxValue: number;
  listNames: string[];
  isEditStore: boolean;
  successCb: (e: StoreType) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();
  const type = useMemo(() => (!!defaultValue.id ? 'create' : 'edit'), [defaultValue]);

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

  const clampValue = useCallback(
    (value: number) => {
      return Number.isSafeInteger(value) ? Math.min(maxValue, Math.max(value, minValue)) : minValue;
    },
    [minValue, maxValue]
  );

  return (
    <>
      <Modal isOpen onClose={closeCb} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{textMap[type].title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={5} isInvalid={!!errors.value}>
              <Box mb={'8px'} fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                {t('capacity')}
              </Box>
              <MyTooltip
                label={
                  maxValue === 0
                    ? t('Storage limit reached')
                    : `${t('Storage Range')}: ${minValue}~${maxValue} Gi`
                }
              >
                <NumberInput
                  step={1}
                  position={'relative'}
                  isDisabled={maxValue === 0}
                  {...register('value', {
                    required: t('Storage Value can not empty') || 'Storage Value can not empty',
                    min: {
                      value: minValue,
                      message: `${t('Min Storage Value')} ${minValue} Gi`
                    },
                    max: {
                      value: maxValue,
                      message: `${t('Max Storage Value')} ${maxValue} Gi`
                    },
                    valueAsNumber: true
                  })}
                  min={minValue}
                  max={maxValue}
                  onChange={(e) => {
                    setValue('value', Number(e));
                  }}
                >
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
                    _hover={{
                      borderColor: '#85CCFF',
                      bg: '#F7F8FA'
                    }}
                    _focusVisible={{
                      borderColor: '#219BF4',
                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                      bg: '#FFF',
                      color: '#111824'
                    }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </MyTooltip>
            </FormControl>
            <MyFormControl showError errorText={errors.path?.message} pb={2}>
              <Box mb={'8px'} fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                {t('mount path')}
              </Box>
              <Input
                width={'100%'}
                placeholder={t('form.storage_path_placeholder')}
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
                    setValue('name', mountPathToConfigMapKey(e.target.value));
                  }
                })}
              />
            </MyFormControl>
          </ModalBody>

          <ModalFooter>
            <Button
              w={'88px'}
              onClick={handleSubmit((e) => {
                successCb({
                  id: e.id,
                  name: e.name,
                  path: e.path,
                  value: clampValue(e.value),
                  storageType: e.storageType || 'local'
                });
              })}
            >
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default StoreModal;
