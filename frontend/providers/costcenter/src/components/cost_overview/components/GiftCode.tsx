import { Box, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { toast } from 'sonner';
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
      <Button variant="outline" onClick={onOpen}>
        {t('common:redeem')}
      </Button>
      <GiftCodeModal isOpen={isOpen} onToggle={onToggle} />
    </Box>
  );
}

function GiftCodeModal({ isOpen, onToggle }: GiftCodeModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

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
        toast.success(t('common:gift_code_redeemed_successfully'), {
          duration: 2000
        });
        onToggle(false);
      },
      onError(err: any) {
        toast.warning(t('common:failed_to_redeem_gift_code'), {
          description: err?.message || t('common:failed_to_redeem_gift_code')
        });
      }
    }
  );

  const validateCode = (value: string) => {
    if (!value) {
      setError(t('common:gift_code_is_required'));
    } else if (value.length !== 24) {
      setError(t('common:gift_code_must_be_exactly_24_characters_long'));
    } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
      setError(t('common:gift_code_can_only_contain_letters_and_numbers'));
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
          <DialogTitle>{t('common:gift_card_redemption')}</DialogTitle>

          <div>
            <Label className="flex gap-2 flex-col w-full items-start">
              <div>{t('common:gift_code')}</div>

              <Input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder={t('common:input_gift_code')}
                disabled={useGiftCodeMutation.isLoading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </Label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common:cancel')}</Button>
            </DialogClose>
            <Button onClick={handleConfirm} disabled={!!error || useGiftCodeMutation.isLoading}>
              {useGiftCodeMutation.isLoading && <Loader size={14} className="animate-spin" />}
              {t('common:redeem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

GiftCodeModal.displayName = 'GiftCodeModal';
export default GiftCode;
