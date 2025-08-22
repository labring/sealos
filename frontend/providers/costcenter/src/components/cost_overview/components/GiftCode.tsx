import ExchangeIcon from '@/components/icons/ExchangeIcon';
import { Box, Text, Flex, Button as ChakraButton, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { useMessage } from '@sealos/ui';
import { Button } from '@sealos/shadcn-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle
} from '@sealos/shadcn-ui/dialog';
import { Label } from '@sealos/shadcn-ui/label';
import { Input } from '@sealos/shadcn-ui/input';
import { Loader } from 'lucide-react';

interface GiftCodeModalProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

function GiftCode() {
  const { t } = useTranslation();
  const { isOpen, onOpen, onToggle } = useDisclosure();

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
        <ChakraButton
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
        </ChakraButton>
      </Flex>

      <GiftCodeModal isOpen={isOpen} onToggle={onToggle} />
    </Box>
  );
}

function GiftCodeModal({ isOpen, onToggle }: GiftCodeModalProps) {
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
        onToggle(false);
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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => onToggle(open)}>
        <DialogContent>
          <DialogTitle>{t('Gift Card Redemption')}</DialogTitle>

          <div>
            <Label className="flex gap-2 flex-col w-full items-start">
              <div>{t('Gift Code')}</div>

              <Input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder={t('Input Gift code')}
                disabled={useGiftCodeMutation.isLoading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </Label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('Cancel')}</Button>
            </DialogClose>
            <Button onClick={handleConfirm} disabled={!!error || useGiftCodeMutation.isLoading}>
              {useGiftCodeMutation.isLoading && <Loader size={14} className="animate-spin" />}
              {t('Redeem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

GiftCodeModal.displayName = 'GiftCodeModal';
export default GiftCode;
