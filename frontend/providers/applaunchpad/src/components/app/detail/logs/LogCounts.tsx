import MyIcon from '@/components/Icon';
import LogBarChart from '@/components/LogBarChart';
import { Box, Button, Center, Collapse, Flex, Spinner, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import EmptyChart from '@/components/Icon/icons/emptyChart.svg';

export const LogCounts = ({
  logCountsData,
  isLogCountsLoading
}: {
  logCountsData: { logs_total: string; _time: string }[];
  isLogCountsLoading?: boolean;
}) => {
  const { t } = useTranslation();
  const [onOpenChart, setOnOpenChart] = useState(true);

  const processChartData = (rawData: Array<{ _time: string; logs_total: string }>) => {
    const sortedData = [...rawData].sort(
      (a, b) => new Date(a._time).getTime() - new Date(b._time).getTime()
    );
    const xData = sortedData.map((item) => Math.floor(new Date(item._time).getTime() / 1000));
    const yData = sortedData.map((item) => item.logs_total);

    return {
      xData,
      yData
    };
  };

  return (
    <Flex flexDir={'column'}>
      <Box>
        <Button
          px={'0px'}
          onClick={() => setOnOpenChart(!onOpenChart)}
          bg={'transparent'}
          border={'none'}
          boxShadow={'none'}
          color={'grayModern.900'}
          fontWeight={500}
          fontSize={'14px'}
          lineHeight={'20px'}
          mb={onOpenChart ? '12px' : '0px'}
          leftIcon={
            <MyIcon
              name="arrowRight"
              color={'grayModern.500'}
              w={'16px'}
              transform={onOpenChart ? 'rotate(90deg)' : 'rotate(0)'}
              transition="transform 0.2s ease"
            />
          }
          _hover={{
            color: 'brightBlue.600',
            '& svg': {
              color: 'brightBlue.600'
            }
          }}
        >
          {t('logNumber')}
        </Button>
      </Box>
      {/* charts */}
      <Collapse in={onOpenChart} animateOpacity>
        <Box position={'relative'} h={'100%'} w={'100%'}>
          {isLogCountsLoading ? (
            <Center height={'140px'} w={'100%'}>
              <Spinner size="xl" />
            </Center>
          ) : logCountsData.length > 0 ? (
            <LogBarChart type="blue" data={processChartData(logCountsData)} visible={onOpenChart} />
          ) : (
            <Center height={'140px'} w={'100%'} flexDirection={'column'} gap={'12px'}>
              <EmptyChart />
              <Text fontSize={'12px'} fontWeight={500} color={'grayModern.500'}>
                {t('no_data_available')}
              </Text>
            </Center>
          )}
        </Box>
      </Collapse>
    </Flex>
  );
};
