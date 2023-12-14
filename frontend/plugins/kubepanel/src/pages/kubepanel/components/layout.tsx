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
        <Sider
          style={{
            overflow: 'auto',
            height: '100vh',
            backgroundColor: '#F2F2F4',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0
          }}
          width={256}
          theme="light"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <ResourceSideNav onClick={onClickSideNavItem} />
        </Sider>
        <Layout style={{ marginLeft: 256 }}>
          <Content style={{ backgroundColor: '#F2F2F4' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
