import { useTranslation } from 'next-i18next';
import { Box, useTheme, Flex } from '@chakra-ui/react';

import { Header } from './logs/Header';

const Logs = () => {
  const theme = useTheme();

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
        <Header />
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
