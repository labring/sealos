import { useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Button,
  AlertDialogCloseButton
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

export const useConfirmDialog = ({
  title = 'Prompt',
  content
}: {
  title?: string;
  content: string;
}) => {
  const { t } = useTranslation();
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
            <AlertDialogContent w="380px">
              <AlertDialogCloseButton />
              <AlertDialogHeader fontSize="18px" fontWeight="600" color={'#262A32'}>
                {t(title)}
              </AlertDialogHeader>
              <AlertDialogBody fontSize={'14px'} color={'#5A646E'} fontWeight={400}>
                {t(content)}
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button
                  variant={'outline'}
                  borderRadius={'4px'}
                  w="80px"
                  h="36px"
                  color={'#5A646E'}
                  fontSize={'14px'}
                  fontWeight={500}
                  onClick={() => {
                    onClose();
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  variant={'base'}
                  ml={3}
                  borderRadius={'4px'}
                  bg="#FF5B6E"
                  w="80px"
                  h="36px"
                  fontSize={'14px'}
                  fontWeight={600}
                  color={'#FEFEFE'}
                  onClick={() => {
                    onClose();
                    typeof confirmCb.current === 'function' && confirmCb.current();
                  }}
                >
                  {t('Confirm')}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [content, isOpen, onClose, t, title]
    )
  };
};
