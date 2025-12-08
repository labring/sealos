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
  Flex
} from '@chakra-ui/react';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSmsBindCodeRequest, verifySmsBindRequest } from '@/api/auth';
import { ApiResp } from '@/types';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { MERGE_USER_READY } from '@/types/response/utils';
import { ProviderType } from 'prisma/global/generated/client';

interface PhoneBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PhoneBindingModal({ isOpen, onClose }: PhoneBindingModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setMergeUserData, setMergeUserStatus, setForceMerge } = useCallbackStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  // Reset merge status when modal opens to avoid stale state after page refresh
  useEffect(() => {
    if (isOpen) {
      setMergeUserStatus(MergeUserStatus.IDLE);
      setMergeUserData(undefined);
      setForceMerge(false);
    }
  }, [isOpen, setMergeUserStatus, setMergeUserData, setForceMerge]);

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
    onSuccess: () => {
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
        code: verifyCode
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
        // Handle merge user scenario
        // Set force merge to true since this is required phone binding
        setForceMerge(true);

        if (status === MERGE_USER_READY.MERGE_USER_CONTINUE) {
          const code = data.data?.code;
          if (!code) return;
          setMergeUserStatus(MergeUserStatus.CANMERGE);
          setMergeUserData({
            code,
            providerType: ProviderType.PHONE
          });
        } else {
          setMergeUserStatus(MergeUserStatus.CONFLICT);
        }
        // Close current modal, NeedToMergeModal will open
        onClose();
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false} closeOnEsc={false}>
      <ModalOverlay />
      <ModalContent maxW="450px">
        <ModalHeader fontSize="20px" fontWeight={600}>
          {t('common:phone_binding_required')}
        </ModalHeader>
        <ModalBody pb={'24px'} pt={'16px'} px={'24px'}>
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
