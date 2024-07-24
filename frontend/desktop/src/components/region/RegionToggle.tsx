import { regionList as getRegionList } from '@/api/auth';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, Region } from '@/types';
import { AccessTokenPayload } from '@/types/token';
import { Box, Divider, HStack, Text, useDisclosure } from '@chakra-ui/react';
import { InfoIcon, ProviderIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { DesktopExchangeIcon, ZoneIcon } from '../icons';
import { I18nCloudProvidersKey } from '@/types/i18next';

export default function RegionToggle() {
  const disclosure = useDisclosure();
  const { setWorkSpaceId, session } = useSessionStore();
  const { t, i18n } = useTranslation();
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
          mt={'8px'}
        >
          <HStack
            w={'full'}
            borderRadius={'100px'}
            p={'8px 12px'}
            background={'rgba(255, 255, 255, 0.07)'}
            _hover={{
              background: 'rgba(255, 255, 255, 0.15)'
            }}
            fontSize={'12px'}
            color={'white'}
            fontWeight={'500'}
            minH={'40px'}
            onClick={() => {
              disclosure.onOpen();
            }}
            cursor={'pointer'}
            userSelect={'none'}
          >
            <ZoneIcon />
            <Text>
              {t((curRegion?.location as I18nCloudProvidersKey) || 'beijing', {
                ns: 'cloudProviders'
              })}
              {curRegion?.description?.serial}
            </Text>
            <DesktopExchangeIcon ml={'auto'} />
          </HStack>

          {disclosure.isOpen ? (
            <Box position={'absolute'} right={0}>
              <Box
                position={'fixed'}
                inset={0}
                zIndex={'998'}
                onClick={(e) => {
                  e.stopPropagation();
                  disclosure.onClose();
                }}
              ></Box>
              <Box
                bg="rgba(22, 30, 40, 0.35)"
                boxShadow={'0px 15px 20px 0px rgba(0, 0, 0, 0.10)'}
                position={'absolute'}
                zIndex={999}
                top="43px"
                right={0}
                cursor={'initial'}
                borderRadius={'8px'}
                p="20px"
                backdropFilter={'blur(80px) saturate(150%)'}
              >
                <HStack gap={'12px'} alignItems={'stretch'}>
                  {regionList.map((region) => {
                    const cpuPrice = region?.description?.prices?.find((p) => p.name === 'CPU');
                    return (
                      <Box
                        whiteSpace={'nowrap'}
                        bg={'rgba(255, 255, 255, 0.10)'}
                        borderRadius={'8px'}
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
                                bgColor: 'rgba(255, 255, 255, 0.10)'
                              }
                            })}
                      >
                        <Box
                          px={'16px'}
                          fontSize={'14px'}
                          fontWeight={'500'}
                          pb={'10px'}
                          borderBottom={'1px solid rgba(0, 0, 0, 0.05)'}
                          mb={'12px'}
                        >
                          <Text color={'rgba(255, 255, 255, 0.80)'}>
                            {t(region?.location as I18nCloudProvidersKey, { ns: 'cloudProviders' })}
                            {region?.description?.serial}
                          </Text>
                          {cpuPrice && (
                            <Text color={'#47B2FF'} whiteSpace={'nowrap'}>
                              {cpuPrice?.name} {cpuPrice?.unit_price || 0} {t('common:yuan')}/
                              {t('common:core')}/{t('common:year')}
                            </Text>
                          )}
                        </Box>
                        {/* <Divider bg={'rgba(255, 255, 255, 0.10)'} my={'12px'} /> */}
                        <Box px={'16px'} fontSize={'11px'} fontWeight={'500'}>
                          <HStack color={'rgba(255, 255, 255, 0.80)'} gap={'4px'} mb={'2px'}>
                            <ProviderIcon boxSize={'12px'} />
                            <Text>{t('cloudProviders:provider')}</Text>
                          </HStack>
                          <Text color={'white'} mb={'8px'}>
                            {t(region?.description?.provider as I18nCloudProvidersKey, {
                              ns: 'cloudProviders'
                            })}
                          </Text>
                          <HStack color={'rgba(255, 255, 255, 0.80)'} gap={'4px'} mb={'2px'}>
                            <InfoIcon boxSize={'12px'} />
                            <Text>{t('common:description')}</Text>
                          </HStack>
                          <Text whiteSpace={'pre-wrap'} color={'white'} lineHeight={'20px'}>
                            {region?.description?.description?.[i18n.language as 'zh' | 'en']}
                          </Text>
                        </Box>
                      </Box>
                    );
                  })}
                </HStack>
              </Box>
            </Box>
          ) : null}
        </HStack>
      )}
    </>
  );
}
