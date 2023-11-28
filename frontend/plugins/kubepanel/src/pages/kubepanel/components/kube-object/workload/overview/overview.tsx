import { Flex } from 'antd';
import WorkloadStatusOverview from './status-overview';
import { convertToPieChartStatusData } from '@/utils/pie-chart';
import { entries, startCase } from 'lodash';
import { useRef } from 'react';
import { RequestController } from '@/utils/request-controller';
import { useQuery } from '@tanstack/react-query';
import {
  fetchData,
  getDeploymentsStatuses,
  getStatefulSetsStatuses,
  useDeploymentStore,
  usePodStore,
  useStatefulSetStore
} from '@/store/kube';
import { Resources } from '@/constants/kube-object';

const OverviewPage = () => {
  const requestController = useRef(new RequestController({ timeoutDuration: 10000 }));
  const { items: pods, replace: podReplace, getStatuses: getPodStatuses } = usePodStore();
  const { items: deps, replace: deploymentReplace } = useDeploymentStore();
  const { items: stats, replace: statefulSetReplace } = useStatefulSetStore();

  useQuery(
    ['pods', 'deployments', 'statefulSets'],
    () => {
      const tasks = [
        () => fetchData(podReplace, Resources.Pods),
        () => fetchData(deploymentReplace, Resources.Deployments),
        () => fetchData(statefulSetReplace, Resources.StatefulSets)
      ];
      return requestController.current.runTasks(tasks);
    },
    {
      refetchInterval: 10000
    }
  );

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
    <Flex vertical justify="space-between">
      <div className="p-4 mb-4 text-2xl font-medium">Overview</div>
      <WorkloadStatusOverview data={overviewStatuses} />
    </Flex>
  );
};

export default OverviewPage;
