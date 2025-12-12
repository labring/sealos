'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@sealos/shadcn-ui';
import { Checkbox } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import { Badge } from '@sealos/shadcn-ui/badge';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { BindDialog } from './BindDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAlerts, createAlert, deleteAlerts, updateAlerts } from '@/api/platform';
import { AlertNotificationAccount, ProviderType } from '@/types/alert';
import useSessionStore from '@/stores/session';
import { useCustomToast } from '@/hooks/useCustomToast';
import { UserInfo } from '@/api/auth';
import { useTranslation } from 'next-i18next';

interface PhoneNumber {
  id: string;
  number: string;
  isBound: boolean;
  checked: boolean;
  isFromAlert: boolean;
}

interface Email {
  id: string;
  address: string;
  isBound: boolean;
  checked: boolean;
  isFromAlert: boolean;
}

interface AlertSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  emailEnabled?: boolean;
  phoneEnabled?: boolean;
}

export function AlertSettings({
  open = false,
  onOpenChange,
  emailEnabled = false,
  phoneEnabled = false
}: AlertSettingsProps) {
  const { t } = useTranslation();
  const { session } = useSessionStore();
  const queryClient = useQueryClient();
  const { toast } = useCustomToast({ status: 'error' });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'phone' | 'email';
    id: string;
    value: string;
  } | null>(null);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindDialogType, setBindDialogType] = useState<'phone' | 'email'>('phone');

  const { data: userInfo } = useQuery({
    queryKey: [session?.token, 'UserInfo'],
    queryFn: UserInfo,
    enabled: open && !!session?.token,
    select: (d) => d.data?.info
  });

  const userPhone = useMemo(() => {
    const phoneProvider = userInfo?.oauthProvider?.find((p) => p.providerType === 'PHONE');
    return phoneProvider?.providerId || '';
  }, [userInfo]);

  const userEmail = useMemo(() => {
    const emailProvider = userInfo?.oauthProvider?.find((p) => p.providerType === 'EMAIL');
    return emailProvider?.providerId || '';
  }, [userInfo]);

  const {
    data: alertsData,
    isLoading,
    error: alertsError
  } = useQuery({
    queryKey: ['alert-notification-accounts'],
    queryFn: async () => {
      const res = await listAlerts();
      if (res.code !== 200) {
        throw new Error(res.message || 'Failed to fetch alerts');
      }
      return res.data || [];
    },
    enabled: open
  });

  useEffect(() => {
    if (open && alertsError) {
      toast({
        title:
          alertsError instanceof Error
            ? alertsError.message
            : t('common:alert_settings.messages.fetch_failed')
      });
    }
  }, [open, alertsError, toast, t]);

  const { phoneNumbers, emails } = useMemo(() => {
    const phones: PhoneNumber[] = [];
    const emailsList: Email[] = [];

    // Add alerts from the list
    if (alertsData) {
      alertsData.forEach((alert: AlertNotificationAccount) => {
        if (alert.providerType === 'PHONE') {
          phones.push({
            id: alert.id,
            number: alert.providerId,
            isBound: alert.providerId === userPhone,
            checked: alert.isEnabled,
            isFromAlert: true
          });
        } else if (alert.providerType === 'EMAIL') {
          emailsList.push({
            id: alert.id,
            address: alert.providerId,
            isBound: alert.providerId === userEmail,
            checked: alert.isEnabled,
            isFromAlert: true
          });
        }
      });
    }

    // Add user phone if it exists but not in alerts list
    if (userPhone && !phones.find((p) => p.number === userPhone)) {
      phones.push({
        id: `bound-phone-${userPhone}`,
        number: userPhone,
        isBound: true,
        checked: true,
        isFromAlert: false
      });
    }

    // Add user email if it exists but not in alerts list
    if (userEmail && !emailsList.find((e) => e.address === userEmail)) {
      emailsList.push({
        id: `bound-email-${userEmail}`,
        address: userEmail,
        isBound: true,
        checked: true,
        isFromAlert: false
      });
    }

    return { phoneNumbers: phones, emails: emailsList };
  }, [alertsData, userPhone, userEmail]);

  const createMutation = useMutation({
    mutationFn: async ({
      providerType,
      providerId,
      code
    }: {
      providerType: ProviderType;
      providerId: string;
      code: string;
    }) => {
      const res = await createAlert({ providerType, providerId, code });
      if (res.code !== 200) {
        const error = new Error(res.message || 'Failed to create alert') as Error & {
          code?: number;
        };
        error.code = res.code;
        throw error;
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-notification-accounts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await deleteAlerts({ ids });
      if (res.code !== 200) {
        throw new Error(res.message || 'Failed to delete alerts');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-notification-accounts'] });
      toast({ title: t('common:alert_settings.messages.delete_success'), status: 'success' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title:
          error instanceof Error ? error.message : t('common:alert_settings.messages.delete_failed')
      });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ ids, isEnabled }: { ids: string[]; isEnabled: boolean }) => {
      const res = await updateAlerts({ ids, isEnabled });
      if (res.code !== 200) {
        throw new Error(res.message || 'Failed to update alerts');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-notification-accounts'] });
      toast({ title: t('common:alert_settings.messages.update_success'), status: 'success' });
    },
    onError: (error) => {
      toast({
        title:
          error instanceof Error ? error.message : t('common:alert_settings.messages.update_failed')
      });
    }
  });

  const handlePhoneSelectAll = (checked: boolean) => {
    // Only select non-virtual entries (from alerts)
    const ids = phoneNumbers.filter((p) => p.isFromAlert).map((p) => p.id);
    if (ids.length > 0) {
      toggleMutation.mutate({ ids, isEnabled: checked });
    }
  };

  const handleEmailSelectAll = (checked: boolean) => {
    // Only select non-virtual entries (from alerts)
    const ids = emails.filter((e) => e.isFromAlert).map((e) => e.id);
    if (ids.length > 0) {
      toggleMutation.mutate({ ids, isEnabled: checked });
    }
  };

  const handlePhoneCheck = (id: string, checked: boolean) => {
    // Virtual entries (bound-phone-xxx) cannot be enabled/disabled
    if (id.startsWith('bound-phone-')) {
      return;
    }
    toggleMutation.mutate({ ids: [id], isEnabled: checked });
  };

  const handleEmailCheck = (id: string, checked: boolean) => {
    // Virtual entries (bound-email-xxx) cannot be enabled/disabled
    if (id.startsWith('bound-email-')) {
      return;
    }
    toggleMutation.mutate({ ids: [id], isEnabled: checked });
  };

  const handleDeletePhone = (id: string) => {
    const phone = phoneNumbers.find((p) => p.id === id);
    if (phone) {
      setDeleteTarget({ type: 'phone', id, value: phone.number });
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteEmail = (id: string) => {
    const email = emails.find((e) => e.id === id);
    if (email) {
      setDeleteTarget({ type: 'email', id, value: email.address });
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate([deleteTarget.id]);
    }
  };

  const handleAddPhoneNumber = () => {
    setBindDialogType('phone');
    setBindDialogOpen(true);
  };

  const handleAddEmail = () => {
    setBindDialogType('email');
    setBindDialogOpen(true);
  };

  const handleBindConfirm = async (value: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const providerType: ProviderType = bindDialogType === 'phone' ? 'PHONE' : 'EMAIL';
      createMutation.mutate(
        { providerType, providerId: value, code },
        {
          onSuccess: () => {
            toast({ title: t('common:alert_settings.messages.create_success'), status: 'success' });
            setBindDialogOpen(false);
            resolve();
          },
          onError: (error) => {
            // Don't show toast here - let BindDialog handle error display
            reject(error);
          }
        }
      );
    });
  };

  const phoneSelectAllChecked = phoneNumbers.filter((p) => p.isFromAlert).every((p) => p.checked);
  const emailSelectAllChecked = emails.filter((e) => e.isFromAlert).every((e) => e.checked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto bg-zinc-50 rounded-3xl p-0">
        <div className="flex flex-col gap-8 px-8 py-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold leading-7 text-black text-center">
              {t('common:alert_settings.title')}
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-zinc-500 mt-1.5 text-left">
              {t('common:alert_settings.description')}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-zinc-500">{t('common:alert_settings.loading')}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {phoneEnabled && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium leading-none text-black">
                    {t('common:alert_settings.phone.section_title')}
                  </p>
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden w-full">
                    <div className="bg-zinc-50 border-b border-zinc-200 flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={phoneSelectAllChecked}
                          onCheckedChange={handlePhoneSelectAll}
                          className="w-4 h-4"
                          disabled={
                            phoneNumbers.filter((e) => e.isFromAlert).length === 0 ||
                            toggleMutation.isLoading
                          }
                        />
                        <p className="text-sm leading-5 text-black">
                          {t('common:alert_settings.phone.enable_all')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      {phoneNumbers.length === 0 ? (
                        <div className="flex items-center justify-center h-11 text-sm text-zinc-500">
                          {t('common:alert_settings.phone.no_phone_numbers')}
                        </div>
                      ) : (
                        phoneNumbers.map((phone, index) => (
                          <div
                            key={phone.id}
                            className={`flex items-center h-11 ${
                              index < phoneNumbers.length - 1 ? 'border-b border-zinc-100' : ''
                            }`}
                          >
                            <div className="flex-1 flex items-center gap-2.5 px-4 min-w-[85px]">
                              <Checkbox
                                checked={phone.checked}
                                onCheckedChange={(checked) =>
                                  handlePhoneCheck(phone.id, checked === true)
                                }
                                className="w-4 h-4"
                                disabled={
                                  toggleMutation.isLoading || phone.id.startsWith('bound-phone-')
                                }
                              />
                              <p className="text-sm leading-none text-zinc-900">{phone.number}</p>
                            </div>
                            <div className="flex items-center justify-center px-3 py-4 h-full">
                              {phone.isBound ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-zinc-100 text-zinc-900 text-xs font-medium px-2.5 py-0.5 rounded-full border-0"
                                >
                                  {t('common:alert_settings.phone.bound_badge')}
                                </Badge>
                              ) : (
                                <button
                                  onClick={() => handleDeletePhone(phone.id)}
                                  className="flex items-center justify-center p-2.5 w-8 h-8 hover:bg-zinc-100 rounded transition-colors"
                                  disabled={deleteMutation.isLoading}
                                >
                                  <Trash2 className="w-4 h-4 text-zinc-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex items-center justify-center h-11 border-t border-zinc-100">
                        <Button
                          variant="ghost"
                          onClick={handleAddPhoneNumber}
                          className="flex-1 flex items-center gap-2 h-11 px-4 py-2 text-zinc-900 hover:bg-zinc-50"
                          disabled={createMutation.isLoading}
                        >
                          <Plus className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-medium leading-5">
                            {t('common:alert_settings.phone.add_phone')}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {emailEnabled && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium leading-none text-black">
                    {t('common:alert_settings.email.section_title')}
                  </p>
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden w-full">
                    <div className="bg-zinc-50 border-b border-zinc-200 flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={emailSelectAllChecked}
                          onCheckedChange={handleEmailSelectAll}
                          className="w-4 h-4"
                          disabled={
                            emails.filter((e) => e.isFromAlert).length === 0 ||
                            toggleMutation.isLoading
                          }
                        />
                        <p className="text-sm leading-5 text-black">
                          {t('common:alert_settings.email.enable_all')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      {emails.length === 0 ? (
                        <div className="flex items-center justify-center h-11 text-sm text-zinc-500">
                          {t('common:alert_settings.email.no_emails')}
                        </div>
                      ) : (
                        emails.map((email, index) => (
                          <div
                            key={email.id}
                            className={`flex items-center h-11 ${
                              index < emails.length - 1 ? 'border-b border-zinc-100' : ''
                            }`}
                          >
                            <div className="flex-1 flex items-center gap-2.5 px-4 min-w-[85px]">
                              <Checkbox
                                checked={email.checked}
                                onCheckedChange={(checked) =>
                                  handleEmailCheck(email.id, checked === true)
                                }
                                className="w-4 h-4"
                                disabled={
                                  toggleMutation.isLoading || email.id.startsWith('bound-email-')
                                }
                              />
                              <p className="text-sm leading-none text-zinc-900">{email.address}</p>
                            </div>
                            <div className="flex items-center justify-center px-3 py-4 h-full">
                              {email.isBound ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-zinc-100 text-zinc-900 text-xs font-medium px-2.5 py-0.5 rounded-full border-0"
                                >
                                  {t('common:alert_settings.email.bound_badge')}
                                </Badge>
                              ) : (
                                <button
                                  onClick={() => handleDeleteEmail(email.id)}
                                  className="flex items-center justify-center p-2.5 w-8 h-8 hover:bg-zinc-100 rounded transition-colors"
                                  disabled={deleteMutation.isLoading}
                                >
                                  <Trash2 className="w-4 h-4 text-zinc-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex items-center justify-center h-11 border-t border-zinc-100">
                        <Button
                          variant="ghost"
                          onClick={handleAddEmail}
                          className="flex-1 flex items-center gap-2 h-11 px-4 py-2 text-zinc-900 hover:bg-zinc-50"
                          disabled={createMutation.isLoading}
                        >
                          <Plus className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-medium leading-5">
                            {t('common:alert_settings.email.add_email')}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        phoneNumber={deleteTarget?.type === 'phone' ? deleteTarget.value : undefined}
        email={deleteTarget?.type === 'email' ? deleteTarget.value : undefined}
        onConfirm={handleConfirmDelete}
      />

      <BindDialog
        open={bindDialogOpen}
        onOpenChange={setBindDialogOpen}
        type={bindDialogType}
        onConfirm={handleBindConfirm}
        userPhone={userPhone}
        userEmail={userEmail}
      />
    </Dialog>
  );
}
