import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ModalBody,
  ModalCloseButton,
  BoxProps,
  Flex,
  Input,
  ModalFooter,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  Text,
  Stack,
  Link,
  Divider,
  InputGroup,
  InputRightElement,
  Tag,
  Th,
  TableContainer,
  Td,
  Table,
  Tr,
  Thead,
  Tbody,
  useDisclosure,
  Alert,
  AlertDescription
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRequest } from '@/hooks/useRequest';
import { postAuthCname } from '@/api/platform';
import {
  DOMAIN_BINDING_DOCUMENTATION_LINK,
  DOMAIN_REG_QUERY_LINK,
  INFRASTRUCTURE_PROVIDER,
  REQUIRES_DOMAIN_REG
} from '@/store/static';
import NextLink from 'next/link';
import { BookOpen, CheckCircle, Copy } from 'lucide-react';
import { DomainNotBoundModal } from './DomainNotBoundModal';
import { getErrText, useCopyData } from '@/utils/tools';
import { useToast } from '@/hooks/useToast';

export type CustomAccessModalParams = {
  publicDomain: string;
  currentCustomDomain: string;
  domain: string;
};

const CustomAccessModal = ({
  publicDomain,
  currentCustomDomain,
  domain,
  onClose,
  onSuccess
}: CustomAccessModalParams & { onClose: () => void; onSuccess: (e: string) => void }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { toast } = useToast();

  const notBoundDisclosure = useDisclosure();

  const [processPhase, setProcessPhase] = useState<'INPUT_DOMAIN' | 'VERIFY_DOMAIN' | 'SUCCESS'>(
    'INPUT_DOMAIN'
  );
  const [customDomain, setCustomDomain] = useState(currentCustomDomain);

  const { mutate: authCNAME, isLoading } = useRequest({
    mutationFn: async (silent: boolean) => {
      const result = await postAuthCname({
        publicDomain: completePublicDomain,
        customDomain: customDomain
      }).catch((error) => {
        return {
          error
        };
      });

      return {
        error: result?.error,
        customDomain,
        silent
      };
    },
    onSuccess: (data) => {
      if (data?.error) {
        if (!data?.silent) {
          toast({
            title:
              t('domain_cname_verify_failed_toast') +
              ': ' +
              (data?.error?.error?.message ?? data?.error?.message ?? data?.error),
            status: 'error'
          });
        }

        return;
      }

      onSuccess(data.customDomain);
      setProcessPhase('SUCCESS');
    }
  });

  useEffect(() => {
    if (processPhase === 'VERIFY_DOMAIN') {
      const interval = setInterval(() => {
        authCNAME(undefined);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [processPhase, authCNAME]);

  const tableCellStyles: BoxProps = {
    textTransform: 'none',
    borderColor: 'gray.200',
    paddingX: '12px',
    paddingY: '8px',
    fontSize: '14px'
  };

  const completePublicDomain = useMemo(() => `${publicDomain}.${domain}`, [publicDomain, domain]);

  return (
    <>
      <Modal
        isOpen
        onClose={() => {
          if (
            processPhase !== 'SUCCESS' &&
            // Do not open the warning modal if not touched.
            customDomain !== currentCustomDomain
          ) {
            notBoundDisclosure.onOpen();
          } else {
            onClose();
          }
        }}
        lockFocusAcrossFrames={false}
      >
        <ModalOverlay />
        <ModalContent maxH={'90vh'} maxW={'90vw'} width={'587px'}>
          <ModalHeader>{t('Custom Domain')}</ModalHeader>
          <ModalBody>
            <ModalCloseButton />

            <Box fontWeight={'bold'} mb={2}>
              {t('custom_domain_input_title')}
            </Box>

            {/* Tips */}
            {REQUIRES_DOMAIN_REG ? (
              <Stack>
                <Text>
                  {t('domain_requires_registration_tip_1')}
                  <Text as={'b'}>
                    {t('infrastructure.providers.' + INFRASTRUCTURE_PROVIDER + '.name')}
                  </Text>
                  {t('domain_requires_registration_tip_2')}
                </Text>

                <Stack direction={'row'} height={'24px'}>
                  <Link
                    as={NextLink}
                    target="_blank"
                    color={'brightBlue.600'}
                    href={t(
                      'infrastructure.providers.' + INFRASTRUCTURE_PROVIDER + '.domain_reg_link'
                    )}
                  >
                    {t('domain_registration_provider_link_text')}
                  </Link>

                  <Divider orientation="vertical" />

                  <Link
                    as={NextLink}
                    target="_blank"
                    color={'brightBlue.600'}
                    href={DOMAIN_REG_QUERY_LINK}
                  >
                    {t('domain_registration_query_link_text')}
                  </Link>
                </Stack>
              </Stack>
            ) : (
              <Text>{t('domain_input_tip')}</Text>
            )}

            {/* Your Domain */}
            <Stack direction={'row'} mt={4}>
              <InputGroup>
                <Input
                  width={'100%'}
                  value={customDomain}
                  onChange={(e) => {
                    if (processPhase === 'INPUT_DOMAIN') {
                      const normalizedDomain = e.target.value.trim().toLowerCase();
                      setCustomDomain(normalizedDomain);
                    }
                  }}
                  bg={'#F7F8FA'}
                  borderColor={'#E8EBF0'}
                  style={{
                    pointerEvents: processPhase !== 'INPUT_DOMAIN' ? 'none' : 'auto'
                  }}
                  placeholder={t('Input your custom domain') || 'Input your custom domain'}
                />

                {processPhase !== 'INPUT_DOMAIN' && (
                  <InputRightElement width={'auto'} mr={3}>
                    {processPhase === 'VERIFY_DOMAIN' && (
                      <Tag
                        size={'sm'}
                        colorScheme={'red'}
                        variant={'outline'}
                        bg={'#FEF3F2'}
                        boxShadow={'0px 0px 0px 0.5px #FECDCA'}
                        color={'#D92D20'}
                        borderRadius={'full'}
                        px={2}
                      >
                        {t('domain_verification_needed')}
                      </Tag>
                    )}
                    {processPhase === 'SUCCESS' && (
                      <Tag
                        size={'sm'}
                        variant={'outline'}
                        bg={'#EDFBF3'}
                        boxShadow={'0px 0px 0px 0.5px #A6EDC3'}
                        color={'#039855'}
                        borderRadius={'full'}
                        px={2}
                      >
                        <CheckCircle size={14} />
                        <Text ml={1}>{t('domain_verified')}</Text>
                      </Tag>
                    )}
                  </InputRightElement>
                )}
              </InputGroup>

              {processPhase === 'INPUT_DOMAIN' ? (
                <>
                  {currentCustomDomain && (
                    <Button
                      variant={'outline'}
                      height={'32px'}
                      onClick={() => {
                        setCustomDomain('');
                        onSuccess('');
                        onClose();
                      }}
                    >
                      {t('domain_verification_input_clear')}
                    </Button>
                  )}

                  <Button
                    height={'32px'}
                    onClick={() => {
                      setProcessPhase('VERIFY_DOMAIN');
                      authCNAME(true);
                    }}
                  >
                    {t('domain_verification_input_save')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={'secondary'}
                    height={'32px'}
                    fontWeight={'normal'}
                    onClick={() => authCNAME(false)}
                    isLoading={isLoading}
                  >
                    {t('domain_verification_refresh')}
                  </Button>
                  <Button
                    variant={'secondary'}
                    height={'32px'}
                    fontWeight={'normal'}
                    onClick={() => {
                      setProcessPhase('INPUT_DOMAIN');
                    }}
                    disabled={isLoading}
                  >
                    {t('domain_verification_input_edit')}
                  </Button>
                </>
              )}
            </Stack>

            {/* DNS Records */}
            {processPhase !== 'INPUT_DOMAIN' && (
              <Stack
                mt={4}
                padding={4}
                gap={0}
                borderWidth={1}
                borderRadius={'md'}
                borderStyle={'dashed'}
                borderColor={'gray.400'}
              >
                <Text fontSize={'16px'} fontWeight={'semibold'}>
                  {t('domain_verification_dns_records')}
                </Text>

                <Text mt={2}>
                  {t('domain_verification_dns_records_tip_1')}
                  <Text as={'b'}>{completePublicDomain}</Text>
                  {t('domain_verification_dns_records_tip_2')}
                </Text>

                <TableContainer mt={4} borderRadius={'lg'} borderWidth={1} borderColor={'gray.200'}>
                  <Table variant="unstyled">
                    <Thead color={'gray.500'} borderBottomWidth={1} borderColor={'gray.200'}>
                      <Tr>
                        <Th {...tableCellStyles} borderRightWidth={1}>
                          {t('domain_verification_dns_records_type')}
                        </Th>
                        <Th {...tableCellStyles} borderRightWidth={1}>
                          {t('domain_verification_dns_records_ttl')}
                        </Th>
                        <Th {...tableCellStyles}>{t('domain_verification_dns_records_value')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td {...tableCellStyles} borderRightWidth={1}>
                          {t('domain_verification_dns_records_type_cname')}
                        </Td>
                        <Td {...tableCellStyles} borderRightWidth={1}>
                          {t('domain_verification_dns_records_ttl_auto')}
                        </Td>
                        <Td
                          {...tableCellStyles}
                          cursor={'pointer'}
                          onClick={() => {
                            copyData(completePublicDomain);
                          }}
                        >
                          <Flex alignItems={'center'} justifyContent={'space-between'} gap={2}>
                            <Text>{completePublicDomain}</Text>
                            <Link color={'gray.500'}>
                              <Copy size={16} />
                            </Link>
                          </Flex>
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>

                {/* Refer to docs */}
                {DOMAIN_BINDING_DOCUMENTATION_LINK && (
                  <Stack direction={'row'} mt={4}>
                    <Link
                      as={NextLink}
                      target="_blank"
                      href={DOMAIN_BINDING_DOCUMENTATION_LINK}
                      color={'brightBlue.600'}
                      display={'flex'}
                      alignItems={'center'}
                      gap={2}
                    >
                      <BookOpen size={16} />
                      <Text>{t('domain_verification_dns_records_docs_link_text')}</Text>
                    </Link>
                  </Stack>
                )}
              </Stack>
            )}
          </ModalBody>

          {processPhase === 'SUCCESS' && (
            <ModalFooter>
              <Alert
                variant="subtle"
                borderRadius={'lg'}
                w={'100%'}
                borderWidth={1}
                borderColor={'#039855'}
                bg={'#EDFBF3'}
              >
                <AlertDescription textColor={'#059669'} fontWeight={'medium'} w={'full'}>
                  <Flex alignItems={'center'} justifyContent={'center'} gap={2}>
                    <CheckCircle size={16} />
                    {t('domain_verification_success')}
                  </Flex>
                </AlertDescription>
              </Alert>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      <DomainNotBoundModal
        isOpen={notBoundDisclosure.isOpen}
        onClose={notBoundDisclosure.onClose}
        onConfirm={() => {
          notBoundDisclosure.onClose();
          onClose();
        }}
      />
    </>
  );
};

export default CustomAccessModal;
