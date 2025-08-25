import useInvoiceStore from '@/stores/invoce';
import { InvoicePayload } from '@/types';
import { Button, ButtonProps, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import DetailsIcon from '../icons/DetailsIcon';

export default function InvoiceDetails({
  invoice,
  toInvoiceDetail,
  ...props
}: {
  invoice: InvoicePayload;
  toInvoiceDetail: () => void;
} & ButtonProps) {
  const { setInvoiceDetail, setData } = useInvoiceStore();
  const toInvoiceDetailPage = () => {
    setInvoiceDetail(invoice.detail);
    setData(invoice);
    toInvoiceDetail();
  };
  const { t } = useTranslation();
  return (
    <Button
      color={'grayModern.900'}
      gap={'4px'}
      px={'8px'}
      py="6px"
      h="unset"
      fontStyle="normal"
      fontWeight="400"
      fontSize="12px"
      lineHeight="140%"
      border={'unset'}
      bg={'grayModern.150'}
      _expanded={{
        background: 'grayModern.150'
      }}
      _hover={{
        background: 'grayModern.150'
      }}
      borderRadius={'2px'}
      onClick={(e) => {
        e.preventDefault();
        toInvoiceDetailPage();
      }}
      _disabled={{
        opacity: '0.5',
        pointerEvents: 'none'
      }}
      {...props}
    >
      <DetailsIcon w="16px" h="16px" />
      <Text>{t('Details')}</Text>
    </Button>
  );
}
