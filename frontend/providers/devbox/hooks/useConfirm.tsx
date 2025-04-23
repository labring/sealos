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
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

const ConfirmCheckbox = ({
  checkboxLabel,
  onCheckedChange,
  defaultChecked
}: {
  checkboxLabel: string;
  onCheckedChange: (checked: boolean) => void;
  defaultChecked: boolean;
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);
  const t = useTranslations();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setIsChecked(newValue);
    onCheckedChange(newValue);
  };

  return (
    <Checkbox isChecked={isChecked} spacing={4} onChange={handleChange}>
      {t(checkboxLabel)}
    </Checkbox>
  );
};

export const useConfirm = ({
  title = 'prompt',
  content,
  confirmText = 'confirm',
  cancelText = 'cancel',
  showCheckbox = false,
  defaultChecked = true,
  checkboxLabel = ''
}: {
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  defaultChecked?: boolean;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const t = useTranslations();
  const cancelRef = useRef(null);
  const confirmCb = useRef<any>();
  const cancelCb = useRef<any>();
  const isCheckedRef = useRef(defaultChecked);

  return {
    openConfirm: useCallback(
      (confirm?: any, cancel?: any) => {
        return function () {
          onOpen();
          confirmCb.current = confirm;
          cancelCb.current = cancel;
          isCheckedRef.current = defaultChecked;
        };
      },
      [onOpen, defaultChecked]
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
                    <ConfirmCheckbox
                      checkboxLabel={checkboxLabel}
                      defaultChecked={defaultChecked}
                      onCheckedChange={(checked) => {
                        isCheckedRef.current = checked;
                      }}
                    />
                  )}
                </Box>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button
                  variant={'outline'}
                  onClick={() => {
                    onClose();
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                >
                  {t(cancelText)}
                </Button>
                <Button
                  ml={3}
                  variant={'solid'}
                  onClick={() => {
                    onClose();
                    if (showCheckbox) {
                      typeof confirmCb.current === 'function' &&
                        confirmCb.current(isCheckedRef.current);
                    } else {
                      typeof confirmCb.current === 'function' && confirmCb.current();
                    }
                  }}
                >
                  {t(confirmText)}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      ),
      [
        cancelText,
        checkboxLabel,
        confirmText,
        content,
        isOpen,
        onClose,
        showCheckbox,
        t,
        title,
        defaultChecked
      ]
    )
  };
};
