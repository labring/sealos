import { InvoicePayload } from '@/types';
import { Circle, Flex, FlexProps, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export function InvoiceStatus({
  status,
  ...props
}: { status: InvoicePayload['status'] } & FlexProps) {
  const { t } = useTranslation();
  return (
    <Flex
      px="12px"
      py="6px"
      display={'inline-flex'}
      gap={'5px'}
      borderRadius={'33px'}
      alignItems={'center'}
      {...(status === 'COMPLETED'
        ? {
            color: 'grayModern.700',
            bgColor: 'grayModern.100'
          }
        : {
            color: 'green.600',
            bgColor: 'green.50'
          })}
      {...props}
    >
      <Circle bgColor={'currentcolor'} size="6px"></Circle>
      <Text fontWeight={'500'} fontSize={'11px'}>
        {t('orders.status.' + status)}
      </Text>
    </Flex>
  );
}
