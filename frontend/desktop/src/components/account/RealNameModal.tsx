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
  Center,
  Spinner,
  InputGroup,
  InputRightElement,
  Link
} from '@chakra-ui/react';
import { CloseIcon, useMessage, WarningIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import React, { MouseEventHandler, ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { identityCodeValid } from '@/utils/tools';
import {
  getSmsBindCodeRequest,
  realNameAuthRequest,
  UserInfo,
  verifySmsBindRequest
} from '@/api/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { useQuery } from '@tanstack/react-query';
import { useTimer } from '@/hooks/useTimer';
import { SmsType } from '@/services/backend/db/verifyCode';

export function useRealNameAuthNotification(props?: UseToastOptions) {
  const { t } = useTranslation();

  const realNameAuthNotification = useToast({
    position: 'top',
    ...props,
    render: (props) => {
      return (
        <Box
          display="flex"
          width="390px"
          padding="16px 20px"
          justifyContent="space-between"
          alignItems="center"
          borderRadius="6px"
          background="#FFF"
          boxShadow="0px 4px 10px 0px rgba(19, 51, 107, 0.08), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
        >
          <Flex direction="column" alignItems="center" gap="6px" flex={1}>
            <Flex width="350px" justifyContent="space-between" alignItems="center">
              <Flex alignItems="center">
                <Center bg="#FFF4E5" borderRadius="full" p={1} mr="12px">
                  <WarningIcon fill="yellow.700" boxSize="16px" />
                </Center>
                <Text
                  color="yellow.600"
                  fontSize="16px"
                  fontWeight={500}
                  fontFamily="PingFang SC"
                  lineHeight="24px"
                  letterSpacing="0.15px"
                  fontStyle="normal"
                >
                  {t('common:realname_auth_reminder')}
                </Text>
              </Flex>
              {props?.isClosable && (
                <Center
                  display="flex"
                  padding="4px"
                  alignItems="center"
                  gap="6px"
                  cursor="pointer"
                  onClick={props.onClose}
                  bg="transparent"
                  border="none"
                  _hover={{}}
                  _active={{}}
                  _focus={{}}
                >
                  <CloseIcon w="16px" h="16px" fill="Black" />
                </Center>
              )}
            </Flex>
            <Flex width="355px" paddingLeft="38px" alignItems="flex-start" gap="10px">
              <Text
                flex="1 0 0"
                color="grayModern.900"
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight={400}
                lineHeight="20px"
                letterSpacing="0.25px"
              >
                {t('common:realname_auth_reminder_desc')}
                <RealNameModal onFormSuccess={props.onClose}>
                  <Text
                    as="span"
                    cursor="pointer"
                    color="yellow.600"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.25px"
                    textDecoration="underline"
                  >
                    {t('common:realname_auth_now')}
                  </Text>
                </RealNameModal>
              </Text>
            </Flex>
          </Flex>
        </Box>
      );
    }
  });
  return {
    realNameAuthNotification
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
  const { session } = useSessionStore((s) => s);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const infoData = useQuery({
    queryFn: UserInfo,
    queryKey: [session?.token, 'UserInfo'],
    select(d) {
      return d.data?.info;
    }
  });

  const { seconds, startTimer, isRunning } = useTimer({
    duration: 60,
    step: 1
  });
  const remainTime = 60 - seconds;

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
    idCard: z.string().refine(identityCodeValid, { message: t('common:idCard_invalid') }),
    verifyCode: z
      .string()
      .optional()
      .refine((val) => (!phoneNumber ? /^\d{6}$/.test(val || '') : true), {
        message: t('common:verifyCode_invalid')
      })
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange'
  });

  useEffect(() => {
    if (infoData.isSuccess && infoData.data) {
      const phoneProvider = infoData.data.oauthProvider.find((p) => p.providerType === 'PHONE');
      const phoneNumber = phoneProvider?.providerId || null;
      setPhoneNumber(phoneNumber);
      if (phoneNumber) {
        setValue('phone', phoneNumber, { shouldValidate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoData.isSuccess, infoData.data]);

  const getCodeMutation = useMutation({
    mutationFn({ id, smsType }: { id: string; smsType: SmsType }) {
      return getSmsBindCodeRequest(smsType)({ id });
    },
    onSuccess(data) {
      startTimer();
      message({
        status: 'success',
        title: t('common:already_sent_code'),
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    },
    onError(err) {
      getCodeMutation.reset();
      message({
        status: 'error',
        title: t('common:get_code_failed'),
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    }
  });

  const getCode: MouseEventHandler = async (e) => {
    e.preventDefault();
    if (isRunning) {
      message({
        status: 'warning',
        title: t('common:already_sent_code'),
        position: 'top',
        duration: 2000,
        isClosable: true
      });
      return;
    }
    if (!(await trigger('phone'))) {
      message({
        status: 'error',
        title: t('common:invalid_phone_number'),
        position: 'top',
        duration: 2000,
        isClosable: true
      });
      return;
    }
    const id = getValues('phone');
    getCodeMutation.mutate({
      id,
      smsType: 'phone'
    });
  };

  const verifyCodeAndSmsBindMutation = useMutation({
    async mutationFn({ smsType, ...data }: { id: string; code: string; smsType: SmsType }) {
      return verifySmsBindRequest('phone')(data);
    }
  });

  const realNameAuthMutation = useMutation(realNameAuthRequest, {
    onSuccess: (data) => {
      if (data.code === 200) {
        message({
          title: t('common:realname_auth_success'),
          status: 'success',
          duration: 2000,
          isClosable: true
        });

        setSessionProp('user', {
          ...useSessionStore.getState().session!.user!,
          realName: data.data?.name
        });

        queryClient.invalidateQueries([session?.token, 'UserInfo']);

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
    if (!phoneNumber) {
      try {
        const verifyResult = await verifyCodeAndSmsBindMutation.mutateAsync({
          id: data.phone,
          code: data.verifyCode!,
          smsType: 'phone'
        });

        if (verifyResult.code !== 200) {
          message({
            title: t('common:realname_auth_failed_tips'),
            status: 'error',
            position: 'top',
            duration: 2000,
            isClosable: true
          });

          return;
        }
      } catch (error) {
        message({
          title: (error as Error).message,
          status: 'error',
          position: 'top',
          duration: 2000,
          isClosable: true
        });
        return;
      }
    }

    realNameAuthMutation.mutate({
      name: data.name,
      idCard: data.idCard
    });
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
    <>
      {infoData.isSuccess && infoData.data ? (
        <VStack
          w={'420px'}
          alignItems={'stretch'}
          fontSize={'14px'}
          fontWeight={500}
          gap={'30px'}
          color={'grayModern.900'}
        >
          {/* Notification area */}
          <Box bg="brightBlue.50" p={4} borderRadius="md" fontSize="12px" color="brightBlue.600">
            <Text> {t('common:realname_auth_tips_a')}</Text>
            <Text> {t('common:realname_auth_tips_b')}</Text>
          </Box>

          {/* Form area */}
          <form onSubmit={onSubmit}>
            <VStack alignItems={'stretch'} gap={'30px'}>
              <FormControl isInvalid={!!errors.name}>
                <HStack>
                  <FormLabel w={'98px'} lineHeight="40px">
                    {t('common:name')}
                  </FormLabel>
                  <Input
                    flex={1}
                    borderRadius="6px"
                    border="1px solid #DEE0E2"
                    color={'grayModern.500'}
                    bgColor={'grayModern.50'}
                    height="40px"
                    pl={'12px'}
                    fontSize={'14px'}
                    _placeholder={{ color: 'grayModern.500' }}
                    placeholder={t('common:placeholders_name')}
                    {...register('name')}
                  />
                </HStack>
                {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
              </FormControl>

              <FormControl isInvalid={!!errors.phone}>
                <HStack>
                  <FormLabel w={'98px'} lineHeight="40px">
                    {t('common:phone')}
                  </FormLabel>
                  <InputGroup flex={1}>
                    <Input
                      borderRadius="6px"
                      border="1px solid #DEE0E2"
                      color={'grayModern.500'}
                      bgColor={'grayModern.50'}
                      height="40px"
                      pl={'12px'}
                      pr={'72px'}
                      fontSize={'14px'}
                      _placeholder={{ color: 'grayModern.500' }}
                      placeholder={t('common:placeholders_phone')}
                      {...register('phone')}
                      isReadOnly={!!phoneNumber}
                    />
                    {!phoneNumber && (
                      <InputRightElement width="auto" h="100%">
                        <Link
                          onClick={getCode}
                          color={'brightBlue.600'}
                          fontSize={'11px'}
                          pr="12px"
                          pointerEvents={getCodeMutation.isLoading ? 'none' : 'auto'}
                        >
                          {t('common:get_code')}
                        </Link>
                      </InputRightElement>
                    )}
                  </InputGroup>
                </HStack>
                {errors.phone && <FormErrorMessage>{errors.phone.message}</FormErrorMessage>}
              </FormControl>

              {!phoneNumber && (
                <FormControl isInvalid={!!errors.verifyCode}>
                  <HStack>
                    <FormLabel w={'98px'} lineHeight="40px">
                      {t('common:verifycode')}
                    </FormLabel>
                    <InputGroup
                      flex={1}
                      borderRadius="6px"
                      border="1px solid #DEE0E2"
                      bgColor={'grayModern.50'}
                    >
                      <Input
                        color={'grayModern.500'}
                        height="40px"
                        pl={'12px'}
                        fontSize={'14px'}
                        _placeholder={{ color: 'grayModern.500' }}
                        autoComplete="one-time-code"
                        placeholder={t('common:placeholders_verifycode')}
                        {...register('verifyCode')}
                      />
                      <InputRightElement h="auto" width={'auto'} right={'12px'} insetY={'8px'}>
                        {isRunning && <Text>{remainTime} s</Text>}
                      </InputRightElement>
                    </InputGroup>
                  </HStack>
                  {errors.verifyCode && (
                    <FormErrorMessage>{errors.verifyCode.message}</FormErrorMessage>
                  )}
                </FormControl>
              )}

              <FormControl isInvalid={!!errors.idCard}>
                <HStack>
                  <FormLabel w={'98px'} lineHeight="40px">
                    {t('common:idCard')}
                  </FormLabel>
                  <Input
                    flex={1}
                    borderRadius="6px"
                    border="1px solid #DEE0E2"
                    color={'grayModern.500'}
                    bgColor={'grayModern.50'}
                    height="40px"
                    pl={'12px'}
                    fontSize={'14px'}
                    _placeholder={{ color: 'grayModern.500' }}
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
                height="40px"
                px="16px"
                _active={{ transform: 'scale(0.95)' }}
                isLoading={
                  realNameAuthMutation.isLoading ||
                  verifyCodeAndSmsBindMutation.isLoading ||
                  getCodeMutation.isLoading
                }
              >
                {t('common:confirm')}
              </Button>
            </VStack>
          </form>
        </VStack>
      ) : (
        <Center h="100%">
          <Spinner />
        </Center>
      )}
    </>
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
