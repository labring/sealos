import { Calculator, ChartPie, Dock, ReceiptText, LucideIcon, TicketMinus } from 'lucide-react';
import useEnvStore from '@/stores/env';
import { Button } from '@sealos/shadcn-ui/button';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Menu = {
  id: string;
  url: string;
  value: string;
  icon: LucideIcon;
  display: boolean;
};

export default function SideBar() {
  const router = useRouter();
  const { t, ready } = useTranslation();
  const invoiceEnabled = useEnvStore((state) => state.invoiceEnabled);
  const subscriptionEnabled = useEnvStore((state) => state.subscriptionEnabled);

  const menus: Menu[] = [
    {
      id: 'Cost',
      url: '/cost',
      value: 'sidebar.cost',
      icon: Dock,
      display: !subscriptionEnabled
    },
    {
      id: 'Plan',
      url: '/plan',
      value: 'sidebar.plan',
      icon: Dock,
      display: subscriptionEnabled
    },
    {
      id: 'Billing',
      url: '/billing',
      value: 'sidebar.billing',
      icon: ReceiptText,
      display: true
    },
    {
      id: 'Invoice',
      url: '/create_invoice',
      value: 'sidebar.invoice',
      icon: TicketMinus,
      display: invoiceEnabled
    },
    {
      id: 'Usage',
      url: '/usage',
      value: 'sidebar.usage',
      icon: ChartPie,
      display: true
    },
    {
      id: 'Pricing Standard',
      url: '/valuation',
      value: 'sidebar.valuation',
      icon: Calculator,
      display: true
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
                  <item.icon
                    size={16}
                    className={router.route === item.url ? 'text-zinc-900' : 'text-zinc-600'}
                  />
                  <span className="leading-normal">{t(item.value)}</span>
                </Link>
              </Button>
            );
          })}
    </nav>
  );
}
