import receipt_icon from '@/assert/invoice-active.svg';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
import PaymentPanel from '@/components/invoice/PaymentPanel';
import RecordPanel from '@/components/invoice/RecordPanel';
import { RechargeBillingItem } from '@/types';
import { formatMoney } from '@/utils/format';
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Img,
  Input,
  InputGroup,
  InputRightElement,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import InvoicdForm from './InvoicdForm';
import InvoicdFormDetail from './InvoicdFormDetail';

function Invoice() {
  const { t, i18n } = useTranslation();
  const [selectBillings, setSelectBillings] = useState<RechargeBillingItem[]>([]);
  const [searchValue, setSearch] = useState('');
  const [orderID, setOrderID] = useState('');
  const queryClient = useQueryClient();
  const [tabIdx, setTabIdx] = useState(0);

  const [processState, setProcessState] = useState(0);
  const invoiceAmount = selectBillings.reduce((acc, cur) => acc + cur.Amount, 0);
  const invoiceCount = selectBillings.length;
  const isLoading = false;
  return (
    <Flex
      flexDirection="column"
      w="100%"
      h="100%"
      bg={'white'}
      px="24px"
      py={'24px'}
      overflow={'auto'}
    >
      {processState === 0 ? (
        <>
          <Flex alignItems={'center'} flexWrap={'wrap'} mb={'24px'}>
            <Flex mr="24px" align={'center'}>
              <Img
                src={receipt_icon.src}
                w={'24px'}
                h={'24px'}
                mr={'18px'}
                dropShadow={'#24282C'}
              ></Img>
              <Heading size="lg">{t('SideBar.CreateInvoice')}</Heading>
            </Flex>
            <InputGroup
              ml={'auto'}
              variant={'outline'}
              width={'260px'}
              // mb={'24px'}
            >
              <Input
                isDisabled={isLoading}
                placeholder={t('Order Number') as string}
                value={searchValue}
                onChange={(v) => setSearch(v.target.value)}
              />
              <InputRightElement>
                <IconButton
                  minW={'auto'}
                  height={'auto'}
                  boxSize={'16px'}
                  onClick={(e) => {
                    e.preventDefault();
                    setOrderID(searchValue.trim());
                  }}
                  variant={'unstyled'}
                  icon={<Img src={magnifyingGlass_icon.src} boxSize={'16px'} />}
                  aria-label={'search orderId'}
                ></IconButton>
              </InputRightElement>
            </InputGroup>
          </Flex>
          <Tabs
            variant={'primary'}
            tabIndex={tabIdx}
            onChange={(idx) => {
              setTabIdx(idx);
            }}
          >
            <TabList>
              <Tab>
                <Text>{t('orders.list')}</Text>
              </Tab>
              <Tab>
                <Text>{t('orders.invoiceRecord')}</Text>
              </Tab>
              {tabIdx === 0 && (
                <Flex ml={'auto'} align="center">
                  <Flex>
                    <Text>{t('orders.invoiceAmount')}:</Text>
                    <Text color="rgba(29, 140, 220, 1)">￥ {formatMoney(invoiceAmount)}</Text>
                  </Flex>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      setProcessState(1);
                    }}
                    isDisabled={invoiceCount === 0}
                    ml="19px"
                    color="#FFFFFF"
                    bg={'#24282C'}
                    variant={'unstyled'}
                    _hover={{
                      opacity: '0.5'
                    }}
                    py="6px"
                    px="30px"
                  >
                    {t('orders.invoice')} {invoiceCount > 0 ? <>({invoiceCount})</> : <></>}
                  </Button>
                </Flex>
              )}
            </TabList>
            <TabPanels>
              <PaymentPanel
                selectbillings={selectBillings}
                setSelectBillings={setSelectBillings}
                orderID={orderID}
              ></PaymentPanel>
              <RecordPanel
                toInvoiceDetail={() => {
                  setProcessState(2);
                }}
              />
            </TabPanels>
          </Tabs>
        </>
      ) : processState === 1 ? (
        <InvoicdForm
          onSuccess={() => {
            setSelectBillings([]);
            queryClient.invalidateQueries({
              queryKey: ['billing'],
              exact: false
            });
          }}
          invoiceAmount={invoiceAmount}
          invoiceCount={invoiceCount}
          billings={selectBillings}
          backcb={() => {
            setProcessState(0);
          }}
        ></InvoicdForm>
      ) : processState === 2 ? (
        <InvoicdFormDetail
          onSuccess={() => {
            setSelectBillings([]);
            queryClient.invalidateQueries({
              queryKey: ['billing'],
              exact: false
            });
          }}
          backcb={() => {
            setProcessState(0);
          }}
        ></InvoicdFormDetail>
      ) : (
        <></>
      )}
    </Flex>
  );
}

export default Invoice;

export async function getServerSideProps({ locale }: { locale: string }) {
  if (!global.AppConfig.costCenter.invoice.enabled) {
    return {
      redirect: {
        destination: '/cost_overview',
        permanent: false
      }
    };
  }
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, ['zh', 'en']))
    }
  };
}
