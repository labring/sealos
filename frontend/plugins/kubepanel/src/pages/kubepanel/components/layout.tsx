import { Layout } from 'antd';
import ResourceSideNav, { SideNavItemKey } from './sidebar/sidebar';

const { Header, Footer, Sider, Content } = Layout;

interface Props {
  children: React.ReactNode;
  onClickSideNavItem?: (key: SideNavItemKey) => void;
}

export default function AppLayout({ children, onClickSideNavItem }: Props) {
  return (
    <Layout>
      {/* <Header>Header</Header> */}
      <Layout hasSider>
        <Sider width={256} theme="light" breakpoint="lg" collapsedWidth="0">
          <ResourceSideNav onClick={onClickSideNavItem} />
        </Sider>
        <Content style={{ margin: '24px' }}>{children}</Content>
      </Layout>
      {/* <Footer>Footer</Footer> */}
    </Layout>
  );
}
