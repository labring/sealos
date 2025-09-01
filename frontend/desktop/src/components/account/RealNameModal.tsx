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
  FlexProps,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon
} from '@chakra-ui/react';
import { CloseIcon, RefreshIcon, useMessage, WarningIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState, useMemo, useRef } from 'react';
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
  getFaceAuthStatusRequest,
  refreshRealNameQRecodeUriRequest,
  getBanksListRequest 
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
            _focus: {}
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

  const refreshQRMutation = useMutation(refreshRealNameQRecodeUriRequest, {
    onSuccess: () => {
      message({
        title: t('common:qr_code_refreshed_successfully'),
        status: 'success',
        duration: 2000,
        isClosable: true
      });
      queryClient.invalidateQueries(['faceIdAuth']);
    },
    onError: (error: any) => {
      message({
        title: error.message || t('common:failed_to_refresh_qr_code'),
        status: 'error',
        duration: 2000,
        isClosable: true
      });
    }
  });

  const handleRefetch = useCallback(() => {
    setRefetchCount((prev) => prev + 1);
    refetch();
  }, [refetch]);

  const handleRefreshQR = useCallback(() => {
    refreshQRMutation.mutate();
  }, [refreshQRMutation]);

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
        <Text color="red.500">{(error as Error).message || t('common:failed_to_get_qr_code')}</Text>
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
            <Button
              mt="16px"
              onClick={handleRefreshQR}
              leftIcon={<RefreshIcon />}
              isLoading={refreshQRMutation.isLoading}
              colorScheme="blue"
              size="sm"
            >
              {t('common:refresh_qr_code')}
            </Button>
            <Text
              color="grayModern.500"
              fontSize="12px"
              fontStyle="normal"
              lineHeight="16px"
              textAlign="center"
            >
              {t('common:qr_code_refresh_note')}
            </Text>
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

 
  const [selectedBank, setSelectedBank] = useState<string>('');

  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const clearSearch = useCallback(() => {
    setSearchKeyword('');
  }, []);

  const { data: banksResponse, isLoading: banksLoading, error: banksError } = useQuery(
    ['banksList'],
    getBanksListRequest,
    {
      refetchOnWindowFocus: false,
      select: (response) => {
        const banksData = response?.data || {};
        return Object.entries(banksData).map(([key, value]) => ({
          code: key,
          name: String(value || ''),
          shortName: String(key || '')
        }));
      }
    }
  );

  const banksList = banksResponse || [];
  const filteredBanksList = useMemo(() => {
    if (!searchKeyword.trim()) {
      return banksList;
    }
    return banksList.filter(bank => {
      const bankShortName = bank.shortName.toLowerCase();
      const keyword = searchKeyword.toLowerCase();
      return  bankShortName.includes(keyword);
    });
  }, [banksList, searchKeyword]);

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
    setValue: setMainValue,
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
      setSelectedBank(accountBank || '');
    }
  }, [enterpriseRealNameAuthInfo?.data, resetMain]);


  const handleBankSelect = useCallback((bankName: string) => {
    setSelectedBank(bankName);
    setMainValue('accountBank', bankName);
    setSearchKeyword(''); 
  }, [setMainValue]);


  const resetSearchState = useCallback(() => {
    clearSearch();
    setSelectedBank('');
  }, [clearSearch]);

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
        resetSearchState();

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
              <Box position="relative" w="full">
                <Input
                  ref={searchInputRef}
                  isDisabled={!canInput || banksLoading}
                  placeholder={banksLoading 
                    ? t('common:loading') 
                    : banksError 
                      ? t('common:get_code_failed')
                      : t('common:please_enter_bank_name')
                  }
                  value={searchKeyword || selectedBank}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchKeyword(value);
                 
                    if (selectedBank && value !== selectedBank) {
                      setSelectedBank('');
                      setMainValue('accountBank', '');
                    }
                    
                    if (value) {
                      setIsMenuOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (filteredBanksList.length > 0) {
                      setIsMenuOpen(true);
                    }
                  }}
                  onBlur={(e) => {
                   
                    setTimeout(() => {
                      setIsMenuOpen(false);
                    }, 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      clearSearch();
                      setIsMenuOpen(false);
                    } else if (e.key === 'Enter' && filteredBanksList.length > 0) {
                      e.preventDefault();
                     
                      if (filteredBanksList.length === 1) {
                        handleBankSelect(filteredBanksList[0].shortName);
                        setIsMenuOpen(false);
                      }
                    }
                  }}
                  h="32px"
                  px="12px"
                  pr="40px" 
                  w="full"
                  borderRadius="6px"
                  borderColor={isMenuOpen ? "brightBlue.600" : "grayModern.200"}
                  bg="grayModern.50"
                  fontSize="14px"
                  fontWeight={400}
                  lineHeight="20px"
                  color="grayModern.900"
                  backgroundColor={selectedBank ? "rgb(231, 240, 254)" : "grayModern.50"}
                  _disabled={{
                    bg: "grayModern.100",
                    color: "grayModern.400",
                    cursor: "not-allowed",
                    opacity: 0.6
                  }}
                  autoComplete="off"
                />
                
                <Flex
                  position="absolute"
                  right="12px"
                  top="50%"
                  transform="translateY(-50%)"
                  alignItems="center"
                  gap="4px"
                  pointerEvents={!canInput || banksLoading ? "none" : "auto"}
                >
                  {(searchKeyword || selectedBank) && (
                    <Icon
                      viewBox="0 0 16 16"
                      w="14px"
                      h="14px"
                      color="grayModern.400"
                      cursor="pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBank('');
                        setMainValue('accountBank', '');
                        setSearchKeyword('');
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }}
                      _hover={{ color: "grayModern.600" }}
                    >
                      <path
                        d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1ZM10.7071 5.29289C11.0976 5.68342 11.0976 6.31658 10.7071 6.70711L9.41421 8L10.7071 9.29289C11.0976 9.68342 11.0976 10.3166 10.7071 10.7071C10.3166 11.0976 9.68342 11.0976 9.29289 10.7071L8 9.41421L6.70711 10.7071C6.31658 11.0976 5.68342 11.0976 5.29289 10.7071C4.90237 10.3166 4.90237 9.68342 5.29289 9.29289L6.58579 8L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L8 6.58579L9.29289 5.29289C9.68342 4.90237 10.3166 4.90237 10.7071 5.29289Z"
                        fill="currentColor"
                      />
                    </Icon>
                  )}
                  <Icon 
                    viewBox="0 0 16 16" 
                    w="14px" 
                    h="14px"
                    color="grayModern.500"
                    transform={isMenuOpen ? "rotate(180deg)" : "rotate(0deg)"}
                    transition="transform 0.15s ease"
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMenuOpen) {
                        setIsMenuOpen(false);
                      } else {
                        setIsMenuOpen(true);
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }
                    }}
                  >
                    <path 
                      d="M4 6L8 10L12 6" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Icon>
                </Flex>
                
                {isMenuOpen && (
                  <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    maxH="280px"
                    borderRadius="8px"
                    borderColor="white"
                    border="none"
                    bg="white"
                    boxShadow="0px 8px 24px rgba(19, 51, 107, 0.15)"
                    py="8px"
                    mt="4px"
                    zIndex={1500}
                    overflow="hidden"
                  >
                    <Box maxH="320px" overflowY="auto">
                      {Array.isArray(filteredBanksList) && filteredBanksList.length > 0 ? (
                        filteredBanksList.map((bank, index) => (
                          <Box
                            key={`${bank.code}-${index}`}
                            onClick={() => {
                              handleBankSelect(bank.shortName);
                              setIsMenuOpen(false);
                            }}
                            h="48px"
                            px="12px"
                            py="8px"
                            cursor="pointer"
                            bg={selectedBank === bank.shortName ? "brightBlue.50" : "white"}
                            _hover={{
                              bg: selectedBank === bank.shortName ? "brightBlue.100" : "grayModern.50"
                            }}
                            transition="background-color 0.1s ease"
                          >
                            <Flex alignItems="center" w="full" h="full">
                              <Box
                                w="24px"
                                h="24px"
                                borderRadius="4px"
                                bg="grayModern.200"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                mr="12px"
                                flexShrink={0}
                              >
                                <Text fontSize="10px" fontWeight="bold" color="grayModern.600">
                                  {bank.shortName.charAt(0)}
                                </Text>
                              </Box>
                              
                              <Text 
                                fontSize="14px" 
                                fontWeight={selectedBank === bank.shortName ? 600 : 400} 
                                color="grayModern.900"
                                flex="1"
                              >
                                {bank.shortName}
                              </Text>
                              
                              {selectedBank === bank.shortName && (
                                <Icon
                                  viewBox="0 0 16 16"
                                  w="16px"
                                  h="16px"
                                  color="brightBlue.600"
                                  ml="8px"
                                >
                                  <path
                                    d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                                    fill="currentColor"
                                  />
                                </Icon>
                              )}
                            </Flex>
                          </Box>
                        ))
                      ) : searchKeyword ? (
                        <Flex
                          h="48px"
                          px="12px"
                          alignItems="center"
                          justifyContent="center"
                          color="grayModern.500"
                          fontSize="14px"
                        >
                          未找到相关银行
                        </Flex>
                      ) : (
                        <Flex
                          h="48px"
                          px="12px"
                          alignItems="center"
                          justifyContent="center"
                          color="grayModern.500"
                          fontSize="14px"
                        >
                          {banksError ? t('common:get_code_failed') : '请选择银行'}
                        </Flex>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
              <Input
                {...registerMain('accountBank')}
                type="hidden"
                value={selectedBank}
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
