import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  ModalBody,
  ModalCloseButton,
  BoxProps,
  Flex,
  useTheme,
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
  TableCaption,
  Tr,
  Thead,
  Tbody,
  Tfoot,
  useDisclosure,
  Alert,
  AlertDescription
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { CopyIcon, Tip } from '@sealos/ui';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useRequest } from '@/hooks/useRequest';
import { postAuthCname } from '@/api/platform';
import { SEALOS_USER_DOMAINS } from '@/store/static';
import NextLink from 'next/link';
import { BookOpen, CheckCircle, Copy } from 'lucide-react';
import { DomainNotBoundModal } from './DomainNotBoundModal';

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
  const theme = useTheme();
  const { t } = useTranslation();

  const notBoundDisclosure = useDisclosure();

  const [processPhase, setProcessPhase] = useState<'INPUT_DOMAIN' | 'VERIFY_DOMAIN' | 'SUCCESS'>(
    'INPUT_DOMAIN'
  );
  const [customDomain, setCustomDomain] = useState(currentCustomDomain);

  const { mutate: authCNAME, isLoading } = useRequest({
    mutationFn: async () => {
      await postAuthCname({
        publicDomain: completePublicDomain,
        customDomain: customDomain
      });
      return customDomain;
    },
    onSuccess: (data) => {
      onSuccess(data);
      setProcessPhase('SUCCESS');
    },
    errorToast: 'Custom Domain Error'
  });

  const titleStyles: BoxProps = {
    fontWeight: 'bold',
    mb: 2
  };

  const tableCellStyles: BoxProps = {
    textTransform: 'none',
    borderColor: 'gray.200',
    paddingX: '12px',
    paddingY: '8px',
    fontSize: '14px'
  };

  const completePublicDomain = useMemo(() => `${publicDomain}.${domain}`, [publicDomain, domain]);

  const cnameTips = useMemo(() => {
    return SEALOS_USER_DOMAINS.map((item) => `${publicDomain}.${item.name}`).join(` ${t('or')} `);
  }, [publicDomain, t]);

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
        <ModalContent maxH={'90vh'} maxW={'90vw'} width={'530px'}>
          <ModalHeader>{t('Custom Domain')}</ModalHeader>
          <ModalBody>
            <ModalCloseButton />

            <Box {...titleStyles}>{t('Custom Domain')}</Box>

            {/* Tips */}
            <Stack>
              <Text>
                Domain binding for this availability zone requires{' '}
                <Text as={'b'}>Alibaba Cloud</Text> registration.
              </Text>

              <Stack direction={'row'} height={'24px'}>
                <Link
                  as={NextLink}
                  target="_blank"
                  color={'brightBlue.600'}
                  href="https://beian.aliyun.com/pcContainer/selfEntity"
                >
                  Filling Entry
                </Link>

                <Divider orientation="vertical" />

                <Link
                  as={NextLink}
                  target="_blank"
                  color={'brightBlue.600'}
                  href="https://beian.miit.gov.cn/#/Integrated/index"
                >
                  Filling Qurey
                </Link>
              </Stack>
            </Stack>

            {/* Your Domain */}
            <Stack direction={'row'} mt={4}>
              <InputGroup>
                <Input
                  width={'100%'}
                  value={customDomain}
                  onChange={(e) => {
                    if (processPhase === 'INPUT_DOMAIN') {
                      setCustomDomain(e.target.value);
                    }
                  }}
                  bg={'myWhite.500'}
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
                        bg={'red.50'}
                        borderRadius={'full'}
                        px={2}
                      >
                        Verification Needed
                      </Tag>
                    )}
                    {processPhase === 'SUCCESS' && (
                      <Tag
                        size={'sm'}
                        colorScheme={'green'}
                        variant={'outline'}
                        bg={'green.50'}
                        borderRadius={'full'}
                        px={2}
                      >
                        <CheckCircle size={14} />
                        <Text ml={1}>Verified</Text>
                      </Tag>
                    )}
                  </InputRightElement>
                )}
              </InputGroup>

              {processPhase === 'INPUT_DOMAIN' ? (
                <Button
                  height={'32px'}
                  onClick={() => {
                    setProcessPhase('VERIFY_DOMAIN');
                  }}
                >
                  Save
                </Button>
              ) : (
                <>
                  <Button
                    variant={'secondary'}
                    height={'32px'}
                    fontWeight={'normal'}
                    onClick={authCNAME}
                    isLoading={isLoading}
                  >
                    Refresh
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
                    Edit
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
                  DNS Records
                </Text>

                <Text mt={2}>
                  Please add a CNAME record for your domain pointing
                  to pxgxodpbmdih.usw.sealos.io with your DNS provider. Once the DNS update takes
                  effect, you can bind your custom domain.
                </Text>

                <TableContainer mt={4} borderRadius={'lg'} borderWidth={1} borderColor={'gray.200'}>
                  <Table variant="unstyled">
                    <Thead color={'gray.500'} borderBottomWidth={1} borderColor={'gray.200'}>
                      <Tr>
                        <Th {...tableCellStyles} borderRightWidth={1}>
                          Type
                        </Th>
                        <Th {...tableCellStyles} borderRightWidth={1}>
                          TTL
                        </Th>
                        <Th {...tableCellStyles}>Value</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td {...tableCellStyles} borderRightWidth={1}>
                          CNAME
                        </Td>
                        <Td {...tableCellStyles} borderRightWidth={1}>
                          Auto
                        </Td>
                        <Td {...tableCellStyles}>
                          <Flex alignItems={'center'} justifyContent={'space-between'} gap={2}>
                            <Text>{completePublicDomain}</Text>
                            <Link
                              color={'gray.500'}
                              onClick={() => {
                                navigator.clipboard.writeText(completePublicDomain);
                              }}
                            >
                              <Copy size={16} />
                            </Link>
                          </Flex>
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>

                {/* Refer to docs */}
                <Stack direction={'row'} mt={4}>
                  <Link
                    as={NextLink}
                    target="_blank"
                    color={'brightBlue.600'}
                    href="docs"
                    display={'flex'}
                    alignItems={'center'}
                    gap={2}
                  >
                    <BookOpen size={16} />
                    <Text>Refer to documentation</Text>
                  </Link>
                </Stack>
              </Stack>
            )}
          </ModalBody>

          {processPhase === 'SUCCESS' && (
            <ModalFooter>
              <Alert
                status="success"
                variant="subtle"
                borderRadius={'lg'}
                w={'100%'}
                borderWidth={1}
                borderColor={'green.600'}
              >
                <AlertDescription textColor={'green.600'} fontWeight={'medium'} w={'full'}>
                  <Flex alignItems={'center'} justifyContent={'center'} gap={2}>
                    <CheckCircle size={16} />
                    Your domain has been successfully bound
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
