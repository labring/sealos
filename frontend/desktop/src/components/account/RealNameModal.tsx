import {
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  useDisclosure,
  VStack,
  FormControl,
  HStack,
  FormLabel,
  Button,
  FormErrorMessage,
  Input,
  useToast,
  FlexProps,
  UseToastOptions,
  Box,
  Flex,
  Center
} from '@chakra-ui/react';
import { CloseIcon, useMessage, WarningIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import React, { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { identityCodeValid } from '@/utils/tools';
import { realNameAuthRequest } from '@/api/auth';
import { useMutation } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';

export function useRealAuthNotification(props?: UseToastOptions) {
  const realAuthNotification = useToast({
    position: 'top',
    ...props,
    render: (props) => {
      return (
        <Box
          position={'relative'}
          background={'white'}
          py={'12px'}
          px={5}
          fontSize={'md'}
          borderRadius={'lg'}
          boxShadow={
            '0px 0px 1px 0px rgba(19, 51, 107, 0.08), 0px 4px 10px 0px rgba(19, 51, 107, 0.08)'
          }
        >
          <Flex alignItems={'center'} gap={'12px'}>
            <Center bg={'red.50'} borderRadius={'full'} p={1}>
              <WarningIcon />
            </Center>
            <Box flex={1} color={'sealosGrayModern.900'}>
              {props?.title && (
                <Box
                  fontSize={'14px'}
                  fontWeight={400}
                  mb={'0px'}
                  whiteSpace={'normal'}
                  wordBreak={'break-word'}
                >
                  <RealNameModal onFormSuccess={props.onClose}>
                    <Text cursor="pointer" textDecoration="underline" color="#D92D20">
                      {props?.title}
                    </Text>
                  </RealNameModal>
                </Box>
              )}
            </Box>

            {props?.isClosable && (
              <Center
                borderRadius={'md'}
                p={'4px'}
                _hover={{ bg: 'rgba(0, 0, 0, 0.06)' }}
                cursor={'pointer'}
                onClick={props.onClose}
              >
                <CloseIcon w="16px" h="16px" fill={'black'} />
              </Center>
            )}
          </Flex>
        </Box>
      );
    }
  });
  return {
    realAuthNotification
  };
}

export function RealNameAuthForm(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
): ReactElement {
  const { message } = useMessage();
  const { t } = useTranslation();
  const { setSessionProp } = useSessionStore();

  const schema = z.object({
    name: z
      .string()
      .min(1, { message: t('common:name_required') })
      .max(20, { message: t('common:name_required') }),
    phone: z
      .string()
      .min(1, { message: t('common:phone_invalid') })
      .regex(/^\d+$/, { message: t('common:phone_invalid') })
      .max(16, { message: t('common:phone_invalid') }),
    idCard: z.string().refine(identityCodeValid, { message: t('common:idCard_invalid') })
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const mutation = useMutation(realNameAuthRequest, {
    onSuccess: (data) => {
      if (data.code === 200) {
        message({
          title: data.message,
          status: 'success',
          duration: 2000,
          isClosable: true
        });

        setSessionProp('user', {
          ...useSessionStore.getState().session!.user!,
          realName: data.data?.name
        });

        reset();
        if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
          props.onFormSuccess();
        }
      } else {
        message({
          title: data.message,
          status: 'error',
          position: 'top',
          duration: 2000,
          isClosable: true
        });
      }
    },
    onError: (error: Error) => {
      message({
        title: error.message,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    }
  });

  const onValidate = async (data: FormData) => {
    mutation.mutate(data);
  };

  const onInvalid = () => {
    const firstErrorMessage = Object.values(errors)[0]?.message;
    if (firstErrorMessage) {
      message({
        title: firstErrorMessage,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    }
  };

  const onSubmit = handleSubmit(onValidate, onInvalid);
  return (
    <form onSubmit={onSubmit}>
      <VStack
        w={'420px'}
        alignItems={'stretch'}
        fontSize={'14px'}
        fontWeight={500}
        gap={'30px'}
        color={'grayModern.900'}
      >
        <FormControl isInvalid={!!errors.name}>
          <HStack>
            <FormLabel w={'120px'}>{t('common:name')}</FormLabel>
            <Input
              display={'flex'}
              flex={1}
              _autofill={{
                bgColor: '#FBFBFC'
              }}
              borderRadius="6px"
              border="1px solid #DEE0E2"
              color={'grayModern.500'}
              bgColor={'grayModern.50'}
              alignItems={'center'}
              py={'8px'}
              px={'12px'}
              fontSize={'14px'}
              variant={'unstyled'}
              placeholder={t('common:placeholders_name')}
              {...register('name')}
            />
          </HStack>
          {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
        </FormControl>

        <FormControl isInvalid={!!errors.phone}>
          <HStack>
            <FormLabel w={'120px'}>{t('common:phone')}</FormLabel>
            <Input
              display={'flex'}
              flex={1}
              _autofill={{
                bgColor: '#FBFBFC'
              }}
              borderRadius="6px"
              border="1px solid #DEE0E2"
              color={'grayModern.500'}
              bgColor={'grayModern.50'}
              alignItems={'center'}
              py={'8px'}
              px={'12px'}
              fontSize={'14px'}
              variant={'unstyled'}
              placeholder={t('common:placeholders_phone')}
              {...register('phone')}
            />
          </HStack>
          {errors.phone && <FormErrorMessage>{errors.phone.message}</FormErrorMessage>}
        </FormControl>

        <FormControl isInvalid={!!errors.idCard}>
          <HStack>
            <FormLabel w={'120px'}>{t('common:idCard')}</FormLabel>
            <Input
              display={'flex'}
              flex={1}
              _autofill={{
                bgColor: '#FBFBFC'
              }}
              borderRadius="6px"
              border="1px solid #DEE0E2"
              color={'grayModern.500'}
              bgColor={'grayModern.50'}
              alignItems={'center'}
              py={'8px'}
              px={'12px'}
              fontSize={'14px'}
              variant={'unstyled'}
              placeholder={t('common:placeholders_idCard')}
              {...register('idCard')}
            />
          </HStack>
          {errors.idCard && <FormErrorMessage>{errors.idCard.message}</FormErrorMessage>}
        </FormControl>

        <Button
          variant={'primary'}
          ml="auto"
          type="submit"
          maxW={'72px'}
          _active={{ transform: 'scale(0.95)' }}
          isLoading={mutation.isLoading}
        >
          {t('common:confirm')}
        </Button>
      </VStack>
    </form>
  );
}

function RealNameModal(props: {
  children: React.ReactElement;
  onModalOpen?: () => void;
  onModalClose?: () => void;
  onFormSuccess?: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const { children } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClose = () => {
    onClose();
    if (props.onModalClose && typeof props.onModalClose === 'function') {
      props.onModalClose();
    }
  };

  return (
    <>
      {children &&
        React.cloneElement(children, {
          onClick: () => {
            onOpen();
            if (props.onModalOpen && typeof props.onModalOpen === 'function') {
              props.onModalOpen();
            }
          }
        })}

      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'12px'}
          maxW={'540px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
        >
          <ModalCloseButton right={'20px'} top="12px" p="0" />
          <ModalHeader
            bg={'grayModern.25'}
            borderBottomWidth={'1px'}
            borderBottomColor={'grayModern.100'}
            p="15px 20px"
          >
            <Text>{t('common:realName_verification')}</Text>
          </ModalHeader>
          <ModalBody w="100%" py="32px" px={'60px'}>
            <RealNameAuthForm
              onFormSuccess={() => {
                onClose();
                if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                  props.onFormSuccess();
                }
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
export default RealNameModal;
