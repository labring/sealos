import { useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Button
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { I18nCommonKey } from '@/types/i18next';

export const useConfirm = ({
  title = 'prompt',
  content,
  confirmText = 'confirm'
}: {
  title?: I18nCommonKey;
  content: I18nCommonKey;
  confirmText?: I18nCommonKey;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const cancelRef = useRef(null);
  const confirmCb = useRef<any>();
  const cancelCb = useRef<any>();

  return {
    openConfirm: useCallback(
      (confirm?: any, cancel?: any) => {
        return function () {
          onOpen();
          confirmCb.current = confirm;
          cancelCb.current = cancel;
        };
      },
      [onOpen]
    ),
    ConfirmChild: useCallback(
      () => (
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                {t(title)}
              </AlertDialogHeader>

              <AlertDialogBody>{t(content)}</AlertDialogBody>

              <AlertDialogFooter>
                <Button
                  variant={'outline'}
                  onClick={() => {
                    onClose();
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  ml={3}
                  variant={'solid'}
                  onClick={() => {
                    onClose();
                    typeof confirmCb.current === 'function' && confirmCb.current();
                  }}
                >
                  {t(confirmText)}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [confirmText, content, isOpen, onClose, t, title]
    )
  };
};
