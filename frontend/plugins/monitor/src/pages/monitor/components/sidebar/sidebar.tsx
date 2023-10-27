import { DashboardOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

export enum SideNavItemKey {
  Overview = 'overview',
  Pod = 'pod',
  Deployment = 'deployment',
  ConfigMap = 'config-map',
  PersistentVolumeClaim = 'pvc',
  StatefulSet = 'stateful-set'
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
  getItem('Workload', 'workload', <DashboardOutlined rev={undefined} />, [
    getItem('Overview', SideNavItemKey.Overview),
    getItem('Pod', SideNavItemKey.Pod),
    getItem('Deployment', SideNavItemKey.Deployment),
    getItem('StatefulSet', SideNavItemKey.StatefulSet)
  ]),
  getItem('Config', 'config', <SettingOutlined rev={undefined}/>, [getItem('ConfigMap', SideNavItemKey.ConfigMap)]),
  getItem('Storage', 'storage', <DatabaseOutlined rev={undefined} />, [
    getItem('Persistent Volume Claim', SideNavItemKey.PersistentVolumeClaim)
  ])
];

interface Props {
  onClick?: (key: SideNavItemKey) => void;
}

const ResourceSideNav = ({ onClick = () => {} }: Props) => {
  return (
    <Menu
      style={{ height: '100vh', overflowY: 'auto' }}
      defaultSelectedKeys={['overview']}
      defaultOpenKeys={['workload']}
      mode="inline"
      items={items}
      onClick={({ key }) => onClick(key as SideNavItemKey)}
    />
  );
};

export default ResourceSideNav;
