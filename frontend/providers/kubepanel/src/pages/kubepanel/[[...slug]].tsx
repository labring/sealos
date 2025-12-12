import AppLayout from './layout';
import OverviewPage from '@/components/kubepanel-views/workload/overview/overview';
import { useState, useEffect } from 'react';
import { SideNavItemKey } from '../../components/common/sidebar/sidebar';
import { useRouter } from 'next/router';
import PodOverviewPage from '@/components/kubepanel-views/workload/pod/pod';
import DeploymentOverviewPage from '@/components/kubepanel-views/workload/deployment/deployment';
import StatefulSetOverviewPage from '@/components/kubepanel-views/workload/statefulset/statefulset';
import ConfigMapOverviewPage from '@/components/kubepanel-views/config/config-map/config-map';
import PersistentVolumeClaimOverviewPage from '@/components/kubepanel-views/storage/volume-claim/volume-claim';
import { FloatButton } from 'antd';
import { CreateResourceModal } from '@/components/common/action/create-resource-modal';
import { PlusOutlined } from '@ant-design/icons';
import SecretOverviewPage from '@/components/kubepanel-views/config/secret/secret';
import IngressOverviewPage from '@/components/kubepanel-views/network/ingress/ingress';
import ServiceOverviewPage from '@/components/kubepanel-views/network/service/service';
import DevboxPage from '@/components/kubepanel-views/custom-resource/devbox/devbox';
import ClusterPage from '@/components/kubepanel-views/custom-resource/cluster/cluster';
import BucketPage from '@/components/kubepanel-views/custom-resource/bucket/bucket';

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
    case SideNavItemKey.Secret:
      return <SecretOverviewPage />;
    case SideNavItemKey.Ingress:
      return <IngressOverviewPage />;
    case SideNavItemKey.Service:
      return <ServiceOverviewPage />;
    case SideNavItemKey.Devbox:
      return <DevboxPage />;
    case SideNavItemKey.Cluster:
      return <ClusterPage />;
    case SideNavItemKey.Bucket:
      return <BucketPage />;
    default:
      return <OverviewPage />;
  }
};

const Home = () => {
  const router = useRouter();
  const [sideNavItemKey, setSideNavItemKey] = useState(SideNavItemKey.Overview);
  const [openCreateResourceModal, setOpenCreateResourceModal] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      const { slug } = router.query;
      const currentTab = Array.isArray(slug) && slug.length > 0 ? slug[0] : SideNavItemKey.Overview;
      const key = Object.values(SideNavItemKey).find((k) => k === currentTab);
      if (key) {
        setSideNavItemKey(key);
      }
    }
  }, [router.isReady, router.query.slug]);

  const handleSideNavClick = (key: SideNavItemKey) => {
    setSideNavItemKey(key);
    const path = key === SideNavItemKey.Overview ? '/kubepanel' : `/kubepanel/${key}`;
    router.push(path, undefined, { shallow: true });
  };

  return (
    <AppLayout onClickSideNavItem={handleSideNavClick} selectedKey={sideNavItemKey}>
      {switchPage(sideNavItemKey)}
      <FloatButton
        icon={<PlusOutlined />}
        tooltip="Create a resource."
        style={{
          left: 24,
          bottom: 30,
          width: 48,
          height: 48
        }}
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
