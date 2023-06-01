import { MoreAppsContext } from '@/components/layout';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useContext } from 'react';
import Iconfont from '../iconfont';
import { useTranslation } from 'react-i18next';

export default function Index() {
  const { t } = useTranslation();
  const moreAppsContent = useContext(MoreAppsContext);
  return (
    <Flex
      onClick={() => {
        moreAppsContent?.setShowMoreApps(true);
      }}
      cursor={'pointer'}
      justifyContent={'center'}
      alignItems={'center'}
      w="110px"
      h="42px"
      background={'rgba(21, 37, 57, 0.6)'}
      boxShadow={'0px 1.16667px 2.33333px rgba(0, 0, 0, 0.2)'}
      position={'absolute'}
      bottom={'80px'}
      borderRadius={'8px'}
      userSelect={'none'}
    >
      <Box pt={'1px'} pr={'6px'}>
        <Iconfont iconName="icon-apps" width={20} height={20} color="#ffffff"></Iconfont>
      </Box>
      <Text color={'#FFFFFF'} fontSize={'14px'} fontWeight={500}>
        {t('More Apps')}
      </Text>
    </Flex>
  );
}
