import { useTranslation } from 'next-i18next';
import { Box, useTheme, Flex, Divider } from '@chakra-ui/react';

import { Header } from './logs/Header';
import { Filter } from './logs/Filter';
import { LogNumber } from './logs/LogNumber';

const Logs = () => {
  const theme = useTheme();

  return (
    <>
      <Flex
        mb={4}
        bg={'white'}
        gap={'12px'}
        flexDir={'column'}
        border={theme.borders.base}
        borderRadius={'lg'}
      >
        <Header />
        <Divider />
        <Filter />
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
        <LogNumber />
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
