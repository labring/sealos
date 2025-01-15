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
  FormLabel,
  Button,
  Input,
  useToast,
  UseToastOptions,
  Box,
  Flex,
  Center,
  Spinner,
  Link,
  FormErrorMessage,
  FlexProps
} from '@chakra-ui/react';
import { CloseIcon, useMessage, WarningIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  enterpriseRealNameAuthCancelRequest,
  enterpriseRealNameAuthInfoRequest,
  enterpriseRealNameAuthPaymentRequest,
  enterpriseRealNameAuthVerifyRequest,
  faceAuthGenerateQRcodeUriRequest,
  getFaceAuthStatusRequest
} from '@/api/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode.react';
import { useConfigStore } from '@/stores/config';
import { PAYMENTSTATUS } from '@/types/response/enterpriseRealName';

export function useRealNameAuthNotification(props?: UseToastOptions) {
  const { t } = useTranslation();
  const { commonConfig } = useConfigStore((s) => s);
  const realNameReward = commonConfig?.realNameReward;

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
                fontSize="14px"
                fontWeight={400}
                lineHeight="20px"
                letterSpacing="0.25px"
              >
                {realNameReward?.toString() === '0'
                  ? t('common:realname_auth_reminder_desc_no_reward')
                  : t('common:realname_auth_reminder_desc', {
                      reward: realNameReward
                    })}
                <RealNameModal onFormSuccess={props.onClose}>
                  <Text
                    as="span"
                    cursor="pointer"
                    color="yellow.600"
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

const RealNameModal = forwardRef<
  { onOpen: () => void },
  {
    children?: React.ReactElement;
    onModalOpen?: () => void;
    onModalClose?: () => void;
    onFormSuccess?: () => void;
  }
>(function RealNameModal(props, ref) {
  const { t } = useTranslation();
  const { children } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClose = () => {
    onClose();
    if (props.onModalClose && typeof props.onModalClose === 'function') {
      props.onModalClose();
    }
  };

  useImperativeHandle(ref, () => ({
    onOpen
  }));

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
          bgColor="white"
          backdropFilter="blur(150px)"
          containerProps={{
            zIndex: '5500'
          }}
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
          <ModalBody w="100%" py="32px" px="52px">
            <Tabs position="relative" variant="unstyled" isLazy>
              <TabList
                gap="4px"
                width="fit-content"
                display="flex"
                padding="3px"
                alignItems="flex-start"
                sx={{
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: 'grayModern.200',
                  background: 'grayModern.50'
                }}
              >
                <Tab
                  sx={{
                    display: 'flex',
                    padding: '5px 10px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '20px',
                    letterSpacing: '0.1px',
                    color: 'grayModern.500',
                    _selected: {
                      color: 'brightBlue.600',
                      bg: 'white',
                      boxShadow:
                        '0px 1px 2px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.15)'
                    },
                    _focus: { boxShadow: 'none' }
                  }}
                >
                  {t('common:personal_verification')}
                </Tab>

                <Tab
                  sx={{
                    display: 'flex',
                    padding: '5px 10px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '20px',
                    letterSpacing: '0.1px',
                    color: 'grayModern.500',
                    _selected: {
                      color: 'brightBlue.600',
                      bg: 'white',
                      boxShadow:
                        '0px 1px 2px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.15)'
                    },
                    _focus: { boxShadow: 'none' }
                  }}
                >
                  {t('common:enterprise_verification')}
                </Tab>
              </TabList>
              <TabPanels m="0" p="0">
                <TabPanel p="0">
                  <FaceIdRealNameAuthORcode
                    onFormSuccess={() => {
                      onClose();
                      if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                        props.onFormSuccess();
                      }
                    }}
                  />
                </TabPanel>
                <TabPanel p="0">
                  <EnterpriseVerification
                    onFormSuccess={() => {
                      onClose();
                      if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                        props.onFormSuccess();
                      }
                    }}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
});

export function RealNameAuthForm(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t } = useTranslation();
  return (
    <Tabs position="relative" variant="unstyled" isLazy>
      <TabList
        gap="4px"
        width="fit-content"
        display="flex"
        padding="3px"
        alignItems="flex-start"
        sx={{
          borderRadius: '6px',
          border: '1px solid',
          borderColor: 'grayModern.200',
          background: 'grayModern.50'
        }}
      >
        <Tab
          sx={{
            display: 'flex',
            padding: '5px 10px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '4px',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '20px',
            letterSpacing: '0.1px',
            color: 'grayModern.500',
            _selected: {
              color: 'brightBlue.600',
              bg: 'white',
              boxShadow:
                '0px 1px 2px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.15)'
            },
            _focus: { boxShadow: 'none' }
          }}
        >
          {t('common:personal_verification')}
        </Tab>

        <Tab
          sx={{
            display: 'flex',
            padding: '5px 10px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '4px',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '20px',
            letterSpacing: '0.1px',
            color: 'grayModern.500',
            _selected: {
              color: 'brightBlue.600',
              bg: 'white',
              boxShadow:
                '0px 1px 2px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.15)'
            },
            _focus: { boxShadow: 'none' }
          }}
        >
          {t('common:enterprise_verification')}
        </Tab>
      </TabList>
      <TabPanels p="0" m="0">
        <TabPanel p="0">
          <FaceIdRealNameAuthORcode
            onFormSuccess={() => {
              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }}
          />
        </TabPanel>
        <TabPanel p="0">
          <EnterpriseVerification
            onFormSuccess={() => {
              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export function FaceIdRealNameAuthORcode(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t } = useTranslation();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(false);
  const { session } = useSessionStore((s) => s);
  const { setSessionProp } = useSessionStore();
  const [refetchCount, setRefetchCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery(
    ['faceIdAuth'],
    faceAuthGenerateQRcodeUriRequest,
    {
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  const handleRefetch = useCallback(() => {
    setRefetchCount((prev) => prev + 1);
    refetch();
  }, [refetch]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const bizToken = data?.data?.bizToken;

    if (!bizToken) {
      return;
    }

    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId);
      setIsPolling(false);
    };

    const startPolling = () => {
      if (!isPolling) {
        setIsPolling(true);
        intervalId = setInterval(async () => {
          try {
            const result = await getFaceAuthStatusRequest({ bizToken });
            if (result.data?.status === 'Success') {
              message({
                title: t('common:face_recognition_success'),
                status: 'success',
                duration: 2000,
                isClosable: true
              });

              setSessionProp('user', {
                ...useSessionStore.getState().session!.user!,
                realName: result.data?.realName
              });

              // refetch user info
              queryClient.invalidateQueries([session?.token, 'UserInfo']);
              // refetch user amount
              queryClient.invalidateQueries(['getAmount']);

              stopPolling();

              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }
            if (result.data?.status === 'Failed') {
              message({
                title: t('common:face_recognition_failed'),
                status: 'error',
                duration: 2000,
                isClosable: true
              });

              stopPolling();
              handleRefetch();
            }
          } catch (error: any) {
            console.error('Error checking face ID auth status:', error);
            message({
              title: error.message,
              status: 'error',
              duration: 2000,
              isClosable: true
            });
          }
        }, 2000);
      }
    };

    startPolling();

    return stopPolling;
  }, [session?.token, data, data?.data?.bizToken, refetchCount]);

  if (error) {
    return (
      <Box mt="32px">
        <Text color="red.500">{t('common:failed_to_get_qr_code')}</Text>
        <Flex mt="28px">
          <Button onClick={() => handleRefetch()}>{t('common:retry_get_qr_code')}</Button>
        </Flex>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Center mt="32px">
        <Spinner />
        <Text ml={3}>{t('common:loading')}</Text>
      </Center>
    );
  }

  return (
    <Box mt="32px" mb="16px">
      {data?.data?.url && (
        <>
          <Flex flexDirection="column" alignItems="center" gap="16px" alignSelf="stretch">
            <Text
              color="grayModern.600"
              fontSize="14px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px"
              textAlign="center"
            >
              {t('common:scan_qr_code_for_face_recognition')}
            </Text>
            <Center>
              <QRCode value={data.data.url} size={200} />
            </Center>
          </Flex>
        </>
      )}
    </Box>
  );
}

function EnterpriseVerification(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t, i18n } = useTranslation();
  const { message } = useMessage();
  const { session } = useSessionStore((s) => s);
  const { setSessionProp } = useSessionStore();
  const queryClient = useQueryClient();
  const domain = useConfigStore((state) => state.cloudConfig?.domain);

  const schema = z.object({
    key: z.string().min(1, { message: t('common:enterprise_key_required') }),
    accountBank: z.string().min(1, { message: t('common:account_bank_required') }),
    accountNo: z.string().min(1, { message: t('common:account_number_required') }),
    keyName: z.string().min(1, { message: t('common:enterprise_name_required') }),
    usrName: z.string().min(1, { message: t('common:user_name_required') }),
    contactInfo: z
      .string()
      .min(1, { message: t('common:contact_info_required') })
      .regex(/^\d+$/, { message: t('common:contact_info_must_be_numeric') })
  });

  const verificationSchema = z.object({
    transAmt: z
      .string()
      .refine((val) => /^\d{1,3}$/.test(val), { message: t('common:invalid_verification_amount') })
  });

  const { data: enterpriseRealNameAuthInfo, isLoading: enterpriseRealNameAuthInfoLoading } =
    useQuery(['enterpriseRealNameAuthInfo'], enterpriseRealNameAuthInfoRequest, {
      refetchOnWindowFocus: false
    });

  type FormData = z.infer<typeof schema>;

  const {
    register: registerMain,
    handleSubmit: handleMainSubmit,
    reset: resetMain,
    formState: { errors: mainErrors }
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange'
  });

  const {
    register: registerVerification,
    watch: watchVerification,
    reset: resetVerification,
    formState: { errors: verificationErrors }
  } = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    mode: 'onChange'
  });

  const transAmt = watchVerification('transAmt');

  useEffect(() => {
    if (
      enterpriseRealNameAuthInfo?.data &&
      enterpriseRealNameAuthInfo.data.paymentStatus === PAYMENTSTATUS.PROCESSING
    ) {
      const { key, accountBank, accountNo, keyName, usrName, contactInfo } =
        enterpriseRealNameAuthInfo.data;
      resetMain({
        key,
        accountBank,
        accountNo,
        keyName,
        usrName,
        contactInfo
      });
    }
  }, [enterpriseRealNameAuthInfo?.data, resetMain]);

  const canPayment = enterpriseRealNameAuthInfo?.data?.paymentStatus !== PAYMENTSTATUS.PROCESSING;

  const canVerify = enterpriseRealNameAuthInfo?.data?.paymentStatus === PAYMENTSTATUS.PROCESSING;

  const canCancel = enterpriseRealNameAuthInfo?.data?.paymentStatus === PAYMENTSTATUS.PROCESSING;

  const canInput = enterpriseRealNameAuthInfo?.data?.paymentStatus !== PAYMENTSTATUS.PROCESSING;

  const remainingAttempts = enterpriseRealNameAuthInfo?.data?.remainingAttempts;

  const [errorMessage, setErrorMessage] = useState<string>('');

  const enterpriseRealNameAuthPaymentMutation = useMutation(enterpriseRealNameAuthPaymentRequest, {
    onSuccess: (data) => {
      if (data.code === 200 && data.data?.paymentStatus === PAYMENTSTATUS.PROCESSING) {
        message({
          title: t('common:enterprise_realname_payment_success'),
          status: 'success',
          duration: 2000,
          isClosable: true
        });
        setErrorMessage('');
        queryClient.invalidateQueries(['enterpriseRealNameAuthInfo']);
      } else {
        message({
          title: t('common:enterprise_realname_payment_failed'),
          status: 'error',
          duration: 2000,
          isClosable: true
        });
        setErrorMessage(data.message || t('common:enterprise_realname_payment_failed'));
      }
    },
    onError: (error: any) => {
      message({
        title: t('common:enterprise_realname_payment_failed'),
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      setErrorMessage(error.message || t('common:enterprise_realname_payment_failed'));
    }
  });

  const enterpriseRealNameAuthVerifyMutation = useMutation(enterpriseRealNameAuthVerifyRequest, {
    onSuccess: (data) => {
      if (data.code === 200 && data.data?.authState === 'success') {
        message({
          title: t('common:enterprise_realname_verify_success'),
          status: 'success',
          duration: 2000,
          isClosable: true
        });

        setErrorMessage('');

        setSessionProp('user', {
          ...useSessionStore.getState().session!.user!,
          enterpriseRealName: data.data?.enterpriseRealName
        });

        queryClient.invalidateQueries([session?.token, 'UserInfo']);
        queryClient.invalidateQueries(['enterpriseRealNameAuthInfo']);
        resetMain();
        resetVerification();

        if (props.onFormSuccess) {
          props.onFormSuccess();
        }
      } else {
        message({
          title: t('common:enterprise_realname_verify_failed'),
          status: 'error',
          duration: 2000,
          isClosable: true
        });
        setErrorMessage(
          data.message ? t(data.message as any) : t('common:enterprise_realname_verify_failed')
        );
      }
    },
    onError: (error: any) => {
      message({
        title: t('common:enterprise_realname_verify_failed'),
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      setErrorMessage(error.message || t('common:enterprise_realname_verify_failed'));
    }
  });

  const enterpriseRealNameAuthCancelMutation = useMutation(enterpriseRealNameAuthCancelRequest, {
    onSuccess: (data) => {
      if (data.code === 200 && data.data?.paymentStatus === PAYMENTSTATUS.CANCEL) {
        message({
          title: t('common:enterprise_realname_cancel_success'),
          status: 'success',
          duration: 2000,
          isClosable: true
        });
        setErrorMessage('');
        queryClient.invalidateQueries(['enterpriseRealNameAuthInfo']);
      } else {
        message({
          title: t('common:enterprise_realname_cancel_failed'),
          status: 'error',
          duration: 2000,
          isClosable: true
        });
        setErrorMessage(t('common:enterprise_realname_cancel_failed'));
      }
    },
    onError: (error: any) => {
      message({
        title: t('common:enterprise_realname_cancel_failed'),
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      setErrorMessage(error.message || t('common:enterprise_realname_cancel_failed'));
    }
  });

  const handleVerifyClick = () => {
    if (!transAmt || !/^\d{1,3}$/.test(transAmt)) {
      message({
        title: t('common:invalid_verification_amount'),
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      setErrorMessage(t('common:invalid_verification_amount'));
      return;
    }

    enterpriseRealNameAuthVerifyMutation.mutate({ transAmt });
  };

  if (enterpriseRealNameAuthInfoLoading) {
    return (
      <Center mt="32px">
        <Spinner />
        <Text ml={3}>{t('common:loading')}</Text>
      </Center>
    );
  }

  return (
    <VStack spacing="24px" align="stretch" w="full">
      <Box
        as="form"
        w="full"
        onSubmit={handleMainSubmit((data: FormData) => {
          enterpriseRealNameAuthPaymentMutation.mutate(data);
        })}
      >
        <Flex py="16px" px="0" w="full">
          <Text
            alignSelf="stretch"
            color="grayModern.500"
            fontSize="12px"
            fontWeight={400}
            lineHeight="16px"
            letterSpacing="0.048px"
          >
            {t('common:enterprise_auth_tips')}
          </Text>
        </Flex>
        <VStack spacing="24px" w="full">
          <FormControl
            isInvalid={!!mainErrors.keyName}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:enterprise_keyname')}
              </FormLabel>
              <Input
                {...registerMain('keyName')}
                isDisabled={!canInput}
                placeholder={t('common:enterprise_keyname_placeholder')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.keyName?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!mainErrors.key}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:enterprise_key')}
              </FormLabel>
              <Input
                {...registerMain('key')}
                isDisabled={!canInput}
                placeholder={t('common:please_enter_enterprise_key')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.key?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!mainErrors.usrName}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:legal_person')}
              </FormLabel>
              <Input
                {...registerMain('usrName')}
                isDisabled={!canInput}
                placeholder={t('common:please_enter_legal_person')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.usrName?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!mainErrors.accountNo}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:account_number')}
              </FormLabel>
              <Input
                {...registerMain('accountNo')}
                isDisabled={!canInput}
                placeholder={t('common:please_enter_account_number')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.accountNo?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!mainErrors.accountBank}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:bank_name')}
              </FormLabel>
              <Input
                {...registerMain('accountBank')}
                isDisabled={!canInput}
                placeholder={t('common:please_enter_bank_name')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.accountBank?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!mainErrors.contactInfo}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              flexDirection="column"
              alignItems="flex-start"
              alignSelf="stretch"
              gap="8px"
              w="full"
            >
              <FormLabel
                color={!canInput ? 'grayModern.400' : 'grayModern.900'}
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                p="0"
                m="0"
                w="full"
              >
                {t('common:contact_info')}
              </FormLabel>
              <Input
                {...registerMain('contactInfo')}
                isDisabled={!canInput}
                placeholder={t('common:please_enter_contact_info')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                borderColor="grayModern.200"
                bg="grayModern.50"
              />
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {mainErrors.contactInfo?.message}
            </FormErrorMessage>
          </FormControl>
        </VStack>
        {(errorMessage || !canPayment) && (
          <Box
            mt="16px"
            display="flex"
            padding="12px"
            alignItems="flex-start"
            gap="6px"
            alignSelf="stretch"
            borderRadius="6px"
            border={
              errorMessage
                ? '1px solid var(--Red-600, #D92D20)'
                : '1px solid var(--Green-600, #039855)'
            }
            background={errorMessage ? 'red.50' : 'white'}
            maxH="100px"
            overflowY="auto"
          >
            <Text
              color={errorMessage ? 'red.600' : 'green.600'}
              fontSize="12px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px"
              wordBreak="break-word"
            >
              {errorMessage || t('common:verification_amount_tips2')}
            </Text>
          </Box>
        )}
        <Flex flexDirection="column" alignItems="flex-start" gap="8px" mt="16px">
          <Text
            color="grayModern.900"
            fontSize="12px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px"
          >
            {t('common:verification_amount')}
          </Text>
          <FormControl
            isInvalid={!!verificationErrors.transAmt}
            w="full"
            display="flex"
            flexDirection="column"
            gap="4px"
          >
            <Flex
              display="flex"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              justify="flex-end"
              w="100%"
            >
              <Input
                {...registerVerification('transAmt')}
                isDisabled={!canVerify}
                placeholder={t('common:please_enter_verification_amount')}
                h="32px"
                px="12px"
                alignItems="center"
                w="full"
                borderRadius="6px"
                bg="grayModern.50"
              />
              <Button
                type="submit"
                variant="unstyled"
                h="32px"
                isDisabled={!canPayment || remainingAttempts === 0}
                isLoading={enterpriseRealNameAuthPaymentMutation.isLoading}
                px="14px"
                justifyContent="center"
                alignItems="center"
                borderRadius="6px"
                border="1px solid var(--Gray-Modern-250, #DFE2EA)"
                background="var(--White, #FFF)"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                color="grayModern.600"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                whiteSpace="nowrap"
                minW="fit-content"
              >
                {t('common:get_verification_amount')}
              </Button>
            </Flex>
            <FormErrorMessage
              w="full"
              color="red.600"
              fontSize="12px"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              p="0"
              m="0"
            >
              {verificationErrors.transAmt?.message}
            </FormErrorMessage>
          </FormControl>
          <Text
            color="grayModern.500"
            fontSize="12px"
            fontWeight={400}
            lineHeight="16px"
            letterSpacing="0.048px"
          >
            {t('common:verification_amount_tips')}
            <Link
              href={`https://${domain}/?openapp=system-workorder`}
              color="brightBlue.600"
              textDecoration="underline"
            >
              {t('common:link_to_workorder')}
            </Link>
            {i18n.language === 'zh' && '。'}
          </Text>
        </Flex>
      </Box>

      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <Flex alignItems="center" gap="12px" h="36px">
          <Button
            minW="fit-content"
            h="36px"
            variant="unstyled"
            onClick={() => enterpriseRealNameAuthCancelMutation.mutate()}
            isDisabled={!canCancel}
            isLoading={enterpriseRealNameAuthCancelMutation.isLoading}
            px="14px"
            justifyContent="center"
            alignItems="center"
            borderRadius="6px"
            border="grayModern.250"
            background="white"
            boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
          >
            <Text
              color="grayModern.600"
              fontSize="14px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px"
            >
              {t('common:cancel')}
            </Text>
          </Button>
          <Button
            minW="fit-content"
            h="36px"
            variant="primary"
            onClick={handleVerifyClick}
            isDisabled={!canVerify || remainingAttempts === 0}
            isLoading={enterpriseRealNameAuthVerifyMutation.isLoading}
            px="14px"
            justifyContent="center"
            alignItems="center"
            borderRadius="6px"
            border="1px solid var(--Gray-Modern-250, #DFE2EA)"
            boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
          >
            <Text>
              {t('common:submit_verification')} (
              {t('common:remaining_attempts', { count: remainingAttempts })})
            </Text>
          </Button>
        </Flex>
      </Flex>
    </VStack>
  );
}

export default RealNameModal;
