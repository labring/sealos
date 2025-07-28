import * as React from 'react';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const useConfirm = ({
  title = 'prompt',
  content,
  confirmText = 'confirm',
  cancelText = 'cancel'
}: {
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="top-[20%] w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <TriangleAlert className="h-4 w-4 text-yellow-600" />
                {t(title)}
              </DialogTitle>
            </DialogHeader>
            <div className="text-zinc-900">{t(content)}</div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  typeof cancelCb.current === 'function' && cancelCb.current();
                }}
              >
                {t(cancelText)}
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  typeof confirmCb.current === 'function' && confirmCb.current();
                }}
              >
                {t(confirmText)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      [cancelText, confirmText, content, isOpen, t, title]
    )
  };
};
