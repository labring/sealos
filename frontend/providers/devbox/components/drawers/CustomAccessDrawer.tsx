import { useRef } from 'react';
import { InfoIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { postAuthCname } from '@/api/platform';
import { useRequest } from '@/hooks/useRequest';

export type CustomAccessDrawerParams = {
  publicDomain: string;
  customDomain: string;
};

const CustomAccessDrawer = ({
  publicDomain,
  customDomain,
  onClose,
  onSuccess
}: CustomAccessDrawerParams & { onClose: () => void; onSuccess: (e: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const t = useTranslations();

  const { mutate: authCNAME, isLoading } = useRequest({
    mutationFn: async () => {
      const val = ref.current?.value || '';
      if (!val) {
        return onSuccess('');
      }
      await postAuthCname({
        publicDomain: publicDomain,
        customDomain: val
      });
      return val;
    },
    onSuccess,
    errorToast: 'Custom Domain Error'
  });

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
          <Button className="w-20" disabled={isLoading} onClick={() => authCNAME()}>
            {t('confirm')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CustomAccessDrawer;
