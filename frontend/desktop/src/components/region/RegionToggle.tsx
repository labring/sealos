import request from '@/services/request';
import { Box, Divider, HStack, Text, useDisclosure } from '@chakra-ui/react';
import { ExchangeIcon, InfoIcon, ProviderIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import useSessionStore from '@/stores/session';
import { useRouter } from 'next/router';
import { regionList as getRegionList } from '@/api/auth';
import { ApiResp, Region } from '@/types';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';

export default function RegionToggle() {
  const disclosure = useDisclosure();
  const { setWorkSpaceId, session } = useSessionStore();
  const { t, i18n } = useTranslation();
  const { t: providerT } = useTranslation('cloudProviders');
  const router = useRouter();
  const { data, isSuccess } = useQuery(['regionlist'], getRegionList);
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
    const target = new URL(`https://${region.domain}/switchRegion`);
    const res = await request.get<any, ApiResp<{ token: string }>>('/api/auth/globalToken');
    const token = res?.data?.token;
    if (!token) return;
    target.searchParams.append('token', token);
    await router.replace(target);
  };

  return (
    <>
      {regionList?.length > 1 && (
        <HStack
          // fix for blur
          position={'relative'}
        >
          <HStack
            borderRadius={'10px'}
            p={'8px 12px'}
            gap={'20px'}
            background={'rgba(244, 246, 248, 0.6)'}
            boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
            fontSize={'14px'}
            color={'#152539'}
            fontWeight={'500'}
            backdropFilter={'blur(8px)'}
            onClick={() => disclosure.onOpen()}
          >
            <Text>
              {providerT(curRegion?.location || '')} {curRegion?.description?.serial}
            </Text>
            <ExchangeIcon />
          </HStack>

          {disclosure.isOpen ? (
            <>
              <Box
                position={'fixed'}
                inset={0}
                zIndex={'998'}
                onClick={(e) => {
                  e.stopPropagation();
                  disclosure.onClose();
                }}
              ></Box>
              <Box position={'absolute'} inset={0} zIndex={'999'}>
                <Box
                  bgColor={'red'}
                  bg="rgba(255, 255, 255, 0.8)"
                  boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
                  position={'absolute'}
                  top="43px"
                  right={0}
                  cursor={'initial'}
                  borderRadius={'8px'}
                  p="20px"
                  backdropFilter={'blur(150px)'}
                >
                  <HStack gap={'12px'} alignItems={'stretch'}>
                    {regionList.map((region) => {
                      const cpuPrice = region?.description?.prices?.find((p) => p.name === 'CPU');
                      return (
                        <Box
                          bgColor={'rgba(255, 255, 255, 0.75)'}
                          borderRadius={'8px'}
                          // minW={'165px'}
                          // minH={'200px'}
                          py={'12px'}
                          key={region.uid}
                          {...(region.uid === curRegionUid
                            ? {
                                border: '1.5px solid #219BF4'
                              }
                            : {
                                async onClick() {
                                  await handleCick(region);
                                },
                                cursor: 'pointer',
                                _hover: {
                                  bgColor: 'rgba(255, 255, 255, 0.5)'
                                }
                              })}
                          // aspectRatio={'16/20'}
                        >
                          <Box px={'16px'} fontSize={'14px'} fontWeight={'500'}>
                            <Text color={'#152539'}>
                              {providerT(region?.location)} {region?.description?.serial}
                            </Text>
                            {cpuPrice && (
                              <Text color={'#0884DD'} whiteSpace={'nowrap'}>
                                {cpuPrice?.name} {cpuPrice?.unit_price || 0} {t('Yuan')}/{t('Core')}
                                /{t('Year')}
                              </Text>
                            )}
                          </Box>
                          <Divider color={'#0000000D'} my={'12px'} />
                          <Box px={'16px'} fontSize={'11px'} fontWeight={'500'}>
                            <HStack color={'#485264'} gap={'4px'} mb={'2px'}>
                              <ProviderIcon boxSize={'12px'} />
                              <Text>{providerT('Provider')}</Text>
                            </HStack>
                            <Text color={'#111824'} mb={'8px'}>
                              {providerT(region?.description?.provider)}
                            </Text>
                            <HStack color={'#485264'} gap={'4px'} mb={'2px'}>
                              <InfoIcon boxSize={'12px'} />
                              <Text>{t('Description')}</Text>
                            </HStack>
                            <Text color={'#111824'} lineHeight={'20px'}>
                              {region?.description?.description?.[i18n.language as 'zh' | 'en']}
                            </Text>
                          </Box>
                        </Box>
                      );
                    })}
                  </HStack>
                </Box>
              </Box>
            </>
          ) : null}
        </HStack>
      )}
    </>
  );
}
