import AppLayout from './layout';
import OverviewPage from './kube-object/workload/overview/overview';
import { useState } from 'react';
import { SideNavItemKey } from './sidebar/sidebar';
import PodOverviewPage from './kube-object/workload/pod/pod';
import DeploymentOverviewPage from './kube-object/workload/deployment/deployment';
import StatefulSetOverviewPage from './kube-object/workload/statefulset/statefulset';
import ConfigMapOverviewPage from './kube-object/config/config-map/config-map';
import PersistentVolumeClaimOverviewPage from './kube-object/storage/volume-claim/volume-claim';
import { FloatButton } from 'antd';
import CreateResourceModal from './modal/create-resource-modal';
import { PlusOutlined } from '@ant-design/icons';

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
  const [openCreateResourceModal, setOpenCreateResourceModal] = useState(false);

  return (
    <AppLayout onClickSideNavItem={(key: SideNavItemKey) => setSideNavItemKey(key)}>
      {switchPage(sideNavItemKey)}
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        onClick={() => setOpenCreateResourceModal(true)}
      />
      <CreateResourceModal
        open={openCreateResourceModal}
        setClose={() => setOpenCreateResourceModal(false)}
      />
    </AppLayout>
  );
};

export default Home;
