import {
  Button,
  ButtonProps,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
// import { BillingDetailsTable } from './billingTable';
import request from '@/service/request';
import useAppTypeStore from '@/stores/appType';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp, APPBillingItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import DetailsIcon from '../icons/DetailsIcon';
import { BillingDetailsTable } from './billingTable';
import { AppIcon } from '../AppIcon';

export default function BillingDetails({
  namespace,
  app_type,
  appName,
  orderID,
  ...props
}: {
  appName: string;
  namespace: string;
  orderID: string;
  app_type: number;
} & ButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { getRegion } = useBillingStore();
  const { endTime, startTime } = useOverviewStore();
  const { getAppType } = useAppTypeStore();
  const appType = getAppType(app_type + '');
  const query = {
    endTime,
    startTime,
    regionUid: getRegion()?.uid || '',
    appType,
    appName,
    orderID,
    namespace
  };
  const { t } = useTranslation();
  return (
    <>
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
          onOpen();
        }}
        _disabled={{
          opacity: '0.5',
          pointerEvents: 'none'
        }}
        {...props}
      >
        <DetailsIcon boxSize={'12px'} />
        <Text>{t('Details')}</Text>
      </Button>
      <BillingDetailsModal query={query} onClose={onClose} isOpen={isOpen}></BillingDetailsModal>
    </>
  );
}
export function BillingDetailsModal({
  query,
  onClose,
  isOpen
}: {
  query: {
    endTime: Date;
    startTime: Date;
    regionUid: string;
    appType: string;
    appName: string;
    orderID: string;
    namespace: string;
  };
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data } = useQuery(
    ['billingDetails', query],
    () => {
      return request<
        any,
        ApiResp<{
          costs: APPBillingItem[];
          current_page: number;
          total_pages: number;
          total_records: number;
        }>
      >('/api/billing/appBilling', {
        method: 'POST',
        data: query
      });
    },
    {
      enabled: isOpen
    }
  );
  const { t } = useTranslation();
  return (
    <Modal size={'4xl'} isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          bg={'grayModern.25'}
          borderBottom={'1px solid'}
          borderColor={'grayModern.100'}
          color={'grayModern.900'}
          display={'flex'}
          alignItems={'center'}
          gap={'10px'}
        >
          <AppIcon app={query.appType} className={{ avatar: 'size-6' }} />
          <Text>{query.appName}</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="25px" display={'flex'} flexDirection={'column'}>
          <Flex mb="16px" gap="24px" color={'grayModern.600'} fontSize={'12px'}>
            <Text>
              {t('Order Number')}: {query.orderID}
            </Text>
            <Text>
              {t('Transaction Time')}: {format(query.startTime, 'yyyy-MM-dd HH:MM')} ~
              {format(query.endTime, 'yyyy-MM-dd HH:MM')}
            </Text>
          </Flex>
          <BillingDetailsTable data={data?.data?.costs || []} flex="1" h={'0'} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
