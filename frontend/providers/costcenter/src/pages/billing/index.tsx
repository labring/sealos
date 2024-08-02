import { Box, Flex, Heading, Img, Tab, TabList, TabPanels, Tabs } from '@chakra-ui/react';
import { createContext, useEffect, useMemo, useState } from 'react';
import receipt_icon from '@/assert/receipt_long_black.svg';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import NamespaceMenu from '@/components/menu/NamespaceMenu';
import RechargeTabPanel from '@/components/billing/RechargeTabPanel';
import InOutTabPanel from '@/components/billing/InOutTabPanel';
import TransferTabPanel from '@/components/billing/TransferTabPnel';
import { Refresh } from '@/components/Refresh';
import { useQueryClient } from '@tanstack/react-query';
function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return (
    <Box w="100%" h="100%" p="8px" overflow={'auto'}>
      <Flex flexDirection="column" h={'full'} bg={'white'} px="24px" py="20px" borderRadius={'8px'}>
        <Tabs flex={1} display={'flex'} flexDir={'column'}>
          <TabList
            borderColor={'#EFF0F1'}
            alignItems={'center'}
            border={'unset'}
            gap={'12px'}
            fontWeight={'500'}
          >
            <Tab
              fontWeight={'500'}
              px="4px"
              py={'8px'}
              color={'grayModern.500'}
              _selected={{ color: 'grayModern.900', borderColor: 'grayModern.900' }}
              _active={{ color: 'unset' }}
            >
              {t('Expenditure')}
            </Tab>
            <Tab
              px="4px"
              py={'8px'}
              fontWeight={'500'}
              color={'grayModern.500'}
              _selected={{ color: 'grayModern.900', borderColor: 'grayModern.900' }}
              _active={{ color: 'unset' }}
            >
              {t('Charge')}
            </Tab>
            <Tab
              px="4px"
              py={'8px'}
              fontWeight={'500'}
              color={'grayModern.500'}
              _selected={{ color: 'grayModern.900', borderColor: 'grayModern.900' }}
              _active={{ color: 'unset' }}
            >
              {t('Transfer')}
            </Tab>
            <Refresh
              boxSize={'32px'}
              onRefresh={() => {
                return queryClient.invalidateQueries();
              }}
              ml="auto"
            />
          </TabList>
          <TabPanels mt="12px" flexDirection={'column'} flex={'1'} display={'flex'}>
            <InOutTabPanel />
            <RechargeTabPanel />
            <TransferTabPanel />
          </TabPanels>
        </Tabs>
      </Flex>
    </Box>
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
