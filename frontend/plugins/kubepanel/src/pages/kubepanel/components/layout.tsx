import { ConfigProvider, Layout } from 'antd';
import ResourceSideNav, { SideNavItemKey } from './sidebar/sidebar';
import { theme } from '@/constants/theme';

const { Header, Footer, Sider, Content } = Layout;

interface Props {
  children: React.ReactNode;
  onClickSideNavItem?: (key: SideNavItemKey) => void;
}

export default function AppLayout({ children, onClickSideNavItem }: Props) {
  return (
    <ConfigProvider theme={theme}>
      <Layout>
        <Sider width={256} theme="light" breakpoint="lg" collapsedWidth="0">
          <ResourceSideNav onClick={onClickSideNavItem} />
        </Sider>
        <Layout>
          <Content style={{ backgroundColor: '#F2F2F4' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
