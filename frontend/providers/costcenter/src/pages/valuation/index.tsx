import { Box, Flex, Heading, Text, Img } from '@chakra-ui/react';
import letter_icon from '@/assert/format_letter_spacing_standard_black.svg';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ValuationData } from '@/types/valuation';
import { valuationMap } from '@/constants/payment';
import { use, useEffect, useMemo } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { ApiResp } from '@/types/api';
import { getCookie } from '@/utils/cookieUtils';
import { CYCLE } from '@/constants/valuation';
import OuterLink from '@/components/outerLink';
import useBillingStore from '@/stores/billing';
type CardItem = {
  title: string;
  price: number[];
  unit: string;
  bg: string;
  idx: number;
}

function Valuation() {
  const { t, i18n } = useTranslation();
  const cookie = getCookie('NEXT_LOCALE');

  useEffect(() => {
    i18n.changeLanguage(cookie);
  }, [cookie, i18n]);
  // 有优化的空间
  const state = useBillingStore()
  const leastCost = useMemo(() => [
    { name: 'CPU', cost: state.cpu * 30 },
    { name: 'memory', cost: state.memory * 30 },
    { name: 'storage', cost: state.storage * 30 },
    { name: t('total'), cost: (state.cpu + state.memory + state.storage) * 30 },
  ], [state.cpu, state.memory, state.storage])

  const { data: _data } = useQuery(['valuation'], () =>
    request<any, ApiResp<ValuationData>>('/api/price')
  );

  const data = useMemo(
    () =>
      _data?.data?.status.billingRecords
        .filter((x) => valuationMap.has(x.resourceType))
        .map<CardItem>((x) => {
          const props = valuationMap.get(x.resourceType)!;
          return {
            title: x.resourceType,
            price: [1, 24, 168, 720, 8760].map((v) => (v * x.price * (props.scale || 1)) / 1000000),
            unit: props.unit,
            bg: props.bg,
            idx: props.idx
          };
        })
        .sort((a, b) => a.idx - b.idx) || [],
    [_data]
  );

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
          {data?.map((item) => <Flex
            key={item.title}
            direction={'column'}
            justify="space-evenly"
            align={'center'}
            boxSizing="border-box"
            width="240px"
            height="339px"
            background="#F1F4F6"
            borderWidth={'1px'}
            borderColor="#EFF0F1"
            borderRadius="4px"
          >
            <Flex align={'center'}>
              <Box borderRadius="2px" bg={item.bg} w={'16px'} h={'16px'} mr={'8px'}></Box>
              <Text fontSize={'16px'}>{item.title}</Text>
            </Flex>
            <Heading w="127px" display={'flex'} justifyContent="center" alignContent={'center'}>
              ￥{item.price[0]}
            </Heading>
            <Text ml="4px">
              {item.unit}/ {t('Hour')}
            </Text>
            <Box>
              {CYCLE.map((_item, idx) => (
                <Flex
                  key={idx}
                  justify="space-between"
                  w="192px"
                  borderTop={'dashed 1px #DEE0E2'}
                  py={'8px'}
                >
                  <Box>{item.price[idx + 1]}</Box>
                  <Box>{`￥${item.unit}/${t(_item)}`}</Box>
                </Flex>
              ))}
            </Box>
          </Flex>)}
        </Flex>
        <Flex mt={'36px'} direction={'column'}>
          <Flex align={'center'}>
            <Text mr={'17px '}>下个月成本预估</Text>
            <OuterLink text={'根据当前资源用量预测未来 30 天费用'} href={'#'}></OuterLink>
          </Flex>
          <Flex wrap={'wrap'}>
            {
              leastCost.map((item) => (<Flex key={item.name}>
                <Flex justify={'center'} align={'center'}>{item.name}</Flex>
                <Flex justify={'center'} align={'center'}>￥{item.cost}</Flex>
              </Flex>))
            }
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
export default Valuation;
export async function getServerSideProps(content: any) {
  const locale = content?.req?.cookies?.NEXT_LOCALE || 'zh';
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, content.locales))
    }
  };
}
