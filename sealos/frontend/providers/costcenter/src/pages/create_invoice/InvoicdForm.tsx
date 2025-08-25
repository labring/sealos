import { ApiResp, ReqGenInvoice } from '@/types';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber
} from '@/utils/tools';
import trigIcon from '@/assert/triangle.svg';
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
  Link,
  useToast,
  InputRightElement,
  Badge,
  Image
} from '@chakra-ui/react';
import {
  Formik,
  FieldArray,
  Form,
  Field,
  FieldInputProps,
  ErrorMessage,
  FormikErrors
} from 'formik';
import request from '@/service/request';
import { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import artical_icon from '@/assert/article.svg';
import arrow_icon from '@/assert/left2.svg';
import email_icon from '@/assert/mdi_email-receive-outline.svg';
import { MySelect, MyTooltip as STooltip } from '@sealos/ui';
import { formatMoney } from '@/utils/format';
import uil_info_circle from '@/assert/uil_info-circle.svg';
import { TriangleUpIcon } from '@chakra-ui/icons';

function MyTooltip({ errorMessage, children }: { errorMessage: string; children: ReactNode }) {
  return (
    <STooltip
      // marginLeft={'200px'}
      offset={[20, 10]}
      px={'12px'}
      py={'9px'}
      label={
        <Flex alignItems={'center'}>
          <Image src={trigIcon.src} alt="!!!" boxSize={'16px'} mr={'4px'} />
          <Text fontSize="12px" fontWeight="500">
            {errorMessage}
          </Text>
        </Flex>
      }
      isDisabled={!errorMessage}
      isOpen={!!errorMessage}
    >
      {children}
    </STooltip>
  );
}
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
  billings: ReqGenInvoice['billings'];
}) {
  const totast = useToast();
  const { t, i18n } = useTranslation();
  const initVal = {
    details: [
      {
        name: t('orders.details.type.name'),
        placeholder: t('orders.details.type.placeholder'),
        isRequired: true,
        value: 'normal'
      },
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
  const typeList = [
    {
      label: t('orders.details.type.list.normal'),
      value: 'normal'
    },
    {
      label: t('orders.details.type.list.special'),
      value: 'special'
    }
  ];
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
    if (!billings || billings.length === 0) {
      actions.setSubmitting(false);
      return;
    }
    try {
      const result = await request.post<any, { status: boolean }, ReqGenInvoice>(
        '/api/invoice/verify',
        {
          token: '',
          billings: billings!,
          detail: {
            title: values.details[1].value,
            tax: values.details[2].value,
            bank: values.details[3].value,
            bankAccount: values.details[4].value,
            address: values.details[5].value,
            phone: values.details[6].value,
            fax: values.details[7].value,
            type: values.details[0].value
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
      backcb();
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
  return (
    <>
      <Formik
        initialValues={initVal}
        onSubmit={submit}
        validateOnChange={false}
        validateOnMount={false}
        validate={(values) => {
          const errors = {
            contract: [],
            details: []
          };
          for (let index = 0; index < values.details.length; index++) {
            const element = values.details[index];
            if (element.isRequired && !element.value) {
              errors.details[index] = t('orders.require');
              return errors;
            }
            if (index === 2 && !isValidCNTaxNumber(element.value)) {
              errors.details[2] = t('orders.taxNumberValidation');
              return errors;
            }
            if (index === 4 && !isValidBANKAccount(element.value)) {
              errors.details[4] = t('orders.bankAccountValidation');
              return errors;
            }
          }
          for (let index = 0; index < values.contract.length; index++) {
            const element = values.contract[index];
            if (element.isRequired && !element.value) {
              errors.contract[index] = t('orders.require');
              return errors;
            }
            if (index === 1 && !isValidPhoneNumber(element.value)) {
              errors.contract[index] = t('orders.phoneValidation');
              return errors;
            }
            if (index === 2 && !isValidEmail(element.value)) {
              errors.contract[index] = t('orders.emailValidation');
              return errors;
            }
          }
        }}
      >
        {({ errors, isSubmitting, values, setFieldValue }) => (
          <FieldArray
            name="details"
            render={() => (
              <Form>
                <Flex mr="24px" align={'center'}>
                  <Button
                    variant={'unstyled'}
                    onClick={backcb}
                    minH={'0'}
                    minW={'0'}
                    boxSize="36px"
                  >
                    <Img
                      src={arrow_icon.src}
                      w={'24px'}
                      h={'24px'}
                      mr={'18px'}
                      dropShadow={'#24282C'}
                    ></Img>
                  </Button>
                  <Heading size="lg">{t('SideBar.CreateInvoice')}</Heading>
                  <Flex
                    align={'center'}
                    ml={'auto'}
                    bgColor={'brightBlue.50'}
                    color={'brightBlue.600'}
                    px={'12px'}
                    py={'6px'}
                    borderRadius={'6px'}
                  >
                    <Img src={uil_info_circle.src} w={'18px'} h="18px" mr={'5px'}></Img>
                    <Text fontWeight="500" fontSize="11px" color="brightBlue.600">
                      {t('orders.Apply Inovice Tips')}
                    </Text>
                  </Flex>
                  <Button
                    variant={'solid'}
                    ml="12px"
                    isLoading={isSubmitting}
                    type="submit"
                    px={'20px'}
                    py={'8px'}
                    h={'auto'}
                  >
                    {t('orders.Apply Invoice')}
                  </Button>
                </Flex>
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
                    <Img src={artical_icon.src} boxSize={'24px'}></Img>
                    <Text ml={'8px'} fontSize={'18px'}>
                      {t('orders.Invoice Details')}
                    </Text>
                    <Text ml={'auto'} fontSize={'14px'}>
                      {t('orders.invoiceAmount')}:
                    </Text>
                    <Text ml="10px" color="brightBlue.600">
                      ￥ {formatMoney(invoiceAmount)}
                    </Text>
                  </Flex>

                  <Stack px="48px" py="24px" mt={'0'} fontSize={'12px'}>
                    <Flex wrap={'wrap'} align="center" my={'0px'} mt="0px" gap="20px">
                      <Flex
                        display="flex"
                        flex={'1'}
                        maxW={'420px'}
                        flexShrink={'0'}
                        alignItems="center"
                        minW={'max-content'}
                        fontWeight={'500'}
                      >
                        <FormLabel mb={'0'} w="100px" color={'grayModern.900'} fontWeight={500}>
                          {t('orders.Invoice Content')}
                        </FormLabel>
                        <Flex
                          // variant="unstyled"
                          color={'grayModern.600'}
                          width={'280px'}
                          ml="auto"
                          p="8px"
                          _focus={{
                            borderColor: 'blue'
                          }}
                        >
                          {t('orders.Electronic Computer Service Fee')}
                        </Flex>
                      </Flex>

                      {values.details.map((item, index) => {
                        const name = `details.${index}.value`;
                        const errorMessage = (errors.details?.[index] || '') as string;
                        return (
                          <Field key={index} name={name} fontSize={'12px'}>
                            {({ field }: { field: FieldInputProps<string> }) => (
                              <MyTooltip errorMessage={errorMessage}>
                                <FormControl
                                  // isRequired={item.isRequired}
                                  display="flex"
                                  flex={'1'}
                                  maxW={'420px'}
                                  flexShrink={'0'}
                                  alignItems="center"
                                  minW={'max-content'}
                                  isInvalid={!!errors?.details?.[index]}
                                >
                                  <FormLabel mb={'0'} color={'grayModern.900'} fontWeight={500}>
                                    {item.name}
                                  </FormLabel>
                                  {index === 0 ? (
                                    <Flex ml={'auto'} fontSize={'12px'} fontWeight={500}>
                                      <MySelect
                                        list={typeList}
                                        value={field.value}
                                        onchange={(val) => {
                                          setFieldValue(name, val);
                                        }}
                                        w={'280px'}
                                        h={'32px'}
                                        fontWeight={400}
                                      />
                                    </Flex>
                                  ) : (
                                    <Input
                                      {...field}
                                      _invalid={{
                                        border: '1px solid #D92D20',
                                        boxShadow: '0px 0px 0px 2.4px #D92D2026'
                                      }}
                                      placeholder={item.placeholder}
                                      variant="outline"
                                      width={'280px'}
                                      ml="auto"
                                    />
                                  )}
                                </FormControl>
                              </MyTooltip>
                            )}
                          </Field>
                        );
                      })}
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
                  <Flex wrap={'wrap'} align="center" px="48px" py="24px" gap={'20px'}>
                    {values.contract.map((item, index) => {
                      const errorMessage = (errors.contract?.[index] || '') as string;
                      return (
                        <Field key={index} name={`contract.${index}.value`}>
                          {
                            // @ts-ignore
                            ({ field }) => (
                              <MyTooltip errorMessage={errorMessage}>
                                <FormControl
                                  // isRequired={item.isRequired}
                                  display="flex"
                                  flex={'1'}
                                  maxWidth="420px"
                                  flexShrink={'0'}
                                  alignItems="center"
                                  minW={'max-content'}
                                  isInvalid={!!errors?.contract?.[index]}
                                >
                                  <FormLabel mb={'0'}>{item.name}</FormLabel>
                                  {index === 1 ? (
                                    <InputGroup
                                      variant={'outline'}
                                      width={'280px'}
                                      ml="auto"
                                      h={'32px'}
                                    >
                                      <Input
                                        type="tel"
                                        placeholder={item.placeholder}
                                        {...field}
                                        // css={{
                                        // 	':focus:invalid': {
                                        // 		'border': '1px solid #D92D20',
                                        // 		'box-shadow': '0px 0px 0px 2.4px #D92D2026'
                                        // 	}
                                        // }}
                                        // {...(errors?.contract?.[index] ? {
                                        // 	// _focus: {
                                        // 		'border': '1px solid #D92D20',
                                        // 		'boxShadow': '0px 0px 0px 2.4px #D92D2026'
                                        // 	// }
                                        // } : {})}
                                        _invalid={{
                                          border: '1px solid #D92D20',
                                          boxShadow: '0px 0px 0px 2.4px #D92D2026'
                                        }}
                                      />
                                      <InputRightElement
                                        color="brightBlue.600"
                                        width={'auto'}
                                        p={'8px'}
                                        right={'3px'}
                                      >
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
                                      </InputRightElement>
                                    </InputGroup>
                                  ) : (
                                    <Input
                                      {...field}
                                      isInvalid={!!errors.contract?.[index]}
                                      css={{
                                        ':focus:invalid': {
                                          border: '1px solid #D92D20',
                                          'box-shadow': '0px 0px 0px 2.4px #D92D2026'
                                        }
                                      }}
                                      placeholder={item.placeholder}
                                      variant="outline"
                                      width={'280px'}
                                      ml="auto"
                                    />
                                  )}
                                </FormControl>
                              </MyTooltip>
                            )
                          }
                        </Field>
                      );
                    })}
                  </Flex>
                </Stack>
              </Form>
            )}
          />
        )}
      </Formik>
    </>
  );
}

export default InvoicdForm;
