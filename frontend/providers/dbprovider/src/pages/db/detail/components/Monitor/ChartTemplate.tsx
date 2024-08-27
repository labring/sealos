import MyIcon from '@/components/Icon';
import MonitorChart from '@/components/MonitorChart';
import { LineStyleMap } from '@/constants/monitor';
import { GET } from '@/services/request';
import { ChartTemplateProps } from '@/types/monitor';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';

const ChartTemplate = ({
  db,
  dbName,
  dbType,
  apiUrl,
  chartTitle,
  queryKey,
  yAxisLabelFormatter,
  unit,
  isShowLegend = true
}: ChartTemplateProps) => {
  const { t } = useTranslation();

  const { data: ChartData } = useQuery(
    ['getChartData', apiUrl, queryKey],
    () => GET(apiUrl, { dbName: dbName, dbType: dbType, queryKey: queryKey }),
    {
      refetchInterval: 1 * 60 * 1000
    }
  );

  return (
    <Box
      w={'100%'}
      mt="16px"
      h="210px"
      p="22px 24px"
      borderRadius={'4px'}
      border={'1px solid #EAEBF0'}
      backgroundColor={'#FBFBFC'}
    >
      {ChartData?.result?.xData?.length > 0 ? (
        <Flex flexDirection={'column'} h="100%">
          <Box fontSize={'12px'} fontWeight={500} color={'grayModern.900'} mb="16px">
            {t(chartTitle)}
            {unit ? `(${unit})` : ''}
          </Box>
          <Flex h="100%">
            <MonitorChart
              data={ChartData.result}
              title={chartTitle}
              yAxisLabelFormatter={yAxisLabelFormatter}
              unit={unit}
            />

            {isShowLegend && (
              <Box
                justifyContent={'center'}
                alignContent={'center'}
                flex={'1 0 25%'}
                h="130px"
                flexDirection={'column'}
                p="0 8px 12px 8px"
                overflowY={'scroll'}
                ml="20px"
              >
                {ChartData?.result?.yData?.map((item: { name: string }, index: number) => {
                  return (
                    <Flex key={item?.name + index} alignItems={'center'} w={'fit-content'}>
                      <Box
                        w="16px"
                        h="4px"
                        backgroundColor={LineStyleMap[index % LineStyleMap.length].lineColor}
                        mr="12px"
                      ></Box>
                      <Text fontSize={'10px'} color={'#5A646E'} fontWeight={500}>
                        {item?.name}
                      </Text>
                    </Flex>
                  );
                })}
              </Box>
            )}
          </Flex>
        </Flex>
      ) : (
        <Flex flexDirection={'column'} h="100%">
          <Box fontSize={'12px'} fontWeight={500} color={'#24282C'}>
            {t(chartTitle)}
            {unit ? `(${unit})` : ''}
          </Box>
          <Flex justifyContent={'center'} alignItems={'center'} flexDirection={'column'} flex={1}>
            <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
            <Box pt={'8px'}>{t('no_data_available')}</Box>
          </Flex>
        </Flex>
      )}
    </Box>
  );
};

export default ChartTemplate;
