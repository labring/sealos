import { FormLabel, FormLabelProps } from '@chakra-ui/react';

export default function MyFormLabel({
  isRequired,
  children,
  ...props
}: FormLabelProps & { isRequired?: boolean }) {
  return (
    <FormLabel
      {...props}
      _before={
        isRequired
          ? {
              content: '"*"',
              // display: 'none',
              color: 'red.600',
              fontSize: '14px',
              fontWeight: '500'
            }
          : {}
      }
    >
      {children}
    </FormLabel>
  );
}
