import { useRef, useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';

import { postAuthCname, postAuthDomainChallenge } from '@/api/platform';
import { getErrText } from '@/utils/tools';

export type CustomAccessDrawerParams = {
  publicDomain: string;
  customDomain: string;
};

const getCustomDomainErrorKey = (message: string) => {
  if (message.includes('ENOTFOUND')) {
    return 'custom_domain_error_not_found';
  }
  if (message.includes('ENODATA')) {
    return 'custom_domain_error_no_cname';
  }
  if (message.includes("cname is not equal to publicDomain")) {
    return 'custom_domain_error_cname_mismatch';
  }
  if (message.includes('CHALLENGE_TIMEOUT') || message.includes('timeout')) {
    return 'custom_domain_error_timeout';
  }
  if (message.includes('CHALLENGE_NETWORK_ERROR')) {
    return 'custom_domain_error_network';
  }
  return '';
};

const CustomAccessDrawer = ({
  publicDomain,
  customDomain,
  onClose,
  onSuccess
}: CustomAccessDrawerParams & { onClose: () => void; onSuccess: (e: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const authDomain = async () => {
    const val = ref.current?.value.trim() || '';
    if (!val) {
      toast.error(t('Input your custom domain'));
      return;
    }

    setIsLoading(true);
    try {
      try {
        await postAuthCname({
          publicDomain,
          customDomain: val
        });
        return val;
      } catch (cnameError) {
        try {
          const challengeResult = await postAuthDomainChallenge({
            customDomain: val
          });

          if (challengeResult?.verified) {
            return val;
          } else {
            throw cnameError;
          }
        } catch (challengeError) {
          throw cnameError;
        }
      }
    } catch (error) {
      const errorMessage = getErrText(error, 'custom_domain_verify_failed');
      const errorKey = getCustomDomainErrorKey(errorMessage);
      toast.error(t('custom_domain_verify_failed'), {
        description: errorKey ? t(errorKey) : errorMessage
      });
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    const verifiedDomain = await authDomain();
    if (!verifiedDomain) {
      return;
    }

    onSuccess(verifiedDomain);
    toast.success(t('custom_domain_verified'), {
      description: t('custom_domain_save_tip')
    });
  };

  return (
    <Drawer open onOpenChange={() => onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('Custom Domain')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 py-2">
          <div className="mb-2 font-semibold">CNAME</div>
          <div className="flex h-9 items-center rounded-lg border bg-zinc-50 px-4 select-all">
            {publicDomain}
          </div>

          <div className="mt-7 mb-2 font-semibold">{t('Custom Domain')}</div>
          <Input
            ref={ref}
            defaultValue={customDomain}
            className="bg-zinc-50"
            placeholder={t('Input your custom domain') || 'Input your custom domain'}
          />

          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-wrap">{t('CNAME Tips', { domain: publicDomain })}</span>
          </div>
        </div>
        <DrawerFooter>
          <Button className="w-20" disabled={isLoading} onClick={handleConfirm}>
            {t('confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CustomAccessDrawer;
