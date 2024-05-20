import { ApiResp, ReqGenInvoice } from '@/types';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber
} from '@/utils/tools';
import {
  Flex,
  Img,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Box,
  InputGroup,
  InputRightAddon,
  Link,
  useToast,
  useDisclosure,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { Formik, FieldArray, Form, Field } from 'formik';
import request from '@/service/request';
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import artical_icon from '@/assert/article.svg';
import arrow_right from '@/assert/material-symbols_expand-more-rounded.svg';
import arrow_left_icon from '@/assert/toleft.svg';
import arrow_icon from '@/assert/Vector.svg';
import email_icon from '@/assert/mdi_email-receive-outline.svg';
import listIcon from '@/assert/list.svg';
import { InvoiceTable } from '@/components/invoice/invoiceTable';

const BillingModal = ({
  billings,
  t,
  invoiceAmount,
  invoiceCount
}: {
  billings: ReturnType<typeof useRef<ReqGenInvoice['billings']>>;
  t: (key: string) => string;
  invoiceAmount: number;
  invoiceCount: number;
}) => {
  const [pageSize, setPageSize] = useState(10);
  const totalPage = Math.floor((billings?.current?.length || 0) / pageSize) + 1;
  const [currentPage, setcurrentPage] = useState(1);
  return (
    <>
      <ModalContent w={'910px'} maxW="910px" h={'auto'} maxH="620px">
        <ModalHeader display={'flex'}>
          {t('orders.invoiceOrder')}({invoiceCount})
          <Text color="rgba(29, 140, 220, 1)">￥ {invoiceAmount}</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box
            overflow={'auto'}
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight="500"
            lineHeight="20px"
          >
            <Flex mb={'16px'} align="center">
              <Flex align={'center'}>
                <Img src={listIcon.src} w={'20px'} h={'20px'} mr={'6px'} />
                <Text>{t('orders.list')}</Text>
              </Flex>
            </Flex>
            <InvoiceTable
              selectbillings={billings.current || []}
              data={(billings.current || []).filter(
                (item, index) =>
                  index <= pageSize * currentPage - 1 && index >= pageSize * (currentPage - 1)
              )}
            ></InvoiceTable>
          </Box>
          <Flex w="370px" h="32px" align={'center'} mt={'20px'} mx="auto">
            <Text>{t('Total')}:</Text> <Flex w="40px">{billings?.current?.length || 0}</Flex>
            <Flex gap={'8px'}>
              <Button
                variant={'switchPage'}
                isDisabled={currentPage === 1}
                onClick={(e) => {
                  e.preventDefault();
                  setcurrentPage(1);
                }}
              >
                <Img w="6px" h="6px" src={arrow_left_icon.src}></Img>
              </Button>
              <Button
                variant={'switchPage'}
                isDisabled={currentPage === 1}
                onClick={(e) => {
                  e.preventDefault();
                  setcurrentPage(currentPage - 1);
                }}
              >
                <Img src={arrow_icon.src} transform={'rotate(-90deg)'}></Img>
              </Button>
              <Flex my={'auto'}>
                <Text>{currentPage}</Text>/<Text>{totalPage}</Text>
              </Flex>
              <Button
                variant={'switchPage'}
                isDisabled={currentPage === totalPage}
                bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
                onClick={(e) => {
                  e.preventDefault();
                  setcurrentPage(currentPage + 1);
                }}
              >
                <Img src={arrow_icon.src} transform={'rotate(90deg)'}></Img>
              </Button>
              <Button
                variant={'switchPage'}
                isDisabled={currentPage === totalPage}
                bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
                mr={'10px'}
                onClick={(e) => {
                  e.preventDefault();
                  setcurrentPage(totalPage);
                }}
              >
                <Img w="6px" h="6px" src={arrow_left_icon.src} transform={'rotate(180deg)'}></Img>
              </Button>
            </Flex>
            <Text>{pageSize}</Text> <Text>/{t('Page')}</Text>
          </Flex>
        </ModalBody>
      </ModalContent>
    </>
  );
};

function InvoicdForm({
  invoiceAmount,
  invoiceCount,
  billings,
  backcb,
  onSuccess
}: {
  backcb: () => void;
  onSuccess: () => void;
  invoiceAmount: number;
  invoiceCount: number;
  billings: ReturnType<typeof useRef<ReqGenInvoice['billings']>>;
}) {
  const totast = useToast();
  const { t, i18n } = useTranslation();
  const initVal = {
    details: [
      {
        name: t('orders.details.invoiceTitle.name'),
        placeholder: t('orders.details.invoiceTitle.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.taxRegistrationNumber.name'),
        placeholder: t('orders.details.taxRegistrationNumber.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.bankName.name'),
        placeholder: t('orders.details.bankName.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.bankAccount.name'),
        placeholder: t('orders.details.bankAccount.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.address.name'),
        placeholder: t('orders.details.address.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.phone.name'),
        placeholder: t('orders.details.phone.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.details.fax.name'),
        placeholder: t('orders.details.fax.placeholder'),
        isRequired: false,
        value: ''
      }
    ],
    contract: [
      {
        name: t('orders.contract.person.name'),
        placeholder: t('orders.contract.person.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.contract.phone.name'),
        placeholder: t('orders.contract.phone.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.contract.email.name'),
        placeholder: t('orders.contract.email.placeholder'),
        isRequired: true,
        value: ''
      },
      {
        name: t('orders.contract.code.name'),
        placeholder: t('orders.contract.code.placeholder'),
        isRequired: true,
        value: ''
      }
    ]
  } as const;
  const [remainTime, setRemainTime] = useState(-1);
  useEffect(() => {
    if (remainTime <= 0) return;
    const interval = setInterval(() => {
      setRemainTime(remainTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remainTime]);
  const totalTips = () => {
    if (i18n.language === 'zh') return `（总计${invoiceCount}张发票）`;
    else return `(Total ${invoiceCount} invoices)`;
  };
  const validPhone = (phone: string) => {
    if (!isValidPhoneNumber(phone)) {
      totast({
        title: t('orders.phoneValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return false;
    } else return true;
  };
  const getCode = async (phone: string) => {
    if (!validPhone(phone)) return;
    setRemainTime(60);
    try {
      const res = await request.post<any, ApiResp<any>>('/api/invoice/sms', {
        phoneNumbers: phone
      });
      if (res.code !== 200 || res.message !== 'successfully') {
        throw new Error('Get code failed');
      }
      totast({
        title: t('orders.code success'),
        status: 'success',
        duration: 2000,
        position: 'top'
      });
    } catch (err) {
      totast({
        title: t('orders.code error'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      setRemainTime(0);
    }
  };
  const submit: Parameters<typeof Formik<typeof initVal>>[0]['onSubmit'] = async (
    values,
    actions
  ) => {
    if (!billings.current || billings.current.length === 0) {
      actions.setSubmitting(false);
      return;
    }
    if (!isValidPhoneNumber(values.contract[1].value)) {
      totast({
        title: t('orders.phoneValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return;
    }
    if (!isValidCNTaxNumber(values.details[1].value)) {
      totast({
        title: t('orders.taxNumberValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return;
    }
    if (!isValidEmail(values.contract[2].value)) {
      totast({
        title: t('orders.emailValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return;
    }
    if (!isValidBANKAccount(values.details[3].value)) {
      totast({
        title: t('orders.bankAccountValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return;
    }
    try {
      const result = await request.post<any, { status: boolean }, ReqGenInvoice>(
        '/api/invoice/verify',
        {
          billings: billings.current!,
          detail: {
            title: values.details[0].value,
            tax: values.details[1].value,
            bank: values.details[2].value,
            bankAccount: values.details[3].value,
            address: values.details[4].value,
            phone: values.details[5].value,
            fax: values.details[6].value
          },
          contract: {
            person: values.contract[0].value,
            email: values.contract[2].value,
            phone: values.contract[1].value,
            code: values.contract[3].value
          }
        }
      );

      totast({
        title: t('orders.submit success'),
        status: 'success',
        position: 'top',
        duration: 2000
      });
      onSuccess();
    } catch (err) {
      totast({
        title: (err as { message: string }).message || t('orders.submit fail'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
    } finally {
      actions.setSubmitting(false);
    }
  };
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Formik initialValues={initVal} onSubmit={submit}>
        {(props) => (
          <FieldArray
            name="details"
            render={(arrayHelper) => (
              <Form>
                <Flex mr="24px" align={'center'}>
                  <Button variant={'unstyled'} onClick={backcb}>
                    <Img
                      src={arrow_icon.src}
                      transform="rotate(-90deg)"
                      w={'24px'}
                      h={'24px'}
                      mr={'18px'}
                      dropShadow={'#24282C'}
                    ></Img>
                  </Button>
                  <Heading size="lg">{t('SideBar.CreateInvoice')}</Heading>
                  <Button
                    variant={'unstyled'}
                    display="flex"
                    justifyContent={'center'}
                    alignContent={'center'}
                    bg="#24282C"
                    borderRadius="4px"
                    color={'white'}
                    fontWeight="500"
                    fontSize="14px"
                    _hover={{
                      opacity: '0.5'
                    }}
                    px="36px"
                    py="10px"
                    ml="auto"
                    isLoading={props.isSubmitting}
                    type="submit"
                  >
                    {t('orders.invoice')}
                  </Button>
                </Flex>
                <Stack
                  borderColor="#DEE0E2"
                  borderWidth={'1px'}
                  borderRadius={'4px'}
                  mx="auto"
                  mt={'22px'}
                  minW="540px"
                  maxW={'970px'}
                  overflow="hidden"
                >
                  <Flex bg={'#F4F6F8'} py="15px" pl={'42px'} align="center">
                    <Img src={artical_icon.src}></Img>
                    <Text ml={'8px'}>{t('orders.Invoice Details')}</Text>
                    <Text ml={'auto'}>{t('orders.invoiceAmount')}</Text>
                    <Text color="rgba(29, 140, 220, 1)">￥ {invoiceAmount}</Text>
                    <Button
                      display={'flex'}
                      variant={'unstyled'}
                      mr="22px"
                      ml={'6px'}
                      fontWeight={'500'}
                      alignItems={'center'}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpen();
                      }}
                    >
                      <Text px={'5px'}>{totalTips()}</Text>
                      <Img src={arrow_right.src} w={'16px'} h="16px" ml={'2px'}></Img>
                    </Button>
                  </Flex>

                  <Stack px="22px" pt="21px" pb="24px" mt={'0'}>
                    <Flex
                      maxWidth={'420px'}
                      flexBasis="100%"
                      align={'center'}
                      mx="20px"
                      h={'32px'}
                      mt="0px"
                    >
                      <Text minWidth={'max-content'}>{t('orders.Invoice Content')}</Text>
                      <Text ml="auto" variant="unstyled" width={'280px'} color={'#5A646E'}>
                        {t('orders.Electronic Computer Service Fee')}
                      </Text>
                    </Flex>
                    <Flex wrap={'wrap'} align="center" my={'0px'} mt="0px">
                      {props.values.details.map((item, index) => (
                        <Field key={index} name={`details.${index}.value`}>
                          {
                            // @ts-ignore
                            ({ field }) => (
                              <FormControl
                                isRequired={item.isRequired}
                                display="flex"
                                flex={'1'}
                                maxW={'420px'}
                                flexShrink={'0'}
                                alignItems="center"
                                mx={'20px'}
                                mt="24px"
                                minW={'max-content'}
                              >
                                <FormLabel mb={'0'}>{item.name}</FormLabel>
                                <Input
                                  {...field}
                                  placeholder={item.placeholder}
                                  variant="unstyled"
                                  width={'280px'}
                                  ml="auto"
                                  p="8px"
                                  h={'32px'}
                                  border="1px solid #DEE0E2"
                                  borderRadius={'2px'}
                                  _focus={{
                                    borderColor: 'blue'
                                  }}
                                  bg="#FBFBFC"
                                />
                              </FormControl>
                            )
                          }
                        </Field>
                      ))}
                    </Flex>
                  </Stack>
                </Stack>
                <Stack
                  borderColor="#DEE0E2"
                  borderWidth={'1px'}
                  mt="16px"
                  borderRadius={'4px'}
                  mx="auto"
                  maxW={'970px'}
                  minW={'540px'}
                  overflow="hidden"
                >
                  <Flex bg={'#F4F6F8'} py="15px" pl={'42px'}>
                    <Img src={email_icon.src}></Img>

                    <Text ml={'8px'}>{t('orders.Contact Information')}</Text>
                  </Flex>

                  <Flex wrap={'wrap'} align="center" px="22px" pb="21px">
                    {props.values.contract.map((item, index) => (
                      <Field key={index} name={`contract.${index}.value`}>
                        {
                          // @ts-ignore
                          ({ field }) => (
                            <FormControl
                              isRequired={item.isRequired}
                              display="flex"
                              flex={'1'}
                              maxWidth="420px"
                              flexShrink={'0'}
                              alignItems="center"
                              mx={'20px'}
                              mt="24px"
                              minW={'max-content'}
                            >
                              <FormLabel>{item.name}</FormLabel>
                              {index === 1 ? (
                                <InputGroup
                                  variant={'unstyled'}
                                  width={'280px'}
                                  ml="auto"
                                  h={'32px'}
                                  px="8px"
                                  border="1px solid #DEE0E2"
                                  borderRadius={'2px'}
                                  _focusWithin={{
                                    borderColor: 'blue'
                                  }}
                                >
                                  <Input
                                    type="tel"
                                    variant={'unstyled'}
                                    placeholder={item.placeholder}
                                    {...field}
                                    h={'30px'}
                                    bg="#FBFBFC"
                                  />
                                  <InputRightAddon color="#219BF4">
                                    {remainTime <= 0 ? (
                                      <Link
                                        href=""
                                        onClick={(e) => {
                                          e.preventDefault();
                                          getCode(item.value);
                                        }}
                                      >
                                        {t('Get Code')}
                                      </Link>
                                    ) : (
                                      <Text>{remainTime} s</Text>
                                    )}
                                  </InputRightAddon>
                                </InputGroup>
                              ) : (
                                <Input
                                  {...field}
                                  placeholder={item.placeholder}
                                  variant="unstyled"
                                  width={'280px'}
                                  ml="auto"
                                  p="8px"
                                  h={'32px'}
                                  bg="#FBFBFC"
                                  border="1px solid #DEE0E2"
                                  borderRadius={'2px'}
                                  _focus={{
                                    borderColor: 'blue'
                                  }}
                                ></Input>
                              )}
                            </FormControl>
                          )
                        }
                      </Field>
                    ))}
                  </Flex>
                </Stack>
              </Form>
            )}
          />
        )}
      </Formik>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <BillingModal
          billings={billings}
          t={t}
          invoiceAmount={invoiceAmount}
          invoiceCount={invoiceCount}
        />
      </Modal>
    </>
  );
}

export default InvoicdForm;
