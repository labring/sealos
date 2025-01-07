import { useTranslation } from 'next-i18next';
import { Box, useTheme, Text, Flex } from '@chakra-ui/react';

import dynamic from 'next/dynamic';

const DatePicker = dynamic(() => import('@/components/DatePicker'), { ssr: false });

const Logs = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Flex
        mb={4}
        bg={'white'}
        p={4}
        border={theme.borders.base}
        borderRadius={'lg'}
        flexShrink={0}
        minH={'50px'}
        alignItems={'center'}
      >
        <Flex justify={'space-between'} gap={'12px'} alignItems={'center'}>
          <Text fontSize={'14px'} fontWeight={'bold'} lineHeight={'20px'}>
            {t('filter')}
          </Text>
          <DatePicker />
        </Flex>
      </Flex>
      <Box
        mb={4}
        p={4}
        bg={'white'}
        border={theme.borders.base}
        borderRadius={'lg'}
        flexShrink={0}
        minH={'257px'}
      >
        日志数量
      </Box>
      <Box
        bg={'white'}
        p={4}
        border={theme.borders.base}
        borderRadius={'lg'}
        h={0}
        flex={1}
        minH={'257px'}
      >
        日志数量
      </Box>
    </>
  );
};

export default Logs;
