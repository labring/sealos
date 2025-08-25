import { regionList as getRegionList } from '@/api/auth';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, Region } from '@/types';
import { AccessTokenPayload } from '@/types/token';
import {
  Box,
  Center,
  Divider,
  Flex,
  HStack,
  Img,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useConfigStore } from '@/stores/config';
import { CheckIcon, ChevronDown } from 'lucide-react';
import { I18nCloudProvidersKey } from '@/types/i18next';

export default function RegionToggle() {
  const { setWorkSpaceId, session } = useSessionStore();
  const { cloudConfig } = useConfigStore();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data } = useQuery(['regionlist'], getRegionList, {
    cacheTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
  const regionList = useMemo(() => data?.data?.regionList || [], [data]);
  const token = useSessionStore((s) => s.token);
  const curRegionUid = useMemo(() => {
    try {
      return jwtDecode<AccessTokenPayload>(token).regionUid;
    } catch {
      return undefined;
    }
  }, [token]);
  const curRegion = regionList.find((r) => r.uid === curRegionUid);

  const handleCick = async (region: Region) => {
    setWorkSpaceId(session?.user?.ns_uid || '');
    const target = new URL(
      cloudConfig?.proxyDomain
        ? `https://${cloudConfig?.proxyDomain}/switchRegion`
        : `https://${region.domain}/switchRegion`
    );
    const res = await request.get<any, ApiResp<{ token: string }>>('/api/auth/globalToken');
    const token = res?.data?.token;
    if (!token) return;
    target.searchParams.append('token', token);
    target.searchParams.append('regionId', region.uid);
    target.searchParams.append('regionDomain', region.domain);
    await router.replace(target);
  };

  return (
    <Box>
      {regionList?.length > 1 && (
        <Popover placement="bottom-start" isLazy>
          {({ isOpen }) => (
            <>
              <PopoverTrigger>
                <HStack position={'relative'} tabIndex={0}>
                  <HStack
                    w={'full'}
                    fontSize={'14px'}
                    color={'primary'}
                    fontWeight={'500'}
                    minH={'36px'}
                    cursor={'pointer'}
                    userSelect={'none'}
                    position={'relative'}
                    gap={'8px'}
                    _hover={{
                      bg: 'secondary'
                    }}
                    bg={isOpen ? 'secondary' : ''}
                    borderRadius={'8px'}
                    pl={'12px'}
                    pr={'8px'}
                  >
                    <Text cursor={'pointer'}>{curRegion?.displayName}</Text>
                    <Center
                      transform={isOpen ? 'rotate(-90deg)' : 'rotate(0deg)'}
                      borderRadius={'4px'}
                      transition={'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'}
                    >
                      <ChevronDown size={16} color={'#525252'} />
                    </Center>
                  </HStack>
                </HStack>
              </PopoverTrigger>

              <PopoverContent width={'fit-content'}>
                <PopoverBody
                  cursor={'initial'}
                  borderRadius={'12px'}
                  p={'0'}
                  py={'8px'}
                  background={'#FFF'}
                  boxShadow={
                    '0px 20px 25px -5px rgba(0, 0, 0, 0.10), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }
                  color={'#18181B'}
                  width={'fit-content'}
                  transition={'all 0.2s ease-in-out'}
                >
                  <Text
                    px={'12px'}
                    py={'6px'}
                    color={'#71717A'}
                    fontSize={'12px'}
                    fontWeight={'500'}
                  >
                    {t('common:region')}
                  </Text>
                  <VStack alignItems={'stretch'} px={'8px'}>
                    {regionList.map((region) => {
                      const cpuPrice = region?.description?.prices?.find((p) => p.name === 'CPU');
                      return (
                        <Flex
                          border={'1px solid #E4E4E7'}
                          flexDirection={'column'}
                          fontSize={'14px'}
                          whiteSpace={'nowrap'}
                          borderRadius={'12px'}
                          py={'12px'}
                          px={'16px'}
                          key={region.uid}
                          onClick={() => {
                            handleCick(region);
                          }}
                          cursor={'pointer'}
                          _hover={{
                            bgColor: '#FAFAFA'
                          }}
                        >
                          <Flex justifyContent={'space-between'} alignItems={'center'}>
                            <Box>
                              <Text fontSize={'14px'} fontWeight={400} color={'#18181B'}>
                                {region?.displayName} {region?.description?.serial}
                              </Text>
                              {cpuPrice && (
                                <Text
                                  mt={'4px'}
                                  color={'#71717A'}
                                  fontSize={'12px'}
                                  whiteSpace={'nowrap'}
                                >
                                  {cpuPrice?.name} {cpuPrice?.unit_price || 0} {t('common:yuan')}/
                                  {t('common:core')}/{t('common:year')}
                                </Text>
                              )}
                            </Box>
                            {region.uid === curRegionUid && (
                              <CheckIcon size={16} color={'#1C4EF5'} />
                            )}
                          </Flex>
                          <Divider bg={'#F4F4F5'} my={'8px'} />
                          <Flex alignItems={'center'} flexDirection={{ base: 'column', sm: 'row' }}>
                            <Flex alignItems={'center'} gap={'4px'}>
                              {region?.description.provider &&
                                [
                                  'volcano_engine',
                                  'alibaba_cloud',
                                  'tencent_cloud',
                                  'google_cloud'
                                ].includes(region?.description.provider) && (
                                  <Img
                                    boxSize={'14px'}
                                    mr={'4px'}
                                    flexShrink={0}
                                    src={`/images/cloud_providers/${region?.description.provider}.svg`}
                                  ></Img>
                                )}
                              <Text color={'#71717A'}>
                                {t(region?.description?.provider as I18nCloudProvidersKey, {
                                  ns: 'cloudProviders'
                                })}
                              </Text>
                            </Flex>

                            <Divider
                              orientation={'vertical'}
                              h={'8px'}
                              bg={'#E4E4E7'}
                              mx={'8px'}
                              flexShrink={0}
                              display={{ base: 'none', sm: 'block' }}
                            />
                            <Text color={'#71717A'}>
                              {region?.description?.description?.[i18n.language as 'zh' | 'en']}
                            </Text>
                          </Flex>
                        </Flex>
                      );
                    })}
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </>
          )}
        </Popover>
      )}
    </Box>
  );
}
