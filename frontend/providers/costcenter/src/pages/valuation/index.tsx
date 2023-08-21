import { Box, Flex, Heading, Text, Img, Stack } from '@chakra-ui/react';
import letter_icon from '@/assert/format_letter_spacing_standard_black.svg';
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ValuationBillingRecord } from '@/types/valuation';
import { valuationMap } from '@/constants/payment';
import { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n, useTranslation } from 'next-i18next';
import { ApiResp } from '@/types/api';
import nvidaIcon from '@/assert/bi_nvidia.svg';
import { getCookie } from '@/utils/cookieUtils';
import { CYCLE } from '@/constants/valuation';
import OuterLink from '@/components/outerLink';
import NotFound from '@/components/notFound';
import PredictCard from '@/components/valuation/predictCard';
import useEnvStore from '@/stores/env';
import CurrencySymbol from '@/components/CurrencySymbol';
type CardItem = {
  title: string;
  price: number[];
  unit: string;
  bg: string;
  idx: number;
};

function ValuationCard(props: any) {
  return (
    <Stack
      align={'center'}
      pt="27px"
      pb="21px"
      boxSizing="border-box"
      width="240px"
      height="339px"
      background="#F1F4F6"
      borderWidth={'1px'}
      borderColor="#DEE0E2"
      borderRadius="4px"
    >
      {props.children}
    </Stack>
  );
}
const getValuation = () =>
  request<any, ApiResp<{ billingRecords: ValuationBillingRecord[] }>>('/api/price');
function Valuation() {
  const { t, i18n } = useTranslation();
  const cookie = getCookie('NEXT_LOCALE');
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const currency = useEnvStore((s) => s.currency);
  useEffect(() => {
    i18n.changeLanguage(cookie);
  }, [cookie, i18n]);
  const { data: _data } = useQuery(['valuation'], getValuation);

  const data =
    _data?.data?.billingRecords
      ?.filter((x) => !x.resourceType.startsWith('gpu-'))
      ?.flatMap<CardItem>((x) => {
        const props = valuationMap.get(x.resourceType);
        if (!props) return [];
        return [
          {
            title: x.resourceType,
            price: [1, 24, 168, 720, 8760].map((v) => (v * x.price * (props.scale || 1)) / 1000000),
            unit: props.unit,
            bg: props.bg,
            idx: props.idx
          }
        ];
      })
      ?.sort((a, b) => a.idx - b.idx) || [];
  const gpuProps = valuationMap.get('gpu')!;
  const gpuData = gpuEnabled
    ? _data?.data?.billingRecords
        ?.filter((x) => x.resourceType.startsWith('gpu-'))
        ?.map((x) => {
          const name = x.resourceType.replace('gpu-', '').replace('_', ' ');
          const price = (x.price * (gpuProps.scale || 1)) / 1000000;
          return {
            name,
            price
          };
        })
        ?.sort((a, b) => (a.name > b.name ? 1 : -1)) || []
    : [];
  return (
    <Flex
      w="100%"
      h="100%"
      bg={'white'}
      flexDirection="column"
      alignItems="center"
      p={'24px'}
      overflowY={'auto'}
    >
      <Flex alignSelf={'flex-start'} mb="80px" align={'center'}>
        <Img src={letter_icon.src} w={'24px'} h={'24px'} mr={'18px'}></Img>
        <Heading size="lg">{t('Valuation.Standard')}</Heading>
      </Flex>
      <Flex direction={'column'}>
        <Flex gap={'52px'} flexWrap={'wrap'} justify={'center'} mt={'24px'}>
          {data ? (
            <>
              {data?.map((item) => (
                <ValuationCard key={item.title}>
                  <Flex align={'center'}>
                    <Box borderRadius="2px" bg={item.bg} w={'16px'} h={'16px'} mr={'8px'}></Box>
                    <Text fontSize={'16px'}>{item.title}</Text>
                  </Flex>
                  <Heading display={'flex'} justifyContent="center" alignContent={'center'}>
                    <CurrencySymbol w="16px" type={currency} />
                    <Text ml="10px">{item.price[0]}</Text>
                  </Heading>
                  <Flex align={'center'}>
                    <Text>
                      {item.unit} / {t('Hour')}
                    </Text>
                  </Flex>
                  <Box pt={'17px'}>
                    {CYCLE.map((_item, idx) => (
                      <Flex key={idx} w="192px" borderTop={'dashed 1px #DEE0E2'} py={'8px'}>
                        <CurrencySymbol type={currency} />
                        <Box ml="2px">{item.price[idx + 1]}</Box>
                        <Flex align={'center'} ml="auto">
                          <Text>{`${item.unit} / ${t(_item)}`}</Text>
                        </Flex>
                      </Flex>
                    ))}
                  </Box>
                </ValuationCard>
              ))}
              {gpuEnabled && gpuData.length > 0 && (
                <ValuationCard>
                  <Flex align={'center'}>
                    <Box borderRadius="2px" bg={gpuProps.bg} w={'16px'} h={'16px'} mr={'8px'}></Box>
                    <Text fontSize={'16px'}>GPU</Text>
                  </Flex>
                  <Stack w="100%" mt="24px" overflow={'auto'}>
                    {gpuData.map((item) => (
                      <Flex
                        key={item.name}
                        align={'center'}
                        h="45px"
                        w="100%"
                        borderTop={'dashed 1px #DEE0E2'}
                        pt="12px"
                        px="24px"
                      >
                        <CurrencySymbol type={currency} />
                        <Text ml="2px">{`${item.price}`}</Text>
                        <Stack
                          align={'flex-end'}
                          gap="0"
                          fontSize={'10px'}
                          fontWeight={'500'}
                          ml="auto"
                        >
                          <Flex>
                            <Img src={nvidaIcon.src} w="14px" h="14px" mr="6px" />
                            <Text minW={'max-content'}>{item.name}</Text>
                          </Flex>
                          <Flex>
                            <Text>{`${gpuProps.unit} / ${t('Hour')}`}</Text>
                          </Flex>
                        </Stack>
                      </Flex>
                    ))}
                  </Stack>
                </ValuationCard>
              )}
            </>
          ) : (
            <NotFound></NotFound>
          )}
        </Flex>
        <Flex mt={'36px'} direction={'column'}>
          <Flex align={'center'} mb={'20px'}>
            <Text mr={'17px '}>{t('Next month cost estimation')}</Text>
            <OuterLink text={t('Predict Detail')} href={'#'}></OuterLink>
          </Flex>
          <PredictCard></PredictCard>
        </Flex>
      </Flex>
    </Flex>
  );
}
export default Valuation;
export async function getServerSideProps(content: any) {
  const locale = content?.req?.cookies?.NEXT_LOCALE || 'zh';
  process.env.NODE_ENV === 'development' && i18n?.reloadResources(locale, undefined);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(['valuation'], getValuation);
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, content.locales)),

      dehydratedState: dehydrate(queryClient)
    }
  };
}
