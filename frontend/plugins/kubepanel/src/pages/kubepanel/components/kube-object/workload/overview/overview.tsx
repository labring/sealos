import { Flex } from 'antd';
import WorkloadStatusOverview from './status-overview';
import { convertToPieChartStatusData } from '@/utils/pie-chart';
import { entries, startCase } from 'lodash';
import { useCallback, useEffect } from 'react';
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
import { APICallback } from '@/types/state';
import useNotification from 'antd/lib/notification/useNotification';

const OverviewPage = () => {
  const { items: pods, initialize: initializePods, getStatuses: getPodStatuses } = usePodStore();
  const { items: deps, initialize: initializeDeployments } = useDeploymentStore();
  const { items: stats, initialize: initializeStatefulSets } = useStatefulSetStore();
  const [notifyApi, cxtHolder] = useNotification();
  const callback = useCallback<APICallback>(
    (_, e) => {
      if (e) {
        notifyApi.error({
          message: e.error.reason,
          description: e.error.message,
          duration: 5
        });
      }
    },
    [notifyApi]
  );

  useEffect(() => {
    initializePods(callback);
    initializeDeployments(callback);
    initializeStatefulSets(callback);
  }, []);

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
    <Flex vertical gap="12px">
      <Section>
        <Title type="primary">Overview</Title>
      </Section>
      <Section>
        {cxtHolder}
        <WorkloadStatusOverview data={overviewStatuses} />
      </Section>
      <Section>
        <Title type="primary">Events</Title>
        <EventOverview />
      </Section>
    </Flex>
  );
};

export default OverviewPage;
