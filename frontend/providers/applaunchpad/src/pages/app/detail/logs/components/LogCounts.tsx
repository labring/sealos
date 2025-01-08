import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Box, Button, Collapse, Flex } from '@chakra-ui/react';

import MyIcon from '@/components/Icon';
import LogBarChart from '@/components/LogBarChart';
import { MonitorDataResult } from '@/types/monitor';

export const LogCounts = () => {
  const { t } = useTranslation();

  const [onOpenChart, setOnOpenChart] = useState(true);

  return (
    <Flex flexDir={'column'}>
      <Box>
        <Button
          onClick={() => setOnOpenChart(!onOpenChart)}
          bg={'transparent'}
          border={'none'}
          boxShadow={'none'}
          color={'grayModern.900'}
          fontWeight={400}
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
        <Box p={4} position={'relative'} h={'100%'} w={'100%'}>
          <LogBarChart type="blue" data={mockData} isShowLabel />
        </Box>
      </Collapse>
    </Flex>
  );
};

const mockData: MonitorDataResult = {
  name: 'log',
  xData: [1, 2, 3, 4, 5, 6, 7],
  yData: ['50', '80', '70', '60', '50', '60', '70']
};
