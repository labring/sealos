import { applyLicense, checkLicenses, getLicenseByName, getLicenseRecord } from '@/api/license';
import { getClusterId, getPlatformEnv } from '@/api/platform';
import MyIcon from '@/components/Icon';
import { useToast } from '@/hooks/useToast';
import { decodeJWT } from '@/utils/crypto';
import download from '@/utils/downloadFIle';
import { serviceSideProps } from '@/utils/i18n';
import { formatTime } from '@/utils/tools';
import { getUserId } from '@/utils/user';
import {
  Box,
  Center,
  Divider,
  Flex,
  Image,
  Text,
  Textarea,
  VStack,
  HStack,
  Button,
  Grid,
  GridItem,
  useColorModeValue,
  Tag,
  TagLabel,
  Tooltip
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import yaml from 'js-yaml';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';

export default function LicenseApp() {
  const { t } = useTranslation();
  const [licenseInput, setLicenseInput] = useState('');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [purchaseLink, setPurchaseLink] = useState('');
  const [isClient, setIsClient] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const titleColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const queryClient = useQueryClient();

  const buildLicenseYaml = (input: string) => {
    const trimmed = input.trim();
    const userId = getUserId() || 'unknown';
    const licenseName = `${userId}-license-${formatTime(Date.now(), 'YYYYMMDDHHmmss')}`;
    const namespace = 'ns-admin';

    try {
      const parsed = yaml.load(trimmed) as Record<string, any> | string | undefined;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const licenseObj = parsed as Record<string, any>;
        if (licenseObj.kind === 'License' && licenseObj.apiVersion?.includes('license.sealos.io')) {
          licenseObj.metadata = licenseObj.metadata || {};
          licenseObj.metadata.name = licenseObj.metadata.name || licenseName;
          licenseObj.metadata.namespace = licenseObj.metadata.namespace || namespace;
          return {
            yamlStr: yaml.dump(licenseObj),
            name: licenseObj.metadata.name as string
          };
        }
      }
    } catch (err) {
      err;
    }

    const licenseObj = {
      apiVersion: 'license.sealos.io/v1',
      kind: 'License',
      metadata: {
        name: licenseName,
        namespace: namespace
      },
      spec: {
        token: trimmed,
        type: 'Cluster'
      },
      status: {}
    };

    return {
      yamlStr: yaml.dump(licenseObj),
      name: licenseName
    };
  };

  const extractToken = (input: string) => {
    const trimmed = input.trim();
    try {
      const parsed = yaml.load(trimmed) as Record<string, any> | string | undefined;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const token = (parsed as Record<string, any>)?.spec?.token;
        return typeof token === 'string' ? token : '';
      }
    } catch (err) {
      err;
    }
    return trimmed;
  };

  const licenseMutation = useMutation(['licenseMutation'], {
    mutationFn: async () => {
      const { yamlStr, name } = buildLicenseYaml(licenseInput);
      await applyLicense([yamlStr], 'create');
      return { name };
    },
    async onSuccess(result) {
      const licenseName = result?.name;
      if (!licenseName) return;
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let licenseResult: any;
      for (let i = 0; i < 3; i += 1) {
        try {
          licenseResult = await getLicenseByName({ name: licenseName });
        } catch (err) {
          licenseResult = undefined;
        }
        if (licenseResult?.status) break;
        await wait(800);
      }

      if (!licenseResult?.status) {
        await checkLicenses();
        toast({
          title: t('Go to the message center to see the results'),
          status: 'warning'
        });
      } else if (licenseResult.status.phase !== 'Active') {
        toast({
          title: licenseResult.status.reason,
          status: 'error'
        });
      } else {
        await checkLicenses();
        setLicenseInput('');
        toast({
          title: t('Activation Successful'),
          status: 'success'
        });
      }
      queryClient.invalidateQueries(['getLicenseActive']);
    },
    onError(error: { message?: string }) {
      if (error?.message && typeof error?.message === 'string') {
        toast({
          title: error.message,
          status: 'error'
        });
      }
    }
  });

  const { data: systemInfo } = useQuery(['getClusterId'], () => getClusterId(), {
    onSuccess(data) {
      getPlatformEnv()
        .then((res) => {
          const main = res.LICENSE_DOMAIN;
          const link = `https://${main}/cluster?systemId=${data?.systemId}&nodeCount=${data?.nodeCount}&totalCpu=${data?.totalCpu}&totalMemory=${data?.totalMemory}`;
          setPurchaseLink(link);
        })
        .catch((err) => {
          toast({
            position: 'top',
            status: 'error',
            description: 'Get system env error'
          });
        });
    },
    onError(err) {
      toast({
        position: 'top',
        status: 'error',
        description: t('Failed to obtain cluster ID, contact administrator')
      });
    }
  });

  const { data } = useQuery(
    ['getLicenseActive', page, pageSize],
    () => getLicenseRecord({ page: page, pageSize: pageSize }),
    {
      refetchInterval: 5000, // 每 5 秒自动刷新一次数据
      refetchOnWindowFocus: true // 窗口获得焦点时立即刷新
    }
  );

  const activeLicense = debounce(async () => {
    if (!licenseInput.trim()) {
      return toast({
        title: t('token does not exist'),
        status: 'error'
      });
    }
    const token = extractToken(licenseInput);
    if (token && data?.some((item) => item.spec.token === token)) {
      return toast({
        title: t('Duplicate token'),
        status: 'error'
      });
    }
    licenseMutation.mutate();
  }, 500);

  const downloadToken = (token: string) => {
    const result = Buffer.from(token, 'binary').toString('base64');
    download('token.txt', result);
  };

  const maxExpTime = useMemo(() => {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    if (data && data.length > 0) {
      const getExpirationTime = (license: (typeof data)[0]): number => {
        if (license.spec.token) {
          return decodeJWT(license.spec.token)?.exp || currentTimeInSeconds;
        } else if (license.status.expirationTime) {
          return Math.floor(new Date(license.status.expirationTime).getTime() / 1000);
        }
        return currentTimeInSeconds;
      };

      const maxItem = data.reduce((item, license) => {
        const maxTime = getExpirationTime(item);
        const currentTime = getExpirationTime(license);
        return currentTime > maxTime ? license : item;
      });
      return getExpirationTime(maxItem);
    } else {
      return currentTimeInSeconds;
    }
  }, [data]);

  const isActive = useMemo(() => {
    return data && data.length > 0 && maxExpTime > Math.floor(Date.now() / 1000);
  }, [data, maxExpTime]);

  return (
    <Flex w="100%" h="100%" bg="#F8FAFC" overflow="hidden">
      {/* Left Panel: Cluster Info Card */}
      <Center
        flex="1"
        display={{ base: 'none', lg: 'flex' }}
        p="40px"
        position="relative"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.100"
      >
        <Box position="relative" w="full" maxW="580px" transition="all 0.3s">
          <Image
            draggable="false"
            w="100%"
            src="/icons/license-bg.png"
            alt="license background"
            borderRadius="24px"
            boxShadow="2xl"
          />
          <VStack
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            spacing="24px"
            w="80%"
            p="40px"
            bg="rgba(255, 255, 255, 0.08)"
            backdropFilter="blur(16px)"
            borderRadius="20px"
            border="1px solid rgba(255, 255, 255, 0.1)"
            color="white"
            align="stretch"
          >
            <Box>
              <Text fontSize="24px" fontWeight="700">
                {t('cluster_info')}
              </Text>
            </Box>

            <Divider borderColor="rgba(255, 255, 255, 0.2)" />

            <Grid templateColumns="repeat(2, 1fr)" gap="24px">
              <GridItem>
                <Text fontSize="12px" opacity="0.6" mb="4px">
                  SYSTEM ID
                </Text>
                <Tooltip label={systemInfo?.systemId}>
                  <Text fontSize="16px" fontWeight="600" isTruncated>
                    {systemInfo?.systemId || '---'}
                  </Text>
                </Tooltip>
              </GridItem>
              <GridItem>
                <Text fontSize="12px" opacity="0.6" mb="4px">
                  NODES
                </Text>
                <Text fontSize="16px" fontWeight="600">
                  {systemInfo?.nodeCount || '0'}
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="12px" opacity="0.6" mb="4px">
                  WORKSPACES
                </Text>
                <Text fontSize="16px" fontWeight="600">
                  {systemInfo?.totalWorkspaces || '0'}
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="12px" opacity="0.6" mb="4px">
                  CPU
                </Text>
                <Text fontSize="16px" fontWeight="600">
                  {systemInfo?.totalCpu || '0'} Cores
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="12px" opacity="0.6" mb="4px">
                  MEMORY
                </Text>
                <Text fontSize="16px" fontWeight="600">
                  {systemInfo?.totalMemory || '0'} GB
                </Text>
              </GridItem>
            </Grid>

            <Divider borderColor="rgba(255, 255, 255, 0.2)" />

            <Button
              size="lg"
              h="52px"
              bg="white"
              color="blue.600"
              _hover={{ bg: 'gray.50', transform: 'translateY(-2px)' }}
              _active={{ bg: 'gray.100' }}
              fontWeight="700"
              fontSize="16px"
              borderRadius="12px"
              onClick={() => window.open(purchaseLink)}
            >
              {t('Purchase Tip')}
            </Button>
          </VStack>
          <Box position="absolute" bottom="24px" right="24px" opacity="0.6">
            <Image alt="sealos logo" src="/icons/license-sealos.svg" h="20px" />
          </Box>
        </Box>
      </Center>

      {/* Right Panel: Management & Records */}
      <Box flex="1" h="100%" display="flex" flexDirection="column" overflowY="auto">
        {/* Header */}
        <Flex
          position="sticky"
          top="0"
          zIndex="10"
          px={{ base: '24px', xl: '40px' }}
          py="20px"
          alignItems="center"
          justifyContent="space-between"
          bg="rgba(248, 250, 252, 0.8)"
          backdropFilter="blur(12px)"
          borderBottom="1px solid"
          borderColor="gray.100"
        >
          <VStack align="start" spacing="2px">
            <Text fontSize="20px" fontWeight="700" color="gray.900">
              {t('License Management')}
            </Text>
            <HStack spacing="6px">
              <Box w="6px" h="6px" borderRadius="full" bg={isActive ? 'green.500' : 'gray.400'} />
              <Text fontSize="12px" color="gray.500" fontWeight="500">
                {t('System Status')}:{' '}
                <Text as="span" color={isActive ? 'green.600' : 'gray.600'}>
                  {isActive ? t('Operational') : t('Not Activated')}
                </Text>
              </Text>
            </HStack>
          </VStack>
        </Flex>

        {/* Content */}
        <Box px={{ base: '24px', xl: '40px' }} py="32px">
          <VStack spacing="32px" align="stretch" maxW="800px" mx="auto">
            {/* Activation Form */}
            <Box
              bg="white"
              borderRadius="24px"
              p="32px"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.100"
            >
              <VStack align="start" spacing="20px">
                <HStack spacing="12px">
                  <Center w="40px" h="40px" bg="blue.50" borderRadius="12px">
                    <Image src="/icons/license.svg" w="22px" h="22px" alt="license icon" />
                  </Center>
                  <Box>
                    <Text fontSize="18px" fontWeight="700" color="gray.900">
                      {t('Activate License')}
                    </Text>
                    <Text fontSize="13px" color="gray.500">
                      {t('Paste license token or License YAML')}
                    </Text>
                  </Box>
                </HStack>

                <Box w="full" position="relative">
                  <Textarea
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder={t('Paste license token or License YAML')}
                    minH="180px"
                    p="16px"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="16px"
                    fontSize="14px"
                    _focus={{
                      bg: 'white',
                      borderColor: 'blue.500',
                      boxShadow: '0 0 0 1px #3182ce'
                    }}
                    fontFamily="mono"
                  />
                </Box>

                <Flex w="full" justify="space-between" align="center">
                  <Text fontSize="12px" color="gray.400">
                    {t('Supported formats: Base64 Token, YAML')}
                  </Text>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    px="32px"
                    borderRadius="12px"
                    isLoading={licenseMutation.isLoading}
                    onClick={activeLicense}
                    fontSize="14px"
                    fontWeight="600"
                  >
                    {t('Activate License')}
                  </Button>
                </Flex>
              </VStack>
            </Box>

            {/* Records Section */}
            <Box>
              <HStack justify="space-between" mb="16px" px="4px">
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('Activation Record')}
                </Text>
                {data && data.length > 0 && (
                  <Tag size="sm" variant="subtle" colorScheme="blue" borderRadius="full">
                    <TagLabel fontWeight="600">{data.length}</TagLabel>
                  </Tag>
                )}
              </HStack>

              {data && data.length > 0 ? (
                <VStack spacing="12px" align="stretch">
                  {data.map((item) => {
                    const hasToken = !!item.spec.token;
                    const tokenData =
                      hasToken && item.spec.token ? decodeJWT(item.spec.token) : null;
                    const iat = tokenData?.iat;
                    const exp = tokenData?.exp;
                    const activationTime =
                      hasToken && iat ? iat * 1000 : item.status.activationTime;
                    const expirationTime =
                      hasToken && exp ? exp * 1000 : item.status.expirationTime;

                    return (
                      <Box
                        key={item.metadata.uid}
                        bg="white"
                        p="20px"
                        borderRadius="16px"
                        border="1px solid"
                        borderColor="gray.100"
                        transition="all 0.2s"
                        _hover={{ borderColor: 'blue.200', boxShadow: 'md' }}
                      >
                        <Flex justify="space-between" align="start">
                          <HStack spacing="12px">
                            <Center w="36px" h="36px" bg="gray.50" borderRadius="10px">
                              <Image src="/icons/license.svg" w="18px" h="18px" alt="license" />
                            </Center>
                            <VStack align="start" spacing="2px">
                              <Text fontWeight="700" fontSize="15px" color="gray.900">
                                License
                              </Text>
                              <Text fontSize="12px" color="gray.500">
                                {hasToken
                                  ? `${t('Activation time')}: ${formatTime(activationTime)}`
                                  : `${t('expire_date')}: ${formatTime(expirationTime)}`}
                              </Text>
                            </VStack>
                          </HStack>
                          {hasToken && item.spec.token && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<MyIcon name="download" w="14px" h="14px" />}
                              onClick={() => downloadToken(item.spec.token!)}
                              fontSize="12px"
                              color="blue.600"
                            >
                              Download
                            </Button>
                          )}
                        </Flex>

                        {hasToken && (
                          <Box mt="16px" pt="16px" borderTop="1px dashed" borderColor="gray.100">
                            <Text
                              fontSize="12px"
                              fontWeight="700"
                              color="gray.400"
                              mb="10px"
                              textTransform="uppercase"
                              letterSpacing="wider"
                            >
                              {t('Resource Limit')}
                            </Text>
                            <Grid
                              templateColumns="repeat(auto-fill, minmax(120px, 1fr))"
                              gap="12px"
                            >
                              <RecordItem
                                label={t('CPU')}
                                value={`${tokenData?.data.totalCPU} ${t('Cores')}`}
                              />
                              <RecordItem
                                label={t('Memory')}
                                value={`${tokenData?.data.totalMemory} GB`}
                              />
                              <RecordItem label={t('Nodes')} value={tokenData?.data.nodeCount} />
                              <RecordItem label={t('Users')} value={tokenData?.data.userCount} />
                            </Grid>
                            <Flex mt="16px" justify="flex-end">
                              <Text
                                fontSize="12px"
                                fontWeight="600"
                                color="orange.500"
                                bg="orange.50"
                                px="10px"
                                py="4px"
                                borderRadius="full"
                              >
                                {t('expire_date')}: {formatTime(expirationTime)}
                              </Text>
                            </Flex>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              ) : (
                <Center
                  h="300px"
                  bg="white"
                  borderRadius="24px"
                  border="1px dashed"
                  borderColor="gray.200"
                >
                  <VStack spacing="12px">
                    <MyIcon name="noEvents" w="48px" h="48px" color="gray.300" />
                    <Text color="gray.400" fontSize="14px" fontWeight="500">
                      {t('No Record')}
                    </Text>
                  </VStack>
                </Center>
              )}
            </Box>
          </VStack>
        </Box>
      </Box>
    </Flex>
  );
}

function RecordItem({ label, value }: { label: string; value: any }) {
  return (
    <Box p="10px" bg="gray.50" borderRadius="10px">
      <Text fontSize="11px" color="gray.500" mb="2px" fontWeight="500">
        {label}
      </Text>
      <Text fontSize="14px" fontWeight="700" color="gray.900">
        {value}
      </Text>
    </Box>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}
