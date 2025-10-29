import MyIcon from '@/components/Icon';
import { Box, Button, Center, Collapse, Flex, Spinner, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import EmptyChart from '@/components/Icon/icons/emptyChart.svg';
import { ChevronUp } from 'lucide-react';

const LogBarChart = dynamic(() => import('@/components/LogBarChart'), { ssr: false });

interface LogCountsProps {
  logCountsData?: { logs_total: string; _time: string }[];
  isLogCountsLoading?: boolean;
  totalLogs?: number;
}

export const LogCounts = ({
  logCountsData = [],
  isLogCountsLoading = false,
  totalLogs = 0
}: LogCountsProps) => {
  const { t } = useTranslation('common');
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
          display={'flex'}
          alignItems={'center'}
          gap={'4px'}
          px={'0px'}
          onClick={() => setOnOpenChart(!onOpenChart)}
          bg={'transparent'}
          border={'none'}
          boxShadow={'none'}
          color={'#000'}
          fontFamily={'Geist'}
          fontWeight={500}
          fontSize={'18px'}
          lineHeight={'28px'}
          mb={onOpenChart ? '12px' : '0px'}
          leftIcon={
            <ChevronUp
              size={16}
              color="#A3A3A3"
              style={{
                flexShrink: 0,
                strokeWidth: '2',
                transform: onOpenChart ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          }
          _hover={{
            color: '#000',
            '& svg': {
              color: '#A3A3A3'
            }
          }}
        >
          {t('Log Counts')}
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
            <LogBarChart
              type="deepBlue"
              data={processChartData(logCountsData)}
              visible={onOpenChart}
            />
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
