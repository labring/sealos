import { Box, Flex, Tab, TabList, TabPanels, Tabs as ChakraTabs } from '@chakra-ui/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import RechargeTabPanel from '@/components/billing/RechargeTabPanel';
import InOutTabPanel from '@/components/billing/InOutTabPanel';
import TransferTabPanel from '@/components/billing/TransferTabPnel';
import { Refresh } from '@/components/Refresh';
import { useQueryClient } from '@tanstack/react-query';
import { Trend as OverviewTrend } from '@/components/cost_overview/trend';
import { TrendBar as TrendOverviewBar } from '@/components/cost_overview/trendBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { CostTree } from '@/components/billing/CostTree';

function Billing() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return (
    <>
      <Tabs defaultValue="listing">
        <TabsList variant="underline" className="w-fit">
          <TabsTrigger variant="cleanUnderline" value="listing">
            Billing
          </TabsTrigger>
          <TabsTrigger variant="cleanUnderline" value="trends">
            Cost & Revenue Trends
          </TabsTrigger>
          <TabsTrigger variant="cleanUnderline" value="legacy">
            Legacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listing">
          <CostTree />
        </TabsContent>

        <TabsContent value="trends" className="flex flex-col gap-4">
          <OverviewTrend />
          <TrendOverviewBar />
        </TabsContent>

        <TabsContent value="legacy">
          <Box w="100%" h="100%" p="8px" overflow={'auto'}>
            <Flex
              flexDirection="column"
              h={'full'}
              bg={'white'}
              px="24px"
              py="20px"
              borderRadius={'8px'}
            >
              <ChakraTabs flex={1} display={'flex'} flexDir={'column'} variant={'primary'}>
                <TabList>
                  <Tab>{t('Expenditure')}</Tab>
                  <Tab>{t('Charge')}</Tab>
                  <Tab>{t('Transfer')}</Tab>
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
              </ChakraTabs>
            </Flex>
          </Box>
        </TabsContent>
      </Tabs>
    </>
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
