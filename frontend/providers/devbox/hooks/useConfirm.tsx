import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Button
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'

export const useConfirm = ({
  title = 'prompt',
  content,
  confirmText = 'confirm',
  cancelText = 'cancel'
}: {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const t = useTranslations()
  const cancelRef = useRef(null)
  const confirmCb = useRef<any>()
  const cancelCb = useRef<any>()

  return {
    openConfirm: useCallback(
      (confirm?: any, cancel?: any) => {
        return function () {
          onOpen()
          confirmCb.current = confirm
          cancelCb.current = cancel
        }
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
                    onClose()
                    typeof cancelCb.current === 'function' && cancelCb.current()
                  }}>
                  {t(cancelText)}
                </Button>
                <Button
                  ml={3}
                  variant={'solid'}
                  onClick={() => {
                    onClose()
                    typeof confirmCb.current === 'function' && confirmCb.current()
                  }}>
                  {t(confirmText)}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [cancelText, confirmText, content, isOpen, onClose, t, title]
    )
  }
}
