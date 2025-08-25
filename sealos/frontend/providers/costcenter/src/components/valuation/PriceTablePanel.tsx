import useEnvStore from '@/stores/env';
import { Box, Flex, TabPanel, Text } from '@chakra-ui/react';
import { ListIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { PricePayload, PriceTable } from '../table/PriceTable';

export function PriceTablePanel({ priceData }: { priceData: PricePayload[] }) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const gpuData = priceData.filter((x) => x.isGpu);
  const otherData = priceData.filter((x) => !x.isGpu);
  const networkData = otherData.filter((x) => x.title === 'network');
  const baseData = otherData.filter((x) => x.title !== 'network');

  return (
    <TabPanel>
      <Flex direction={'column'} w="720px" mx={'auto'}>
        <Box w="full" px={['50px', '60px', '70px', '100px']}>
          <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
            <ListIcon w="24px" h="24px" mr="6px" />
            <Text mr="auto">{t('common valuation')}</Text>
          </Flex>
          <PriceTable data={baseData} />
        </Box>
        <Box w="full" px={['50px', '60px', '70px', '100px']} mt="48px" pt={'10px'}>
          <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
            <ListIcon w="24px" h="24px" mr="6px" />
            <Text mr="auto">{t('Network valuation')}</Text>
          </Flex>
          <PriceTable data={networkData} />
        </Box>
        {gpuEnabled && gpuData.length > 0 && (
          <Box w="full" px={['50px', '60px', '70px', '100px']} mt="48px">
            <Flex w="full" justifyContent={'flex-end'} mb="20px" align={'center'}>
              <ListIcon w="24px" h="24px" mr="6px" />
              <Text mr="auto">{t('Gpu valuation')}</Text>
            </Flex>
            <PriceTable data={gpuData}></PriceTable>
          </Box>
        )}
      </Flex>
    </TabPanel>
  );
}
