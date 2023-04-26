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
  FormErrorMessage,
  Box,
  Textarea,
  Input
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import MyFormControl from '@/components/FormControl';

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
  const type = useMemo(() => (!!defaultValue.id ? 'create' : 'edit'), [defaultValue]);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: defaultValue
  });
  const textMap = {
    create: {
      title: '添加ConfigMap'
    },
    edit: {
      title: '修改ConfigMap'
    }
  };
  console.log(listNames);
  return (
    <>
      <Modal isOpen onClose={closeCb}>
        <ModalOverlay />
        <ModalContent maxW={'590px'}>
          <ModalHeader>{textMap[type].title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <MyFormControl showError errorText={errors.mountPath?.message}>
              <Box mb={1}>文件名</Box>
              <Input
                placeholder="文件名，如 /etc/kubernetes/admin.conf "
                {...register('mountPath', {
                  required: '文件名不能为空',
                  pattern: {
                    value: /^[0-9a-zA-Z/][0-9a-zA-Z/.-]*[0-9a-zA-Z/]$/,
                    message: `文件名需满足: [a-z0-9]([-a-z0-9]*[a-z0-9])?`
                  },
                  validate: (e) => {
                    if (listNames.includes(e.toLocaleLowerCase())) {
                      return '与其他 configMap 路径冲突';
                    }
                    return true;
                  }
                })}
              />
            </MyFormControl>
            <FormControl isInvalid={!!errors.value}>
              <Box mb={1}>文件值</Box>
              <Textarea
                rows={5}
                {...register('value', {
                  required: '文件值不能为空'
                })}
              />
            </FormControl>
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

export default ConfigmapModal;
