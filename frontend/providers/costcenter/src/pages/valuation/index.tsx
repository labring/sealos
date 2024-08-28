import nvidaIcon from '@/assert/bi_nvidia.svg';
import CurrencySymbol from '@/components/CurrencySymbol';
import CpuIcon from '@/components/icons/CpuIcon';
import ListIcon from '@/components/icons/ListIcon';
import { MemoryIcon } from '@/components/icons/MemoryIcon';
import { NetworkIcon } from '@/components/icons/NetworkIcon';
import { PortIcon } from '@/components/icons/PortIcon';
import { StorageIcon } from '@/components/icons/StorageIcon';
import BaseMenu from '@/components/menu/BaseMenu';
import RegionMenu from '@/components/menu/RegionMenu';
import { valuationMap } from '@/constants/payment';
import { CYCLE } from '@/constants/valuation';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types/api';
import { ValuationStandard } from '@/types/valuation';
import {
  Box,
  Flex,
  FlexProps,
  Img,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { QueryClient, dehydrate, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';

type CardItem = {
  title: string;
  price: number[];
  unit: string;
  bg: string;
  idx: number;
  icon: typeof Img;
};

function CycleMenu({
  cycleIdx,
  setCycleIdx,
  ...props
}: {
  cycleIdx: number;
  setCycleIdx: (x: number) => void;
} & FlexProps) {
  const { t } = useTranslation();
  return (
    <BaseMenu
      itemIdx={cycleIdx}
      isDisabled={false}
      setItem={function (idx: number): void {
        setCycleIdx(idx);
      }}
      itemlist={CYCLE.map((v) => t(v)) as unknown as string[]}
      {...props}
    />
  );
}

const getValuation = (regionUid: string) =>
  request.post<any, ApiResp<{ properties: ValuationStandard[] }>>('/api/properties', {
    regionUid
  });

function Valuation() {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const [cycleIdx, setCycleIdx] = useState(0);
  const { getRegion } = useBillingStore();
  const regionUid = getRegion()?.uid || '';
  const { data: _data } = useQuery(['valuation', regionUid], () => getValuation(regionUid));
  const data =
    _data?.data?.properties
      ?.filter((x) => !x.name.startsWith('gpu-'))
      ?.flatMap<CardItem>((x) => {
        const props = valuationMap.get(x.name);
        if (!props) return [];
        let icon: typeof Img;
        let title = x.name;
        if (x.name === 'cpu') icon = CpuIcon;
        else if (x.name === 'memory') icon = MemoryIcon;
        else if (x.name === 'network') icon = NetworkIcon;
        else if (x.name === 'storage') icon = StorageIcon;
        else if (x.name === 'services.nodeports') {
          icon = PortIcon;
          title = 'Port';
        } else return [];
        return [
          {
            title,
            price: [1, 24, 168, 720, 8760].map(
              (v) => Math.floor(v * (x.unit_price || 0) * (props.scale || 1)) / 1000000
            ),
            unit: props.unit,
            bg: props.bg,
            idx: props.idx,
            icon
          }
        ];
      })
      ?.sort((a, b) => a.idx - b.idx) || [];
  const networkData = data.filter((x) => x.title === 'network');
  const gpuProps = valuationMap.get('gpu')!;
  const gpuData = gpuEnabled
    ? _data?.data?.properties
        ?.filter((x) => x.name.startsWith('gpu-'))
        ?.map((x) => {
          const name = x.name.replace('gpu-', '').replace('_', ' ');
          const price = ((x.unit_price || 0) * (gpuProps.scale || 1)) / 1000000;
          return {
            name,
            price
          };
        })
        ?.sort((a, b) => (a.name > b.name ? 1 : -1)) || []
    : [];
  const headers = ['Valuation.Name', 'Valuation.Unit', 'Valuation.Price'];
  const currency = useEnvStore((s) => s.currency);
  return (
    <Flex w="100%" h="100%">
      <Stack
        flex={1}
        bg={'#FBFBFC'}
        alignItems="center"
        px={'24px'}
        py={'20px'}
        borderRadius={'4px'}
        overflowY={'auto'}
      >
        、
        <Tabs flex={1} display={'flex'} flexDir={'column'} w={'full'}>
          <TabList
            borderColor={'#EFF0F1'}
            alignItems={'center'}
            border={'unset'}
            width={'full'}
            display={'flex'}
          >
            <Tab
              px="4px"
              py={'8px'}
              color={'grayModern.500'}
              _selected={{ color: 'grayModern.900', borderColor: 'grayModern.900' }}
              _active={{ color: 'unset' }}
            >
              {t('Price Table')}
            </Tab>
            <Flex ml="auto" gap={'12px'}>
              <RegionMenu innerWidth={'230px'} isDisabled={false} />
              <CycleMenu cycleIdx={cycleIdx} setCycleIdx={setCycleIdx} mr={'0'} />
            </Flex>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Flex direction={'column'} w="720px" mx={'auto'}>
                <Box w="full" px={['50px', '60px', '70px', '100px']}>
                  <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
                    <ListIcon w="24px" h="24px" mr="6px" />
                    <Text mr="auto">{t('common valuation')}</Text>
                  </Flex>
                  <TableContainer
                    w="100%"
                    mt="0px"
                    borderRadius={'6px'}
                    border="1px solid"
                    borderColor={'grayModern.250'}
                  >
                    <Table variant="unstyled">
                      <Thead
                        borderBottom="1px solid"
                        overflow={'hidden'}
                        borderColor={'grayModern.250'}
                      >
                        <Tr>
                          {headers.map((item, idx) => (
                            <Th
                              px="24px"
                              pt="12px"
                              pb="14px"
                              w="200px"
                              background="#F1F4F6"
                              key={item}
                              borderRadius={'unset'}
                            >
                              <Flex display={'flex'} alignItems={'center'}>
                                <Text mr="4px" fontSize={'12px'}>
                                  {t(item)}
                                </Text>
                                {idx === 2 && <CurrencySymbol type={currency} />}
                              </Flex>
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data
                          .filter((x) => x.title !== 'network')
                          .map((x, i, arr) => (
                            <Tr
                              borderBottom={i != arr.length - 1 ? '1px solid' : ''}
                              borderColor={'grayModern.250'}
                              key={x.title}
                            >
                              <Td display={'flex'} alignItems={'center'} border={'none'}>
                                <x.icon h="16px" w="16px" mr="8px" />
                                <Flex flexDirection={'column'} alignItems={'flex-start'}>
                                  <Text
                                    textTransform={'capitalize'}
                                    textAlign={'center'}
                                    fontSize={'12px'}
                                  >
                                    {t(x.title)}
                                  </Text>
                                </Flex>
                              </Td>
                              <Td fontSize={'12px'}>
                                {[x.unit, `${t(CYCLE[cycleIdx])}`]
                                  // .filter((v) => v.trim() !== '')
                                  .join('/')}
                              </Td>
                              <Td fontSize={'12px'} color={'brightBlue.600'}>
                                {x.price[cycleIdx]}
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
                <Box w="full" px={['50px', '60px', '70px', '100px']} mt="48px" pt={'10px'}>
                  <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
                    <ListIcon w="24px" h="24px" mr="6px" />
                    <Text mr="auto">{t('Network valuation')}</Text>
                  </Flex>
                  <TableContainer
                    w="100%"
                    mt="0px"
                    border="1px solid"
                    borderColor={'grayModern.250'}
                    borderRadius={'6px'}
                  >
                    <Table variant="simple">
                      <Thead background="#F1F4F6">
                        <Tr>
                          {headers.map((item, idx) => (
                            <Th key={item} bg={'#F1F4F6'} px="24px" pt="12px" pb="14px" w={'200px'}>
                              <Flex display={'flex'} alignItems={'center'}>
                                <Text mr="4px" fontSize={'12px'}>
                                  {t(item)}
                                </Text>
                                {idx === 2 && <CurrencySymbol type={currency} />}
                              </Flex>
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {networkData.map((x, i, arr) => (
                          <Tr
                            key={x.title}
                            borderBottom={i !== arr.length - 1 ? '1px solid' : ''}
                            borderColor={'grayModern.250'}
                          >
                            <Td
                              fontSize={'12px'}
                              display={'flex'}
                              alignItems={'center'}
                              border={'none'}
                            >
                              <x.icon h="16px" w="16px" mr="8px" />
                              <Text>{t(x.title)}</Text>
                            </Td>
                            <Td fontSize={'12px'} border={'none'}>
                              /{t(x.unit)}
                            </Td>
                            <Td fontSize={'12px'} color={'brightBlue.600'} border={'none'}>
                              {x.price[0]}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
                {gpuEnabled && gpuData.length > 0 && (
                  <Box w="full" px={['50px', '60px', '70px', '100px']} mt="48px">
                    <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
                      <ListIcon w="24px" h="24px" mr="6px" />
                      <Text mr="auto">{t('Gpu valuation')}</Text>
                    </Flex>
                    <TableContainer w="100%" mt="0px">
                      <Table variant="simple">
                        <Thead background="#F1F4F6" border="1px solid grayModern.250">
                          <Tr>
                            {headers.map((item, idx) => (
                              <Th
                                key={item}
                                bg={'#F1F4F6'}
                                px="24px"
                                pt="12px"
                                pb="14px"
                                w={'200px'}
                              >
                                <Flex display={'flex'} alignItems={'center'}>
                                  <Text mr="4px">{t(item)}</Text>
                                  {idx === 2 && <CurrencySymbol type={currency} />}
                                </Flex>
                              </Th>
                            ))}
                          </Tr>
                        </Thead>
                        <Tbody>
                          {gpuData.map((x) => (
                            <Tr border="1px solid grayModern.250" key={x.name}>
                              <Td display={'flex'} alignItems={'center'} border={'none'}>
                                <Img src={nvidaIcon.src} w="16px" h="16px" mr="8px" />
                                <Text>{t(x.name)}</Text>
                              </Td>
                              <Td>
                                {t('GPU Unit')}/{t('Hour')}
                              </Td>
                              <Td>{x.price}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Flex>
  );
}

export default Valuation;

export async function getServerSideProps({ locale }: { locale: string }) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(['valuation'], () => getValuation(''));
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'], null, ['zh', 'en'])),
      dehydratedState: dehydrate(queryClient)
    }
  };
}
