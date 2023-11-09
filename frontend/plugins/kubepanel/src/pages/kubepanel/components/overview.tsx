import AppLayout from './layout';
import OverviewPage from './workload/overview/overview';
import { useState } from 'react';
import { SideNavItemKey } from './sidebar/sidebar';
import PodOverviewPage from './workload/pod/pod';
import DeploymentOverviewPage from './workload/deployment/deployment';
import StatefulSetOverviewPage from './workload/statefulset/statefulset';
import ConfigMapOverviewPage from './config/config-map/config-map';
import PersistentVolumeClaimOverviewPage from './storage/volume-claim/volume-claim';

const switchPage = (key: SideNavItemKey): React.ReactNode => {
  switch (key) {
    case SideNavItemKey.Overview:
      return <OverviewPage />;
    case SideNavItemKey.Pod:
      return <PodOverviewPage />;
    case SideNavItemKey.Deployment:
      return <DeploymentOverviewPage />;
    case SideNavItemKey.StatefulSet:
      return <StatefulSetOverviewPage />;
    case SideNavItemKey.ConfigMap:
      return <ConfigMapOverviewPage />;
    case SideNavItemKey.PersistentVolumeClaim:
      return <PersistentVolumeClaimOverviewPage />;
    default:
      return <OverviewPage />;
  }
};

const Home = () => {
  const [sideNavItemKey, setSideNavItemKey] = useState(SideNavItemKey.Overview);

  return (
    <AppLayout onClickSideNavItem={(key: SideNavItemKey) => setSideNavItemKey(key)}>
      {switchPage(sideNavItemKey)}
    </AppLayout>
  );
};

export default Home;
