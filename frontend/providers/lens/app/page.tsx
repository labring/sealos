'use client';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import {
  WorkloadStatusOverview,
  WorkloadTitle
} from '@/components/overview/workload-status-overview';
import { entries, isError, startCase } from 'lodash';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import { Box, Flex, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';
import { LoadingPage } from '@/components/common/loading';
import { StatefulSetOverviewTable } from '@/components/statefulset/statefulset-overview-table';
import { StatefulSetStore } from '@/k8s/store/statefulset.store';
import { PodStore } from '@/k8s/store/pod.store';
import { DeploymentStore } from '@/k8s/store/deployment.store';
import { EventStore } from '@/k8s/store/event.store';
import { ConfigMapStore } from '@/k8s/store/configmap.store';
import { PersistentVolumeClaimStore } from '@/k8s/store/pvc.store';
import { EventOverviewTable } from '@/components/overview/event-overview';
import { PodOverviewTable } from '@/components/pod/pod-overview-table';
import { DeploymentOverviewTable } from '@/components/deployment/deployment-overview-table';
import { ConfigMapOverviewTable } from '@/components/configmap/configmap-overview-table';
import { PVCOverviewTable } from '@/components/pvc/pvc-overview-table';
import { convertToPieChartStatusData } from '@/utils/piechart';
import { RequestController } from '@/utils/request-controller';

const podStore = new PodStore();
const deploymentStore = new DeploymentStore();
const statefulSetStore = new StatefulSetStore();
const eventStore = new EventStore();
const configMapStore = new ConfigMapStore();
const pvcStore = new PersistentVolumeClaimStore();

const OverviewPage = observer(() => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));

  useEffect(() => {
    const resp = createSealosApp();

    const fetchData = async () => {
      const tasks = [
        podStore.fetchData,
        deploymentStore.fetchData,
        statefulSetStore.fetchData,
        eventStore.fetchData,
        configMapStore.fetchData,
        pvcStore.fetchData
      ];

      const res = await requestController.current?.runTasks(tasks);
      res.forEach((r) => {
        if (r && isError(r)) {
          toast({
            status: 'error',
            description: r.message,
            isClosable: true,
            duration: 5000,
            position: 'top-right'
          });
        }
      });
    };

    (async () => {
      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        const oldSession = localStorage.getItem('session');
        if (newSession && newSession !== oldSession) {
          localStorage.setItem('session', newSession);
          window.location.reload();
        }
        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          localStorage.removeItem('session');
        }
      }
      await fetchData();
      setIsLoading(false);
    })();
    const interval = setInterval(fetchData, 10000);
    return () => {
      clearInterval(interval);
      resp();
    };
  }, []);

  if (isLoading) {
    return <LoadingPage />;
  }

  const statuses = {
    Pod: convertToPieChartStatusData(podStore.getPodsStatuses()),
    Deployment: convertToPieChartStatusData(
      deploymentStore.getDeploymentsStatuses((labels) => podStore.getByLabel(labels))
    ),
    StatefulSet: convertToPieChartStatusData(
      statefulSetStore.getStatefulSetsStatuses((ownerId) => podStore.getPodsByOwnerId(ownerId))
    )
  };
  const overviewData = entries(statuses).map(([key, value]) => ({
    title: startCase(key) as WorkloadTitle,
    data: value
  }));

  return (
    <Flex
      flexFlow="column wrap"
      justify={'center'}
      overflowY={'auto'}
      overflowX={'hidden'}
      maxW={'100vw'}
    >
      <Box flex={1} maxW={'100vw'}>
        <Box>Workload Status Overview</Box>
        <WorkloadStatusOverview data={overviewData} />
      </Box>
      <Tabs flex={1}>
        <TabList>
          <Tab>Events</Tab>
          <Tab>Pods</Tab>
          <Tab>Deployments</Tab>
          <Tab>StatefulSets</Tab>
          <Tab>ConfigMaps</Tab>
          <Tab>Persistent Volumes Claims</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <EventOverviewTable data={eventStore.getEventsData()} />
          </TabPanel>
          <TabPanel>
            <PodOverviewTable pods={podStore.items} />
          </TabPanel>
          <TabPanel>
            <DeploymentOverviewTable deployments={deploymentStore.items} />
          </TabPanel>
          <TabPanel>
            <StatefulSetOverviewTable
              data={statefulSetStore.items.map((item) => ({
                statefulSet: item,
                childPods: podStore.getPodsByOwnerId(item.getId())
              }))}
            />
          </TabPanel>
          <TabPanel>
            <ConfigMapOverviewTable configMaps={configMapStore.items} />
          </TabPanel>
          <TabPanel>
            <PVCOverviewTable pvcs={pvcStore.items} pods={podStore.items} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  );
});

export default OverviewPage;
