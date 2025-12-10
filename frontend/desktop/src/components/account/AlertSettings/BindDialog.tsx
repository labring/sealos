'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import { ProviderType } from '@/types/alert';
import { sendAlertBindEmailCode, sendAlertBindPhoneCode } from '@/api/platform';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useTranslation } from 'next-i18next';

interface BindDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  type: 'phone' | 'email';
  onConfirm?: (value: string, code: string) => Promise<void>;
}

export function BindDialog({ open = false, onOpenChange, type, onConfirm }: BindDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [valueError, setValueError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useCustomToast({ status: 'error' });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (valueError && newValue) {
      setValueError('');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (codeError && newCode) {
      setCodeError('');
    }
  };

  const handleSendCode = async () => {
    if (!value) {
      setValueError(
        type === 'phone'
          ? t('common:alert_settings.bind.phone_required')
          : t('common:alert_settings.bind.email_required')
      );
      return;
    }
    if (type === 'phone') {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(value)) {
        setValueError(t('common:alert_settings.bind.phone_invalid'));
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setValueError(t('common:alert_settings.bind.email_invalid'));
        return;
      }
    }

    setSendingCode(true);
    try {
      if (type === 'phone') {
        const res = await sendAlertBindPhoneCode({ id: value });
        if (res.code !== 200) {
          throw new Error(res.message || t('common:alert_settings.bind.send_code_failed'));
        }
      } else {
        const res = await sendAlertBindEmailCode({ id: value });
        if (res.code !== 200) {
          throw new Error(res.message || t('common:alert_settings.bind.send_code_failed'));
        }
      }
      setCooldown(60);
      toast({ title: t('common:alert_settings.bind.code_sent'), status: 'success' });
    } catch (error) {
      toast({
        title:
          error instanceof Error ? error.message : t('common:alert_settings.bind.send_code_failed')
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirm = async () => {
    let hasError = false;

    if (!value) {
      setValueError(
        type === 'phone'
          ? t('common:alert_settings.bind.phone_required')
          : t('common:alert_settings.bind.email_required')
      );
      hasError = true;
    } else {
      if (type === 'phone') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(value)) {
          setValueError(t('common:alert_settings.bind.phone_invalid'));
          hasError = true;
        }
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setValueError(t('common:alert_settings.bind.email_invalid'));
          hasError = true;
        }
      }
    }

    if (!code) {
      setCodeError(t('common:alert_settings.bind.code_required'));
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setVerifying(true);
    setCodeError('');
    try {
      await onConfirm?.(value, code);
      setValue('');
      setCode('');
      setValueError('');
      setCodeError('');
      onOpenChange?.(false);
    } catch (error) {
      // Check if it's a verification code error by error code (409 = SMS code is wrong)
      const errorCode = (error as Error & { code?: number })?.code;
      const isCodeError = errorCode === 409;

      if (isCodeError) {
        // no toast
        setCodeError(t('common:alert_settings.bind.code_invalid'));
      } else {
        // show toast
        const errorMessage =
          error instanceof Error ? error.message : t('common:alert_settings.bind.verify_failed');
        toast({
          title: errorMessage
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setValue('');
    setCode('');
    setValueError('');
    setCodeError('');
    onOpenChange?.(false);
  };

  const title =
    type === 'phone'
      ? t('common:alert_settings.bind.phone_title')
      : t('common:alert_settings.bind.email_title');
  const label =
    type === 'phone'
      ? t('common:alert_settings.bind.phone_label')
      : t('common:alert_settings.bind.email_label');
  const placeholder =
    type === 'phone'
      ? t('common:alert_settings.bind.phone_placeholder')
      : t('common:alert_settings.bind.email_placeholder');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[400px] p-6 rounded-2xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-none text-zinc-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium leading-none text-zinc-900">
              <span className="text-red-600">*</span>
              {label}
            </Label>
            <div className="flex flex-col gap-2">
              <div
                className={`bg-white border ${
                  valueError ? 'border-red-600' : 'border-zinc-200'
                } flex gap-1 h-10 items-center overflow-hidden px-3 py-2 rounded-md`}
              >
                <Input
                  type={type === 'phone' ? 'tel' : 'email'}
                  value={value}
                  onChange={handleValueChange}
                  placeholder={placeholder}
                  className="flex-1 border-0 p-0 text-sm text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  onClick={handleSendCode}
                  className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={cooldown > 0 || sendingCode}
                >
                  {sendingCode
                    ? t('common:alert_settings.bind.sending')
                    : cooldown > 0
                      ? t('common:alert_settings.bind.resend', { count: cooldown })
                      : t('common:alert_settings.bind.send_code')}
                </button>
              </div>
              {valueError && <p className="text-sm leading-5 text-red-600">{valueError}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium leading-none text-zinc-900">
              <span className="text-red-600">*</span>
              {t('common:alert_settings.bind.code_label')}
            </Label>
            <div className="flex flex-col gap-2">
              <div
                className={`bg-white border ${
                  codeError ? 'border-red-600' : 'border-zinc-200'
                } flex h-10 items-center overflow-hidden px-3 py-2 rounded-md`}
              >
                <Input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder={t('common:alert_settings.bind.code_placeholder')}
                  className="flex-1 border-0 p-0 text-sm text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {codeError && <p className="text-sm leading-5 text-red-600">{codeError}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end">
          <Button
            onClick={handleConfirm}
            className="h-10 px-4 py-2 rounded-lg bg-zinc-950 text-white hover:bg-zinc-900 disabled:opacity-50"
            disabled={!value || !code || verifying}
          >
            {verifying
              ? t('common:alert_settings.bind.verifying')
              : t('common:alert_settings.bind.complete_bind')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
