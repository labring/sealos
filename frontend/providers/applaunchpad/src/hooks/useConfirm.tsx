import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@sealos/shadcn-ui/alert-dialog';
import { Button } from '@sealos/shadcn-ui/button';
import { useTranslation } from 'next-i18next';
import { TriangleAlert } from 'lucide-react';

export const useConfirm = ({ title = 'Prompt', content }: { title?: string; content: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const confirmCb = useRef<any>();
  const cancelCb = useRef<any>();

  return {
    openConfirm: useCallback((confirm?: any, cancel?: any) => {
      return function () {
        setIsOpen(true);
        confirmCb.current = confirm;
        cancelCb.current = cancel;
      };
    }, []),
    ConfirmChild: useCallback(
      () => (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent className="w-[360px] text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold leading-none">
                <TriangleAlert className="h-4 w-4 text-yellow-600" />
                {t(title)}
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="text-sm font-normal">{t(content)}</div>

            <AlertDialogFooter className="gap-3">
              <Button
                variant="outline"
                size="lg"
                className="shadow-none"
                onClick={() => {
                  setIsOpen(false);
                  typeof cancelCb.current === 'function' && cancelCb.current();
                }}
              >
                {t('Cancel')}
              </Button>
              <Button
                size="lg"
                className="shadow-none"
                onClick={() => {
                  setIsOpen(false);
                  typeof confirmCb.current === 'function' && confirmCb.current();
                }}
              >
                {t('Confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
      [content, isOpen, t, title]
    )
  };
};
