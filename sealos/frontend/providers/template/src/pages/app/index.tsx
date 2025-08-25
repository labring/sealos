import { serviceSideProps } from '@/utils/i18n';
import { Box, Center, Flex, Tab, TabIndicator, TabList, Tabs, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import InstanceList from './components/list';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';

export default function MyApp() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const router = useRouter();

  const handleTabsChange = (index: number) => {
    setTabIndex(index);
  };

  return (
    <Flex
      flexDirection={'column'}
      height={'100%'}
      width={'100%'}
      overflow={'auto'}
      position={'relative'}
      borderRadius={'12px'}
      background={'linear-gradient(180deg, #FFF 0%, rgba(255, 255, 255, 0.70) 100%)'}
      pt={'36px'}
      px="42px"
    >
      <Flex justifyContent={'space-between'} minW={'712px'}>
        <Tabs
          fontWeight={500}
          position="relative"
          variant="unstyled"
          index={tabIndex}
          onChange={handleTabsChange}
        >
          <TabList>
            <Tab p="0" mb="6px" color={tabIndex === 0 ? '#24282C' : '#7B838B'}>
              {t('Installed')}
            </Tab>
          </TabList>
          <TabIndicator mt="-1.5px" height="2px" bg="#24282C" borderRadius="1px" />
        </Tabs>
        <Center
          cursor={'pointer'}
          w="124px"
          bg="rgba(150, 153, 180, 0.15)"
          p="4px 12px"
          borderRadius={'40px'}
          bottom={'28px'}
          onClick={() => router.push('/develop')}
        >
          <MyIcon name="tool" fill={'transparent'} />
          <Text ml="8px" color={'#485058'} fontWeight={500} fontSize={'12px'}>
            {t('develop.Debugging Template')}
          </Text>
        </Center>
      </Flex>

      <InstanceList />
    </Flex>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}
