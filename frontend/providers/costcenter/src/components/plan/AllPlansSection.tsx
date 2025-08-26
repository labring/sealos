import { Avatar, AvatarFallback, Button, TableCell, TableHead, TableRow } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { useQuery } from '@tanstack/react-query';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import { getWorkspaceSubscriptionList } from '@/api/plan';
import useBillingStore from '@/stores/billing';

export function AllPlansSection() {
  const { regionList } = useBillingStore();

  const { data: subscriptionListData, isLoading } = useQuery({
    queryKey: ['workspace-subscription-list'],
    queryFn: getWorkspaceSubscriptionList
  });

  const subscriptions = subscriptionListData?.data?.subscriptions || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr)
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      .replace(/\//g, '/')
      .replace(',', ' ');
  };

  const getPlanBadgeColor = (type?: string) => {
    switch (type) {
      case 'SUBSCRIPTION':
        return 'bg-blue-100 text-blue-600';
      case 'PAYG':
        return 'bg-plan-payg text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRegionName = (regionDomain?: string) => {
    const region = regionList.find((r) => r.domain === regionDomain);
    return region?.name?.en || region?.name?.zh || regionDomain || 'Unknown Region';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div>Loading subscriptions...</div>
      </div>
    );
  }

  if (!subscriptions.length) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">No subscriptions found</div>
      </div>
    );
  }

  // Group subscriptions by region
  const subscriptionsByRegion = subscriptions.reduce((acc: any, subscription: any) => {
    const regionKey = subscription.region_domain || subscription.RegionDomain || 'unknown';
    if (!acc[regionKey]) {
      acc[regionKey] = [];
    }
    acc[regionKey].push(subscription);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(subscriptionsByRegion).map(
        ([regionDomain, regionSubscriptions]: [string, any]) => (
          <TableLayout key={regionDomain}>
            <TableLayoutCaption className="font-medium text-base bg-zinc-50">
              {getRegionName(regionDomain)}
            </TableLayoutCaption>

            <TableLayoutContent>
              <TableLayoutHeadRow>
                <TableHead className="bg-transparent">Workspace</TableHead>
                <TableHead className="bg-transparent">Plan</TableHead>
                <TableHead className="bg-transparent">Renewal Time</TableHead>
                <TableHead className="bg-transparent">Status</TableHead>
                <TableHead className="bg-transparent">Action</TableHead>
              </TableLayoutHeadRow>

              <TableLayoutBody>
                {regionSubscriptions.map((subscription: any, index: number) => (
                  <TableRow key={subscription.id || subscription.ID || index}>
                    <TableCell className="h-14">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-5">
                          <AvatarFallback>
                            {(subscription.workspace ||
                              subscription.Workspace)?.[0]?.toUpperCase() || 'W'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {subscription.workspace || subscription.Workspace || 'Unknown Workspace'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPlanBadgeColor(subscription.type)} font-medium`}>
                        {subscription.plan_name ||
                          subscription.PlanName ||
                          subscription.type ||
                          'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(
                        subscription.current_period_end_at || subscription.CurrentPeriodEndAt
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{subscription.status || subscription.Status || 'Unknown'}</span>
                        <span className="text-gray-500">
                          {subscription.pay_status || subscription.PayStatus || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        {subscription.type === 'SUBSCRIPTION' ? 'Manage' : 'Subscribe'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableLayoutBody>
            </TableLayoutContent>
          </TableLayout>
        )
      )}
    </div>
  );
}
