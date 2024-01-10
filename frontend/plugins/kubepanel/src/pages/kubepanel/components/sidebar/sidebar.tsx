import {
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
  Ingress = 'ingress'
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
  getItem('Network', 'network', <GatewayOutlined />, [getItem('Ingress', SideNavItemKey.Ingress)]),
  getItem('Storage', 'storage', <DatabaseOutlined />, [
    getItem('Persistent Volume Claims', SideNavItemKey.PersistentVolumeClaim)
  ])
];

interface Props {
  onClick?: (key: SideNavItemKey) => void;
}

const ResourceSideNav = ({ onClick = () => {} }: Props) => {
  const router = useRouter();

  return (
    <Flex vertical>
      <div className="border-b-[1px] border-color-border border-solid px-[18px] py-[12px] w-full">
        <div className="flex justify-between align-middle">
          <div className="text-[#24282C] text-[16px] font-medium p-1">KubePanel</div>
          <Button
            type="text"
            icon={<ReloadOutlined style={{ color: '#219BF4', fontSize: 'large' }} />}
            onClick={() => router.reload()}
          />
        </div>
      </div>
      <Menu
        style={{ backgroundColor: '#F2F2F4', borderRight: 'none', fontWeight: 600 }}
        defaultSelectedKeys={['overview']}
        defaultOpenKeys={['workload']}
        mode="inline"
        items={items}
        onClick={({ key }) => onClick(key as SideNavItemKey)}
      />
    </Flex>
  );
};

export default ResourceSideNav;
