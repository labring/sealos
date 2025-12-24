import { Flex } from 'antd';
import WorkloadStatusOverview from './status-overview';
import { convertToPieChartStatusData } from '@/utils/pie-chart';
import { countBy, entries, startCase } from 'lodash';
import {
  getDeploymentsStatuses,
  getStatefulSetsStatuses,
  useDeploymentStore,
  usePodStore,
  useStatefulSetStore
} from '@/store/kube';
import { Section } from '@/components/common/section/section';
import Title from '@/components/common/title/title';
import EventOverview from './event-overview';
import { useWatcher } from '@/hooks/useWatcher';

const OverviewPage = () => {
  const { items: pods, initialize: initializePods } = usePodStore();

  const getPodStatuses = countBy(pods, (pod) => pod.getStatus());

  const { items: deps, initialize: initializeDeployments } = useDeploymentStore();
  const { items: stats, initialize: initializeStatefulSets } = useStatefulSetStore();

  const cxtHolder = useWatcher({
    initializers: [initializePods, initializeDeployments, initializeStatefulSets]
  });

  const statuses = {
    Pod: convertToPieChartStatusData(getPodStatuses),
    Deployment: convertToPieChartStatusData(getDeploymentsStatuses(deps, pods)),
    StatefulSet: convertToPieChartStatusData(getStatefulSetsStatuses(stats, pods))
  };

  const overviewStatuses = entries(statuses).map(([key, value]) => ({
    title: startCase(key),
    data: value
  }));

  return (
    <Flex vertical gap="12px" className="p-0">
      <Section>
        <Title type="primary">Overview</Title>
        <div className="w-full flex flex-col flex-wrap gap-3 mt-2">
          <WorkloadStatusOverview data={overviewStatuses} />
        </div>
      </Section>
      <Section>
        <Title type="primary">Events</Title>
        <EventOverview />
      </Section>
    </Flex>
  );
};

export default OverviewPage;
