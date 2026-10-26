import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  VStack,
  Text,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  InputGroup,
  InputRightElement,
  Box,
  Flex,
  HStack,
  ModalCloseButton
} from '@chakra-ui/react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSmsBindCodeRequest, verifySmsBindRequest } from '@/api/auth';
import { ApiResp } from '@/types';
import { MERGE_USER_READY } from '@/types/response/utils';
import { WarnTriangeIcon } from '@sealos/ui';

type ModalStep = 'BINDING' | 'MERGE_CONFLICT';

interface PhoneBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PhoneBindingModal({ isOpen, onClose }: PhoneBindingModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<ModalStep>('BINDING');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  // Phone number validation
  const isPhoneValid = useCallback((phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone);
  }, []);

  // Countdown timer
  const startCountdown = useCallback(() => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Send verification code
  const sendCodeMutation = useMutation({
    mutationFn: () => getSmsBindCodeRequest('phone')({ id: phoneNumber }),
    onSuccess: (data) => {
      setChallengeId(data.data?.challengeId || '');
      toast({
        position: 'top',
        title: t('common:already_sent_code'),
        status: 'success',
        duration: 3000
      });
      startCountdown();
    },
    onError: (error: ApiResp) => {
      toast({
        position: 'top',
        title: error.message || t('common:get_code_failed'),
        status: 'error',
        duration: 3000
      });
    },
    onSettled: () => {
      setIsSending(false);
    }
  });

  // Verify and bind phone
  const verifyMutation = useMutation({
    mutationFn: () =>
      verifySmsBindRequest('phone')({
        id: phoneNumber,
        code: verifyCode,
        challengeId
      }),
    onSuccess: (data) => {
      const status = data.message || '';

      if (data.code === 200) {
        toast({
          position: 'top',
          title: t('common:bind_success'),
          status: 'success',
          duration: 3000
        });
        // Refresh user info
        queryClient.invalidateQueries();
        // Close modal
        onClose();
      } else if (Object.values(MERGE_USER_READY).includes(status as MERGE_USER_READY)) {
        setCurrentStep('MERGE_CONFLICT');
      } else {
        toast({
          position: 'top',
          title: data.message || t('common:bind_failed'),
          status: 'error',
          duration: 3000
        });
      }
    },
    onError: (error: ApiResp) => {
      if (error.message === MERGE_USER_READY.MERGE_USER_PROVIDER_CONFLICT) {
        toast({
          position: 'top',
          title: t('common:provider_conflict_error'),
          status: 'error',
          duration: 5000
        });
      } else {
        toast({
          position: 'top',
          title: error.message || t('common:bind_failed'),
          status: 'error',
          duration: 3000
        });
      }
    }
  });

  const handleSendCode = () => {
    if (!isPhoneValid(phoneNumber)) {
      toast({
        position: 'top',
        title: t('common:invalid_phone_number'),
        status: 'error',
        duration: 3000
      });
      return;
    }
    if (countdown > 0) {
      return;
    }
    setIsSending(true);
    sendCodeMutation.mutate();
  };

  const handleSubmit = () => {
    if (!isPhoneValid(phoneNumber)) {
      toast({
        position: 'top',
        title: t('common:invalid_phone_number'),
        status: 'error',
        duration: 3000
      });
      return;
    }
    if (verifyCode.length !== 6) {
      toast({
        position: 'top',
        title: t('common:verify_code_tips'),
        status: 'error',
        duration: 3000
      });
      return;
    }
    verifyMutation.mutate();
  };

  const handleBackToBinding = () => {
    setCurrentStep('BINDING');
  };

  // Get modal title based on current step
  const getModalTitle = () => {
    switch (currentStep) {
      case 'BINDING':
        return t('common:phone_binding_required');
      case 'MERGE_CONFLICT':
        return (
          <Flex alignItems="center" gap="10px">
            <WarnTriangeIcon boxSize="24px" fill="yellow.500" />
            <Text>{t('common:merge_account_title')}</Text>
          </Flex>
        );
      default:
        return t('common:phone_binding_required');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent
        maxW="450px"
        borderRadius={currentStep === 'BINDING' ? undefined : '10px'}
        bgColor={currentStep === 'BINDING' ? undefined : '#FFF'}
        backdropFilter={currentStep === 'BINDING' ? undefined : 'blur(150px)'}
      >
        <ModalCloseButton top={'8px'} right={'20px'} />
        <ModalHeader
          fontSize={currentStep === 'BINDING' ? '20px' : '16px'}
          fontWeight={currentStep === 'BINDING' ? 600 : 500}
          px={currentStep === 'BINDING' ? undefined : '20px'}
          py={currentStep === 'BINDING' ? undefined : '12px'}
          bg={currentStep === 'BINDING' ? undefined : 'grayModern.25'}
          borderBottom={currentStep === 'BINDING' ? undefined : '1px solid'}
          borderColor={currentStep === 'BINDING' ? undefined : 'grayModern.100'}
          display={currentStep === 'BINDING' ? undefined : 'flex'}
          gap={currentStep === 'BINDING' ? undefined : '10px'}
        >
          {getModalTitle()}
        </ModalHeader>
        <ModalBody
          pb={currentStep === 'BINDING' ? '24px' : '32px'}
          pt={currentStep === 'BINDING' ? '16px' : '24px'}
          px={currentStep === 'BINDING' ? '24px' : '36px'}
          fontSize={currentStep === 'BINDING' ? undefined : '14px'}
        >
          {/* BINDING Step */}
          {currentStep === 'BINDING' && (
            <Box>
              <Box bg={'#F4F4F5'} p="16px" borderRadius="8px" mb={'16px'}>
                <Text fontSize="14px" color="grayModern.600">
                  {t('common:phone_binding_description')}
                </Text>
              </Box>

              <FormControl isRequired mb={'16px'}>
                <FormLabel fontSize="14px" fontWeight={500}>
                  {t('common:phone')}
                </FormLabel>
                <InputGroup>
                  <Input
                    height={'40px'}
                    width={'100%'}
                    type="tel"
                    placeholder={t('common:enter_phone_number')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={11}
                    disabled={verifyMutation.isLoading}
                    pr="110px"
                  />
                  <InputRightElement width="100px" height={'40px'}>
                    <Button
                      size="sm"
                      variant="link"
                      fontSize="12px"
                      color={countdown > 0 || isSending ? 'gray.400' : 'brightBlue.600'}
                      onClick={handleSendCode}
                      isDisabled={countdown > 0 || isSending}
                      _hover={{ textDecoration: 'none' }}
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : isSending
                        ? t('common:sending')
                        : t('common:get_code')}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired mb={'16px'}>
                <FormLabel fontSize="14px" fontWeight={500}>
                  {t('common:verifycode')}
                </FormLabel>
                <Input
                  height={'40px'}
                  width={'100%'}
                  type="text"
                  placeholder={t('common:enter_verify_code')}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  disabled={verifyMutation.isLoading}
                />
              </FormControl>

              <Flex justifyContent={'flex-end'}>
                <Button
                  minW={'110px'}
                  colorScheme="blue"
                  onClick={handleSubmit}
                  isLoading={verifyMutation.isLoading}
                  isDisabled={!phoneNumber || verifyCode.length !== 6}
                  size="md"
                >
                  {t('common:complete_binding')}
                </Button>
              </Flex>
            </Box>
          )}

          {/* MERGE_CONFLICT Step */}
          {currentStep === 'MERGE_CONFLICT' && (
            <VStack alignItems={'stretch'} gap={'0'}>
              <Text mb={'12px'}>{t('common:account_already_bound')}</Text>
              <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                <Button
                  onClick={handleBackToBinding}
                  variant={'unstyled'}
                  border={'1px'}
                  borderColor={'grayModern.250'}
                  p={'8px 19px'}
                  fontSize={'12px'}
                  fontWeight={'500'}
                  color={'grayModern.600'}
                >
                  {t('common:confirm')}
                </Button>
              </HStack>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
