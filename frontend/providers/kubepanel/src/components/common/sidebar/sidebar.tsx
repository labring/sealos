import {
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GatewayOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Button, Flex, Menu, MenuProps } from 'antd';
import { useRouter } from 'next/router';

type MenuItem = Required<MenuProps>['items'][number];

export enum SideNavItemKey {
  Overview = 'overview',
  Pod = 'pod',
  Deployment = 'deployment',
  ConfigMap = 'config-map',
  PersistentVolumeClaim = 'volume-claim',
  StatefulSet = 'stateful-set',
  Secret = 'secret',
  Ingress = 'ingress',
  Service = 'service',
  // CustomResource
  Devbox = 'devbox',
  Cluster = 'cluster',
  Bucket = 'bucket'
}

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type
  } as MenuItem;
}

const items: MenuProps['items'] = [
  getItem('Workload', 'workload', <DashboardOutlined />, [
    getItem('Overview', SideNavItemKey.Overview),
    getItem('Pods', SideNavItemKey.Pod),
    getItem('Deployments', SideNavItemKey.Deployment),
    getItem('Stateful Sets', SideNavItemKey.StatefulSet)
  ]),
  getItem('Config', 'config', <SettingOutlined />, [
    getItem('Config Maps', SideNavItemKey.ConfigMap),
    getItem('Secrets', SideNavItemKey.Secret)
  ]),
  getItem('Network', 'network', <GatewayOutlined />, [
    getItem('Ingress', SideNavItemKey.Ingress),
    getItem('Service', SideNavItemKey.Service)
  ]),
  getItem('Storage', 'storage', <DatabaseOutlined />, [
    getItem('Persistent Volume Claims', SideNavItemKey.PersistentVolumeClaim)
  ]),
  getItem('CustomResource', 'custom-resource', <AppstoreOutlined />, [
    getItem('Devbox', SideNavItemKey.Devbox),
    getItem('Cluster', SideNavItemKey.Cluster),
    getItem('Bucket', SideNavItemKey.Bucket)
  ])
];

interface Props {
  onClick?: (key: SideNavItemKey) => void;
  selectedKey?: SideNavItemKey;
}

export const ResourceSideNav = ({
  onClick = () => {},
  selectedKey = SideNavItemKey.Overview
}: Props) => {
  const router = useRouter();

  return (
    <Flex vertical className="h-full bg-[#FAFAFA] border-r border-[#E8E8E8]">
      <div className="px-4.5 py-3 w-full">
        <div className="flex justify-between items-center">
          <div className="text-[#262626] text-[16px] font-semibold pl-2 align-middle">
            <span>KubePanel</span>
          </div>
          <Button
            className="flex items-center justify-center hover:bg-black/5"
            type="text"
            icon={<ReloadOutlined style={{ color: '#18181B', fontSize: 'large' }} />}
            onClick={() => router.reload()}
          />
        </div>
      </div>
      <Menu
        className="kubepanel-sidebar-menu"
        style={{ backgroundColor: 'transparent', borderRight: 'none', fontWeight: 500 }}
        selectedKeys={[selectedKey]}
        defaultOpenKeys={['workload']}
        mode="inline"
        items={items}
        onClick={({ key }) => onClick(key as SideNavItemKey)}
      />
    </Flex>
  );
};
