import { Flex, Heading, Img, Tab, TabList, TabPanels, Tabs } from '@chakra-ui/react';
import { createContext, useMemo, useState } from 'react';
import receipt_icon from '@/assert/receipt_long_black.svg';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import NamespaceMenu from '@/components/billing/NamespaceMenu';
import RechargeTabPanel from '@/components/billing/RechargeTabPanel';
import InOutTabPanel from '@/components/billing/InOutTabPanel';
import TransferTabPanel from '@/components/billing/TransferTabPnel';
import useBillingStore from '@/stores/billing';
function Billing() {
  const { t } = useTranslation();
  const { setNamespace } = useBillingStore();
  return (
    <Flex flexDirection="column" w="100%" h="100%" bg={'white'} p="24px" overflow={'auto'}>
      <Flex mr="24px" align={'center'}>
        <Img src={receipt_icon.src} w={'24px'} h={'24px'} mr={'18px'} dropShadow={'#24282C'}></Img>
        <Heading size="lg">{t('SideBar.BillingDetails')}</Heading>
        <NamespaceMenu isDisabled={false} />
      </Flex>
      <Tabs mt={'20px'} flex={1} display={'flex'} flexDir={'column'}>
        <TabList borderColor={'#EFF0F1'}>
          <Tab
            px="10px"
            color={'#9CA2A8'}
            _selected={{ color: '#24282C', borderColor: '#24282C' }}
            _active={{ color: 'unset' }}
          >
            {t('Expenditure')}
          </Tab>
          <Tab
            px="10px"
            color={'#9CA2A8'}
            _selected={{ color: '#24282C', borderColor: '#24282C' }}
            _active={{ color: 'unset' }}
          >
            {t('Charge')}
          </Tab>
          <Tab
            px="10px"
            color={'#9CA2A8'}
            _selected={{ color: '#24282C', borderColor: '#24282C' }}
            _active={{ color: 'unset' }}
          >
            {t('Transfer')}
          </Tab>
        </TabList>
        <TabPanels mt="24px" flexDirection={'column'} flex={'1'} display={'flex'}>
          <InOutTabPanel />
          <RechargeTabPanel />
          <TransferTabPanel />
        </TabPanels>
      </Tabs>
    </Flex>
  );
}

export default Billing;

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}
