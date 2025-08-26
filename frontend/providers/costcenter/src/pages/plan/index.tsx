import {
  Avatar,
  AvatarFallback,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  TableCell,
  TableHead,
  TableRow
} from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck, CircleHelp, Gift, Sparkles } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery } from '@tanstack/react-query';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import { PlanListResponse, SubscriptionPlan, SubscriptionInfoResponse } from '@/types/plan';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import { getPlanList, getSubscriptionInfo } from '@/api/plan';
import { AllPlansSection } from '@/components/plan/AllPlansSection';

function PlanHeader({
  plans,
  isLoading,
  subscription
}: {
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  subscription?: any;
}) {
  const planName = subscription?.PlanName || 'Free Plan';
  const renewalTime = subscription?.CurrentPeriodEndAt
    ? new Date(subscription.CurrentPeriodEndAt)
        .toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        .replace(/\//g, '/')
        .replace(',', '')
    : 'N/A';

  return (
    <div className="bg-white shadow-sm border p-2 rounded-2xl">
      <div className="bg-plan-starter rounded-xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{planName}</h1>
          </div>

          <UpgradePlanDialog plans={plans} isLoading={isLoading}>
            <Button size="lg">
              <Sparkles />
              <span>Upgrade Plan</span>
            </Button>
          </UpgradePlanDialog>
        </div>

        <Separator className="border-slate-200" />

        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">
              Status: {subscription?.Status || 'Unknown'}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">Type: {subscription?.type || 'Unknown'}</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">
              Pay Status: {subscription?.PayStatus || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-2">
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Plan Type</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {subscription?.type === 'SUBSCRIPTION'
              ? 'Subscription'
              : subscription?.type || 'Unknown'}
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Renewal Time</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {renewalTime}
          </span>
        </div>
      </div>
    </div>
  );
}

function UpgradePlanCard({
  plan,
  className,
  isPopular = false,
  isCurrentPlan = false
}: {
  plan: SubscriptionPlan;
  className?: string;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
}) {
  // 获取价格，优先月付，如果没有价格数组则为0
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === 'monthly')?.Price || 0;
  const yearlyPrice = plan.Prices?.find((p) => p.BillingCycle === 'yearly')?.Price || 0;

  // 解析资源配置
  let resources: any = {};
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {};
  }

  return (
    <section className={cn('flex flex-col border p-8 shadow-sm rounded-2xl bg-card', className)}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{plan.Name}</h2>
        {isPopular && (
          <Badge variant="default" className="bg-blue-600 rounded-full font-semibold">
            Most Popular
          </Badge>
        )}
      </div>

      <p className="mt-3 text-muted-foreground text-sm">{plan.Description}</p>

      <div className="mt-4">
        {plan.Prices?.length === 0 ? (
          <>
            <span className="text-4xl font-semibold">Free</span>
            <span className="text-muted-foreground">/month</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-semibold">${(monthlyPrice / 1000000).toFixed(0)}</span>
            <span className="text-muted-foreground">/month</span>
            {yearlyPrice > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                or ${(yearlyPrice / 1000000).toFixed(0)}/year
              </div>
            )}
          </>
        )}
      </div>

      <Button className="mt-4" disabled={isCurrentPlan}>
        {isCurrentPlan ? 'Your current plan' : 'Subscribe'}
      </Button>

      <ul className="flex mt-6 gap-3 flex-col">
        {resources.cpu && (
          <li className="flex gap-2">
            <CircleCheck size={20} className="text-blue-600" />
            <span className="text-muted-foreground text-sm">{resources.cpu} CPU</span>
          </li>
        )}
        {resources.memory && (
          <li className="flex gap-2">
            <CircleCheck size={20} className="text-blue-600" />
            <span className="text-muted-foreground text-sm">{resources.memory} Memory</span>
          </li>
        )}
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">
            {plan.MaxSeats} Seat{plan.MaxSeats > 1 ? 's' : ''}
          </span>
        </li>
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">{plan.Traffic}GB Traffic</span>
        </li>
      </ul>
    </section>
  );
}

function UpgradePlanDialog({
  children,
  plans,
  isLoading
}: {
  children: React.ReactNode;
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[70rem] py-8 px-20 bg-zinc-50">
        <div className="flex flex-col justify-center">
          <section className="mt-6">
            <h1 className="text-3xl font-semibold text-center">Choose Your Workspace Plan</h1>
            <p className="text-zinc-500 text-center mt-2">
              Pricing Plans That Power Your Sealos Journey
            </p>
          </section>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div>Loading plans...</div>
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="flex pt-6 gap-3 overflow-x-auto">
              {plans.map((plan, index) => (
                <UpgradePlanCard
                  key={plan.ID}
                  plan={plan}
                  isPopular={index === 1} // 设置第二个为推荐
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">No plans available</div>
            </div>
          )}

          <Button variant="link" className="underline text-zinc-600 text-base mt-4" asChild>
            <a href="">Still wanna charge by volume?</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopupDialog() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline">TopupDialog</Button>
        </DialogTrigger>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>Credit Purchase</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <section className="w-full bg-plan-payg px-6 py-5 rounded-xl gap-1 flex flex-col">
              <span className="text-slate-500 text-sm">Balance</span>
              <span className="text-2xl font-semibold leading-none">$5.00</span>
            </section>

            <section>
              <div className="flex justify-between">
                <div className="font-medium">Select Amount</div>
                <div className="text-sm flex gap-1">
                  <Gift size={16} className="text-blue-600" />
                  <span>Earn Credits with Initial Purchase!</span>
                  <CircleHelp size={16} className="text-zinc-400" />
                </div>
              </div>

              <div className="mt-2">
                <RadioGroup defaultValue="16" className="grid grid-cols-3 gap-2">
                  <Label className="border w-full">
                    <RadioGroupItem value="16" />
                    <div className="p-4">$16</div>
                  </Label>

                  <Label>
                    <RadioGroupItem value="16" />
                    <div>$16</div>
                  </Label>

                  <Label>
                    <RadioGroupItem value="16" />
                    <div>$16</div>
                  </Label>
                </RadioGroup>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="submit">Pay with Stripe</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default function Plan() {
  const { session } = useSessionStore();
  const { getRegion, regionList } = useBillingStore();
  const region = getRegion();
  console.log('session', session, regionList, region);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plan-list'],
    queryFn: getPlanList
    // staleTime: 5 * 60 * 1000,
    // refetchOnWindowFocus: false
  });

  // Get current workspace subscription info

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription-info', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid)
  });

  console.log('subscriptionData', subscriptionData?.data?.subscription);

  return (
    <div className="bg-white gap-8 flex flex-col">
      <PlanHeader
        plans={plansData?.data?.plans}
        isLoading={plansLoading}
        subscription={subscriptionData?.data?.subscription}
      />

      {/* Balance card */}
      <div className="p-2 border shadow-sm rounded-2xl">
        <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-500">Balance</span>
            <span className="text-foreground text-2xl font-semibold leading-none">$5.00</span>
          </div>

          <div className="flex gap-4 items-center">
            <Button variant="outline">Redeem</Button>
            <Button variant="outline">Top Up</Button>
          </div>
        </div>
      </div>

      <AllPlansSection />

      <TopupDialog></TopupDialog>
    </div>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, ['zh', 'en']))
    }
  };
}
