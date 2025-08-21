import dashbordIcon from '@/assert/dashboard.svg';
import dashboard_a_icon from '@/assert/dashboard_black.svg';
import letter_icon from '@/assert/format_letter_spacing_standard.svg';
import letter_a_icon from '@/assert/format_letter_spacing_standard_black.svg';
import invoice_a_icon from '@/assert/invoice-active.svg';
import invoice_icon from '@/assert/invoice.svg';
import layers_icon from '@/assert/layers.svg';
import layers_a_icon from '@/assert/layers_black.svg';
import linechart_icon from '@/assert/lineChart.svg';
import linechart_a_icon from '@/assert/lineChart_black.svg';
import receipt_icon from '@/assert/receipt_long.svg';
import receipt_a_icon from '@/assert/receipt_long_black.svg';
import useEnvStore from '@/stores/env';
import { Box, Divider, Flex, Img, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import type { StaticImageData } from 'next/image';
import { useRouter } from 'next/router';

type Menu = {
  id: string;
  url: string;
  value: string;
  icon: StaticImageData;
  aicon: StaticImageData;
  display: boolean;
};

export default function SideBar() {
  const router = useRouter();
  const { t, ready } = useTranslation();
  const invoiceEnabled = useEnvStore((state) => state.invoiceEnabled);
  const menus: Menu[] = [
    {
      id: 'CostOverview',
      url: '/cost_overview',
      value: 'SideBar.Index',
      icon: dashbordIcon,
      aicon: dashboard_a_icon,
      display: true
    },
    {
      id: 'BillingOverview',
      url: '/app_overview',
      value: 'SideBar.CostOverview',
      icon: linechart_icon,
      aicon: linechart_a_icon,
      display: true
    },
    {
      id: 'BillingDetails',
      url: '/billing',
      value: 'SideBar.BillingDetails',
      icon: receipt_icon,
      aicon: receipt_a_icon,
      display: true
    },
    {
      id: 'ResourceAnalysis',
      url: '/resource_analysis',
      value: 'SideBar.resource_analysis',
      icon: layers_icon,
      aicon: layers_a_icon,
      display: true
    },
    {
      id: 'ValuationStandard',
      url: '/valuation',
      value: 'SideBar.ValuationStandard',
      icon: letter_icon,
      aicon: letter_a_icon,
      display: true
    },
    {
      id: 'CreateInvoice',
      url: '/create_invoice',
      value: 'SideBar.CreateInvoice',
      icon: invoice_icon,
      aicon: invoice_a_icon,
      display: invoiceEnabled
    },
    {
      id: 'Testing',
      url: '/testing',
      value: 'SideBar.CreateInvoice',
      icon: invoice_icon,
      aicon: invoice_a_icon,
      display: true
    }
  ];
  return (
    <Flex flexDirection="column" py={'22px'} px="16px">
      {ready &&
        menus
          .filter((item) => item.display)
          .map((item, idx) => {
            return (
              <Box key={item.value}>
                <Flex
                  {...([1, 3, 5].includes(idx)
                    ? {
                        mb: '32px'
                      }
                    : {})}
                  alignItems={'center'}
                  onClick={() => {
                    router.push(item.url);
                  }}
                  as="button"
                  fontWeight={500}
                  fontSize={'14px'}
                >
                  <Flex h={4} alignItems={'center'}>
                    <Img
                      src={router.route == item.url ? item.aicon.src : item.icon.src}
                      width={'20px'}
                      alt="icon of module"
                    />
                  </Flex>
                  <Text
                    color={router.route === item.url ? 'grayModern.900' : 'grayModern.500'}
                    ml="8px"
                  >
                    {t(item.value)}
                  </Text>
                </Flex>
                {([0, 2].includes(idx) || (idx === 4 && invoiceEnabled)) && (
                  <Divider my="20px" borderColor={'grayModern.250'} />
                )}
              </Box>
            );
          })}
    </Flex>
  );
}
