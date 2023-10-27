import { Flex } from 'antd';
import WorkloadStatusOverview from './status-overview';
import { convertToPieChartStatusData } from '@/utils/pie-chart';
import { DEPLOYMENT_STORE, POD_STORE, STATEFUL_SET_STORE } from '@/store/static';
import { entries, startCase } from 'lodash';
import { observer } from 'mobx-react';
import { useRef } from 'react';
import { RequestController } from '@/utils/request-controller';
import { useQuery } from '@tanstack/react-query';

const OverviewPage = () => {
  const requestController = useRef(new RequestController({ timeoutDuration: 10000 }));

  useQuery(
    ['pods', 'deployments', 'statefulSets'],
    () => {
      const tasks = [POD_STORE.fetchData, DEPLOYMENT_STORE.fetchData, STATEFUL_SET_STORE.fetchData];
      return requestController.current.runTasks(tasks);
    },
    {
      refetchInterval: 10000
    }
  );

  const statuses = {
    Pod: convertToPieChartStatusData(POD_STORE.getPodsStatuses()),
    Deployment: convertToPieChartStatusData(
      DEPLOYMENT_STORE.getDeploymentsStatuses((labels) => POD_STORE.getByLabel(labels))
    ),
    StatefulSet: convertToPieChartStatusData(
      STATEFUL_SET_STORE.getStatefulSetsStatuses((ownerId) => POD_STORE.getPodsByOwnerId(ownerId))
    )
  };

  const overviewStatuses = entries(statuses).map(([key, value]) => ({
    title: startCase(key),
    data: value
  }));

  return (
    <Flex vertical justify="space-between">
      <div className="p-4 mb-4 text-xl font-light bg-white shadow-sm ">Overview</div>
      <WorkloadStatusOverview data={overviewStatuses} />
    </Flex>
  );
};

export default observer(OverviewPage);
