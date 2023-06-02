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

export const useConfirm = ({ title = '提示', content }: { title?: string; content: string }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
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
                  取消
                </Button>
                <Button
                  ml={3}
                  variant={'primary'}
                  onClick={() => {
                    onClose();
                    typeof confirmCb.current === 'function' && confirmCb.current();
                  }}
                >
                  确认
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [content, isOpen, onClose, title]
    )
  };
};
