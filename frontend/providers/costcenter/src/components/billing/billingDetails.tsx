import {
  useDisclosure,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  TextProps,
  Flex,
  ButtonProps
} from '@chakra-ui/react';
import { BillingDetailsTable } from './billingTable';
import { BillingData, BillingSpec } from '@/types';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import DetailsIcon from '../icons/DetailsIcon';

export default function BillingDetails({
  orderId,
  time,
  appType,
  ...props
}: {
  orderId: string;
  time: string;
  appType: string;
} & ButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data } = useQuery(
    ['billing', { orderId }],
    () => {
      const spec = {
        endTime: new Date(),
        page: 1,
        pageSize: 1,
        startTime: new Date(),
        type: -1,
        orderID: orderId
      };
      return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
        method: 'POST',
        data: {
          spec
        }
      });
    },
    {
      onSuccess(data) {
        console.log(data);
      },
      enabled: isOpen
    }
  );
  const { t } = useTranslation();
  return (
    <>
      <Button
        color={'grayModern.600'}
        gap={'8px'}
        px={'8px'}
        py="7px"
        h="unset"
        fontStyle="normal"
        fontWeight="400"
        fontSize="12px"
        lineHeight="140%"
        border={'1px solid #DEE0E2'}
        bg={'#F6F8F9'}
        _expanded={{
          background: '#F8FAFB',
          border: `1px solid #36ADEF`
        }}
        _hover={{
          background: '#F8FAFB',
          border: `1px solid #36ADEF`
        }}
        borderRadius={'2px'}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
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
      <Modal size={'4xl'} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('Billing Details')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="25px">
            <Flex mb="25px" gap="32px" color={'#485058'}>
              <Text>
                {t('Order Number')}: {orderId}
              </Text>
              <Text>
                {t('Transaction Time')}: {format(parseISO(time), 'yyyy-MM-dd HH:MM')}
              </Text>
              <Text>
                {t('APP Type')}: {appType}
              </Text>
            </Flex>
            <BillingDetailsTable data={data?.data?.status?.item || []} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
