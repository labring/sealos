import { ButtonProps, Button, forwardRef } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
export enum BINDING_STATE_MODIFY_BEHAVIOR {
  BINDING,
  UNBINDING,
  CHANGE_BINDING
}
export const BindingModifyButton = forwardRef<
  ButtonProps & { modifyBehavior: BINDING_STATE_MODIFY_BEHAVIOR },
  'button'
>(function ChangeButton({ modifyBehavior, ...props }, ref) {
  const { t } = useTranslation();
  return (
    <Button variant={'ghost'} bgColor={'grayModern.150'} p={'8px 14px'} {...props} ref={ref}>
      {modifyBehavior === BINDING_STATE_MODIFY_BEHAVIOR.BINDING
        ? t('Bind')
        : modifyBehavior === BINDING_STATE_MODIFY_BEHAVIOR.UNBINDING
        ? t('Unbind')
        : modifyBehavior === BINDING_STATE_MODIFY_BEHAVIOR.CHANGE_BINDING
        ? t('Change')
        : null}
    </Button>
  );
});
