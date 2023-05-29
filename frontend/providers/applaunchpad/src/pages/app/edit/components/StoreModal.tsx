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

export type StoreType = {
  id?: string;
  path: string;
  value: number;
};

const StoreModal = ({
  defaultValue = {
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
  const type = useMemo(() => (!!defaultValue.id ? 'create' : 'edit'), [defaultValue]);
  const minVal = useMemo(
    () => (isEditStore ? defaultValue.value : 1),
    [defaultValue.value, isEditStore]
  );
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });
  const textMap = {
    create: {
      title: '添加存储卷'
    },
    edit: {
      title: '修改存储卷'
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
              <Box mb={1}>容量</Box>
              <Tooltip label={`容量范围: ${minVal}~20 Gi`}>
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
                      required: '容量不能为空',
                      min: {
                        value: minVal,
                        message: `容量最为为 ${minVal} Gi`
                      },
                      max: {
                        value: 20,
                        message: '容量最大为 20 Gi'
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
            <MyFormControl showError errorText={errors.path?.message} pb={0}>
              <Box mb={1}>挂载路径</Box>
              <Input
                placeholder="如：/data"
                title={isEditStore ? '不允许修改挂载路径' : ''}
                disabled={isEditStore}
                {...register('path', {
                  required: '挂载路径不能为空',
                  pattern: {
                    value: /^[0-9a-zA-Z/][0-9a-zA-Z/.-]*[0-9a-zA-Z/]$/,
                    message: `挂在路径需满足: [a-z0-9]([-a-z0-9]*[a-z0-9])?`
                  },
                  validate: (e) => {
                    if (listNames.includes(e.toLocaleLowerCase())) {
                      return '与其他存储路径冲突';
                    }
                    return true;
                  }
                })}
              />
            </MyFormControl>
          </ModalBody>

          <ModalFooter>
            <Button w={'110px'} variant={'primary'} onClick={handleSubmit(successCb)}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default StoreModal;
