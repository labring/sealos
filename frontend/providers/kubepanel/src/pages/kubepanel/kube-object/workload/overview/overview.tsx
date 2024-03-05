import { Flex } from 'antd';
import WorkloadStatusOverview from './status-overview';
import { convertToPieChartStatusData } from '@/utils/pie-chart';
import { entries, startCase } from 'lodash';
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
  const {
    items: pods,
    initialize: initializePods,
    watch: watchPods,
    getStatuses: getPodStatuses
  } = usePodStore();
  const {
    items: deps,
    initialize: initializeDeployments,
    watch: watchDeployments
  } = useDeploymentStore();
  const {
    items: stats,
    initialize: initializeStatefulSets,
    watch: watchStatefulSets
  } = useStatefulSetStore();

  const cxtHolder = useWatcher({
    initializers: [initializePods, initializeDeployments, initializeStatefulSets],
    watchers: [watchPods, watchDeployments, watchStatefulSets]
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
    <Flex vertical gap="15px" className="bg-[#f4f4f7]">
      <Section>
        <Title type="primary">Overview</Title>
      </Section>
      <div className="w-full bg-white px-5  flex flex-col flex-wrap gap-3 rounded-lg">
        <WorkloadStatusOverview data={overviewStatuses} />
      </div>
      <Section>
        <Title type="primary">Events</Title>
        <EventOverview />
      </Section>
    </Flex>
  );
};

export default OverviewPage;
