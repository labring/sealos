import ExchangeIcon from '@/components/icons/ExchangeIcon';
import InfoIcon from '@/components/icons/InfoIcon';
import {
  Box,
  Button,
  Text,
  Flex,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  FormControl,
  FormErrorMessage
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { useMessage } from '@sealos/ui';

interface GiftCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GiftCode() {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      gap="16px"
      alignSelf="stretch"
    >
      <Flex alignItems="center" gap="8px" width="100%">
        <Text
          fontWeight="bold"
          color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          lineHeight="20px"
          letterSpacing="0.1px"
        >
          {t('Gift Card Redemption')}
        </Text>
        {/* <Flex
          padding="6px 0px"
          alignItems="center"
          justifyContent="center"
          gap="4px"
          borderRadius="6px"
        >
          <InfoIcon fill="#0884DD" />
          <Link
            color="var(--Bright-Blue-600, #0884DD)"
            fontFamily="PingFang SC"
            fontSize="11px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px"
            textDecoration="none" // Added to remove default underline
            _hover={{ textDecoration: 'underline' }} // Optional: adds underline on hover
          >
            {t('查看兑换规则')}
          </Link>
        </Flex> */}
      </Flex>
      <Flex
        display="flex"
        width="100%"
        padding="8px 14px"
        justifyContent="center"
        alignItems="center"
        gap="6px"
        alignSelf="stretch"
        borderRadius="6px"
        border="0.4px solid var(--Gray-Modern-250, #DFE2EA)"
        background="var(--White, #FFF)"
        boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
        cursor="pointer"
        onClick={onOpen}
      >
        <ExchangeIcon />
        <Button
          variant="unstyled"
          height="auto"
          minWidth="0"
          padding="0"
          color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
        >
          {t('Redeem')}
        </Button>
      </Flex>

      <GiftCodeModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}

function GiftCodeModal({ isOpen, onClose }: GiftCodeModalProps) {
  const { t } = useTranslation();
  const initialRef = React.useRef(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  });

  const useGiftCodeMutation = useMutation(
    (code: string) =>
      request.post<any, ApiResp<any>>('/api/account/gift-code', {
        code
      }),
    {
      onSuccess(data) {
        useGiftCodeMutation.reset();
        setCode('');
        queryClient.invalidateQueries(['getAccount']); // Invalidate the cache
        message({
          status: 'success',
          title: t('Gift Code Redeemed Successfully'),
          isClosable: true,
          duration: 2000,
          position: 'top'
        });
        onClose();
      },
      onError(err: any) {
        message({
          status: 'warning',
          title: t('Failed to redeem Gift Code'),
          description: err?.message || t('Failed to redeem Gift Code'),
          isClosable: true,
          position: 'top'
        });
      }
    }
  );

  const validateCode = (value: string) => {
    if (!value) {
      setError(t('Gift code is required'));
    } else if (value.length !== 24) {
      setError(t('Gift code must be exactly 24 characters long'));
    } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
      setError(t('Gift code can only contain letters and numbers'));
    } else {
      setError('');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    validateCode(newCode);
    setCode(newCode);
  };

  const handleConfirm = () => {
    if (error === '' && code !== '') {
      useGiftCodeMutation.mutate(code);
      return;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <Flex
        as={ModalContent}
        width="440px"
        flexDirection="column"
        justifyContent="center"
        alignItems="flex-start"
        borderRadius="10px"
        background="var(--White, #FFF)"
        boxShadow="0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)"
      >
        <Flex
          as={ModalHeader}
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          borderBottom="1px solid var(--Gray-Modern-100, #F4F4F7)"
          background="var(--Gray-Modern-25, #FBFBFC)"
          width="100%"
        >
          <Flex width="400px" justifyContent="space-between" alignItems="center">
            <Flex width="98px" alignItems="center" gap="10px" flexShrink={0}>
              {t('Gift Card Redemption')}
            </Flex>
            <Flex
              as={ModalCloseButton}
              position="static"
              width="28px"
              height="28px"
              padding="4px"
              borderRadius="4px"
              justifyContent="center"
              alignItems="center"
              gap="10px"
              flexShrink={0}
            />
          </Flex>
        </Flex>
        <Flex
          as={ModalBody}
          height="168px"
          padding="24px 36px"
          justifyContent="center"
          alignItems="center"
          width="100%"
        >
          <Flex width="368px" direction="column" alignItems="flex-end" gap="24px">
            <Flex direction="column" alignItems="flex-start" gap="24px" alignSelf="stretch">
              <Flex direction="column" alignItems="flex-start" gap="8px" width="100%">
                <Text
                  color="var(--light-general-on-surface, var(--Gray-Modern-900, #111824))"
                  fontFamily="PingFang SC"
                  fontSize="14px"
                  fontStyle="normal"
                  fontWeight={500}
                  lineHeight="20px"
                  letterSpacing="0.1px"
                >
                  {t('Gift Code')}
                </Text>
                <FormControl isInvalid={!!error}>
                  <Input
                    ref={initialRef}
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder={t('Input Gift code')}
                    width="368px"
                    height="32px"
                    padding="8px 12px"
                    borderRadius="6px"
                    border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                    background="var(--Gray-Modern-50, #F7F8FA)"
                    _placeholder={{
                      color: 'var(--Gray-Modern-400, #9AA4B2)'
                    }}
                    isDisabled={useGiftCodeMutation.isLoading}
                  />
                  {error && <FormErrorMessage>{error}</FormErrorMessage>}
                </FormControl>
              </Flex>
            </Flex>
            <Flex
              paddingLeft="280px"
              justifyContent="flex-end"
              alignItems="center"
              alignSelf="stretch"
            >
              <Flex justifyContent="flex-end" alignItems="flex-start" gap="8px">
                <Button
                  display="flex"
                  width="88px"
                  padding="8px 20px"
                  justifyContent="center"
                  alignItems="center"
                  gap="8px"
                  borderRadius="6px"
                  background="var(--Gray-Modern-900, #111824)"
                  boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                  _hover={{ background: 'var(--Gray-Modern-800, #1F2937)' }}
                  onClick={handleConfirm}
                  isDisabled={!!error}
                  isLoading={useGiftCodeMutation.isLoading}
                >
                  {t('Redeem')}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  );
}

GiftCodeModal.displayName = 'GiftCodeModal';
export default GiftCode;
