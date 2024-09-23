import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Button,
  Checkbox,
  Box
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'

export const useConfirm = ({
  title = 'prompt',
  content,
  confirmText = 'confirm',
  cancelText = 'cancel',
  showCheckbox = false,
  checkboxLabel = ''
}: {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  showCheckbox?: boolean
  checkboxLabel?: string
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const t = useTranslations()
  const cancelRef = useRef(null)
  const confirmCb = useRef<any>()
  const cancelCb = useRef<any>()
  const isCheckedRef = useRef(true)

  return {
    openConfirm: useCallback(
      (confirm?: any, cancel?: any) => {
        return function () {
          onOpen()
          confirmCb.current = confirm
          cancelCb.current = cancel
          isCheckedRef.current = true
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

              <AlertDialogBody>
                <Box>{t(content)}</Box>
                <Box mt={'12px'}>
                  {showCheckbox && (
                    <Checkbox
                      isChecked={isCheckedRef.current}
                      spacing={4}
                      onChange={(e) => (isCheckedRef.current = e.target.checked)}>
                      {t(checkboxLabel)}
                    </Checkbox>
                  )}
                </Box>
              </AlertDialogBody>

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
                    if (showCheckbox) {
                      typeof confirmCb.current === 'function' &&
                        confirmCb.current(isCheckedRef.current)
                    } else {
                      typeof confirmCb.current === 'function' && confirmCb.current()
                    }
                  }}>
                  {t(confirmText)}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [cancelText, checkboxLabel, confirmText, content, isOpen, onClose, showCheckbox, t, title]
    )
  }
}
