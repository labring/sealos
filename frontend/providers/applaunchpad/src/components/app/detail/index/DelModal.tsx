import { delAppByName } from '@/api/app';
import { TAppSource, TAppSourceType } from '@/types/app';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sealos/shadcn-ui/dialog';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useAppOperation } from '@/hooks/useAppOperation';
import dynamic from 'next/dynamic';
import { TriangleAlert } from 'lucide-react';

const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

enum Page {
  REMINDER = 'REMINDER',
  DELETION_WARNING = 'DELETION_WARNING'
}

const DelModal = ({
  appName,
  onClose,
  onSuccess,
  source
}: {
  appName: string;
  onClose: () => void;
  onSuccess: () => void;
  source?: TAppSource;
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const { executeOperation, loading, errorModalState, closeErrorModal } = useAppOperation();
  const [activePage, setActivePage] = useState<Page>(Page.REMINDER);
  const pageManuallyChangedRef = useRef(false);

  useEffect(() => {
    if (!pageManuallyChangedRef.current) {
      source?.hasSource ? setActivePage(Page.REMINDER) : setActivePage(Page.DELETION_WARNING);
    }
  }, [source]);

  const deleteTypeTipMap: Record<TAppSourceType, string> = {
    app_store: t('delete_template_app_tip'),
    sealaf: t('delete_sealaf_app_tip')
  };

  const handleDelApp = useCallback(async () => {
    await executeOperation(
      async () => {
        await delAppByName(appName);
        const delay = Math.random() * 2000 + 2000; // 2000-4000ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      },
      {
        successMessage: t('success'),
        errorMessage: t('Delete Failed'),
        showErrorModal: true,
        onSuccess: () => {
          onSuccess();
          onClose();
        }
      }
    );
  }, [appName, executeOperation, t, onSuccess, onClose]);

  const openTemplateApp = () => {
    if (!source?.hasSource) return;
    if (source?.sourceType === 'app_store') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-template',
        pathname: '/instance',
        query: { instanceName: source?.sourceName }
      });
    }
    if (source?.sourceType === 'sealaf') {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-sealaf',
        pathname: '/',
        query: { instanceName: source?.sourceName }
      });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[450px] text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold leading-none">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {activePage === Page.REMINDER ? t('Remind') : t('Deletion warning')}
          </DialogTitle>
        </DialogHeader>

        {activePage === Page.REMINDER && source?.sourceType ? (
          <>
            <div className="text-sm font-normal">{deleteTypeTipMap[source?.sourceType]}</div>
          </>
        ) : (
          <>
            <div className="text-sm font-normal">{t('delete_app_tip')}</div>

            <div className="rounded-lg bg-destructive-foreground p-4 text-sm text-destructive">
              {t('delete_warning_persistent')}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                {t('Please enter')}
                <span className="mx-1 font-medium text-accent-foreground select-all">
                  {appName}
                </span>
                {t('To Confirm')}
              </span>
              <Input
                placeholder={appName}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-10"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" className="shadow-none" onClick={onClose} size="lg">
            {t('Cancel')}
          </Button>
          {activePage === Page.REMINDER ? (
            <Button className="shadow-none" onClick={openTemplateApp} size="lg">
              {t('confirm_to_go')}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-destructive shadow-none"
              disabled={inputValue !== appName || loading}
              onClick={handleDelApp}
              size="lg"
            >
              {loading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {t('Delete')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </Dialog>
  );
};

export default DelModal;
