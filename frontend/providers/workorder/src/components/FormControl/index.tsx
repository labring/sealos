import React, { ReactNode } from 'react';
import { FormControl, FormErrorMessage } from '@chakra-ui/react';
import type { FormControlProps } from '@chakra-ui/react';

interface Props extends FormControlProps {
  errorText?: string;
  showError?: boolean;
  children: ReactNode;
}

const MyFormControl = ({ errorText, showError = false, children, ...props }: Props) => {
  return (
    <FormControl
      position={'relative'}
      pb={showError ? '24px' : '0'}
      isInvalid={!!errorText}
      {...props}
    >
      {children}
      {showError && !!errorText && (
        <FormErrorMessage mt={1} position={'absolute'}>
          {errorText}
        </FormErrorMessage>
      )}
    </FormControl>
  );
};

export default MyFormControl;
