import { Button, ButtonProps, useToast } from '@chakra-ui/react';
import { RefreshIcon } from '@sealos/ui';

export function Refresh({
  onRefresh,
  ...props
}: {
  onRefresh(): void;
} & ButtonProps) {
  const toast = useToast();
  return (
    <Button
      display={'flex'}
      gap="8px"
      bg={'white'}
      border={'1px solid'}
      borderColor={'grayModern.250'}
      variant={'white-bg-icon'}
      {...props}
      onClick={() => {
        Promise.resolve(onRefresh()).then(() => {
          toast({
            status: 'success',
            title: 'refresh successfully',
            position: 'top'
          });
        });
      }}
    >
      <RefreshIcon boxSize={'24px'} color="grayModern.500" />
    </Button>
  );
}
