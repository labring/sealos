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
// import { useTranslation } from 'next-i18next';

export const useConfirm = ({
  title = 'Prompt',
  content,
  confirmText = 'Confirm'
}: {
  title?: string;
  content: string;
  confirmText?: string;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  // const { t } = useTranslation();
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
                {/* {t(title)} */}
                {title}
              </AlertDialogHeader>

              <AlertDialogBody>{content}</AlertDialogBody>

              <AlertDialogFooter>
                <Button
                  colorScheme={'gray'}
                  onClick={() => {
                    onClose();
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                >
                  {/* {t('Cancel')} */}
                  {'Cancel'}
                </Button>
                <Button
                  ml={3}
                  variant={'primary'}
                  onClick={() => {
                    onClose();
                    typeof confirmCb.current === 'function' && confirmCb.current();
                  }}
                >
                  {/* {t(confirmText)} */}
                  {confirmText}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      // [confirmText, content, isOpen, onClose, t, title]
      [confirmText, content, isOpen, onClose, title]
    )
  };
};
