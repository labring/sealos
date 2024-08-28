import artical_icon from '@/assert/article.svg';
import arrow_icon from '@/assert/left2.svg';
import email_icon from '@/assert/mdi_email-receive-outline.svg';
import { InvoiceStatus } from '@/components/invoice/Status';
import useInvoiceStore from '@/stores/invoce';
import { InvoicesCollection } from '@/types';
import { formatMoney } from '@/utils/format';
import {
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  Img,
  Stack,
  Text,
  useToast
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function InvoicdForm({ backcb, onSuccess }: { backcb: () => void; onSuccess: () => void }) {
  const totast = useToast();
  const { t, i18n } = useTranslation();
  const { invoiceDetail, data, setData } = useInvoiceStore();

  const props = useMemo(() => {
    const convertType = (type: string) => {
      switch (type) {
        case 'normal':
          return t('orders.details.type.list.normal');
        case 'special':
          return t('orders.details.type.list.special');
        default:
          return t('orders.details.type.list.normal');
      }
    };
    const initVal: {
      details: { name: string; value: string; key: keyof InvoicesCollection['detail'] }[];
      contract: { name: string; value: string; key: keyof InvoicesCollection['contract'] }[];
    } = {
      details: [
        {
          name: t('orders.details.type.name'),
          key: 'type',
          value: convertType('normal')
        },
        {
          name: t('orders.details.invoiceTitle.name'),
          value: '',
          key: 'title'
        },
        {
          name: t('orders.details.taxRegistrationNumber.name'),
          value: '',
          key: 'tax'
        },
        {
          name: t('orders.details.bankName.name'),
          key: 'bank',
          value: ''
        },
        {
          name: t('orders.details.bankAccount.name'),
          value: '',
          key: 'bankAccount'
        },
        {
          name: t('orders.details.address.name'),
          value: '',
          key: 'address'
        },
        {
          name: t('orders.details.phone.name'),
          value: '',
          key: 'phone'
        },
        {
          name: t('orders.details.fax.name'),
          value: '',
          key: 'fax'
        }
      ],
      contract: [
        {
          name: t('orders.contract.person.name'),
          value: '',
          key: 'person'
        },
        {
          name: t('orders.contract.phone.name'),
          value: '',
          key: 'phone'
        },
        {
          name: t('orders.contract.email.name'),
          value: '',
          key: 'email'
        }
      ]
    };
    const invoiceDetail = data?.detail;
    if (!invoiceDetail) {
      return initVal;
    }
    try {
      const res = JSON.parse(invoiceDetail) as InvoicesCollection;
      initVal.details.forEach((d) => {
        const value = res.detail[d.key];
        if (value) {
          if (d.key === 'type') {
            d.value = convertType(value);
          } else d.value = value;
        }
      });

      initVal.contract.forEach((d) => {
        const value = res.contract[d.key];
        if (value) {
          d.value = value;
        }
      });
      return initVal;
    } catch (e) {
      return initVal;
    }
  }, [data?.detail, t]);

  if (!data) return null;
  return (
    <Box>
      <Flex mr="24px" align={'center'}>
        <Button
          variant={'unstyled'}
          minH={'0'}
          minW={'0'}
          boxSize="36px"
          onClick={() => {
            setData();
            backcb();
          }}
        >
          <Img src={arrow_icon.src} w={'24px'} h={'24px'} mr={'18px'} dropShadow={'#24282C'}></Img>
        </Button>
        <Heading size="lg" mr={'12px'}>
          {t('SideBar.CreateInvoice')}
        </Heading>
        <InvoiceStatus status={data.status} />
      </Flex>
      <Stack
        borderColor="grayModern.250"
        borderWidth={'1px'}
        borderRadius={'6px'}
        mx="auto"
        mt={'22px'}
        minW="540px"
        maxW={'970px'}
        gap={'0'}
        overflow="hidden"
      >
        <Flex
          bg={'grayModern.100'}
          color={'grayModern.900'}
          px="48px"
          py="15px"
          align="center"
          fontWeight={'500'}
        >
          <Img src={artical_icon.src} boxSize={'24px'}></Img>
          <Text ml={'8px'} fontSize={'18px'}>
            {t('orders.Invoice Details')}
          </Text>
          <Text ml={'auto'} fontSize={'14px'}>
            {t('orders.invoiceAmount')}:
          </Text>
          <Text ml="10px" color="brightBlue.600">
            ￥ {formatMoney(data.totalAmount)}
          </Text>
        </Flex>
        <Stack px="48px" py="24px" mt={'0'} gap={'20px'}>
          <Flex wrap={'wrap'} align="center" my={'0px'} mt="0px">
            <Flex
              display="flex"
              flex={'1'}
              maxW={'420px'}
              flexShrink={'0'}
              alignItems="center"
              minW={'max-content'}
              fontSize={'12px'}
              fontWeight={'500'}
            >
              <FormLabel mb={'0'} w="100px" color={'grayModern.900'}>
                {t('orders.Invoice Content')}
              </FormLabel>
              <Flex
                // variant="unstyled"
                color={'grayModern.600'}
                width={'280px'}
                // ml="auto"
                p="8px"
                // _focus={{
                // 	borderColor: 'blue'
                // }}
              >
                {t('orders.Electronic Computer Service Fee')}
              </Flex>
            </Flex>
            {props &&
              props.details.map((item, index) => (
                <Flex
                  key={`details.${item.key}.value`}
                  display="flex"
                  flex={'1'}
                  maxW={'420px'}
                  flexShrink={'0'}
                  alignItems="center"
                  // mx={'20px'}
                  // mt="24px"
                  minW={'max-content'}
                  fontSize={'12px'}
                  fontWeight={'500'}
                >
                  <FormLabel mb={'0'} w="100px" color={'grayModern.900'}>
                    {item.name}
                  </FormLabel>
                  <Flex
                    // variant="unstyled"
                    color={'grayModern.600'}
                    width={'280px'}
                    // ml="auto"
                    p="8px"
                    // _focus={{
                    // 	borderColor: 'blue'
                    // }}
                  >
                    {item.value}
                  </Flex>
                </Flex>
              ))}
          </Flex>
        </Stack>
      </Stack>
      <Stack
        borderColor="grayModern.250"
        borderWidth={'1px'}
        borderRadius={'6px'}
        mx="auto"
        mt={'17px'}
        minW="540px"
        maxW={'970px'}
        gap={'0'}
        overflow="hidden"
      >
        <Flex
          bg={'grayModern.100'}
          color={'grayModern.900'}
          px="48px"
          py="15px"
          align="center"
          fontWeight={'500'}
        >
          <Img src={email_icon.src} boxSize={'24px'}></Img>
          <Text ml={'12px'} fontSize={'18px'}>
            {t('orders.Contact Information')}
          </Text>
        </Flex>
        <Stack px="48px" py="24px" mt={'0'} gap={'20px'} justifyContent={'space-between'}>
          <Flex wrap={'wrap'} align="center" my={'0px'} mt="0px">
            {props &&
              props.contract.map((item, index) => (
                <Flex
                  key={`details.${item.key}.value`}
                  display="flex"
                  flex={'1'}
                  maxW={'420px'}
                  flexShrink={'0'}
                  alignItems="center"
                  minW={'max-content'}
                  fontSize={'12px'}
                  fontWeight={'500'}
                >
                  <FormLabel mb={'0'} width={'100px'} color={'grayModern.900'}>
                    {item.name}
                  </FormLabel>
                  <Flex color={'grayModern.600'} width={'280px'} p="8px">
                    {item.value}
                  </Flex>
                </Flex>
              ))}
          </Flex>
        </Stack>
      </Stack>
    </Box>
  );
}

export default InvoicdForm;
