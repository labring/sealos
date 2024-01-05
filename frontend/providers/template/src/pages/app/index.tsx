import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex, Tab, TabIndicator, TabList, Tabs } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import InstanceList from './components/list';

export default function MyApp() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabsChange = (index: number) => {
    setTabIndex(index);
  };

  return (
    <Flex
      flexDirection={'column'}
      height={'100vh'}
      overflow={'hidden'}
      position={'relative'}
      borderRadius={'12px'}
      background={'linear-gradient(180deg, #FFF 0%, rgba(255, 255, 255, 0.70) 100%)'}
      pt={'36px'}
      pl="42px">
      <Tabs
        fontWeight={500}
        position="relative"
        variant="unstyled"
        index={tabIndex}
        onChange={handleTabsChange}>
        <TabList>
          <Tab p="0" mb="6px" color={tabIndex === 0 ? '#24282C' : '#7B838B'}>
            {t('Installed')}
          </Tab>
        </TabList>
        <TabIndicator mt="-1.5px" height="2px" bg="#24282C" borderRadius="1px" />
      </Tabs>
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
