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
import { Img } from '@chakra-ui/react';
import { Button } from '@sealos/shadcn-ui/button';
import { useTranslation } from 'next-i18next';
import type { StaticImageData } from 'next/image';
import Link from 'next/link';
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
      id: 'Plan',
      url: '/plan',
      value: 'SideBar.Plan',
      icon: invoice_icon,
      aicon: invoice_a_icon,
      display: true
    },
    {
      id: 'Usage',
      url: '/usage',
      value: 'SideBar.Usage',
      icon: invoice_icon,
      aicon: invoice_a_icon,
      display: true
    },
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
    }
  ];

  return (
    <nav className="flex flex-col gap-1">
      {ready &&
        menus
          .filter((item) => item.display)
          .map((item) => {
            return (
              <Button
                variant="ghost"
                className="data-[is-current-page=true]:bg-zinc-100 data-[is-current-page=true]:font-medium font-normal rounded-lg text-sm flex justify-start py-5 px-4"
                asChild
                key={item.id}
                data-is-current-page={router.route === item.url}
              >
                <Link href={item.url} className="flex items-center gap-2">
                  <Img
                    src={router.route == item.url ? item.aicon.src : item.icon.src}
                    width={'16px'}
                    alt="icon of module"
                  />
                  <span className="leading-normal">{t(item.value)}</span>
                </Link>
              </Button>
            );
          })}
    </nav>
  );
}
