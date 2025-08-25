import { ConfigProvider, Layout } from 'antd';
import { ResourceSideNav, SideNavItemKey } from '@/components/common/sidebar/sidebar';
import { theme } from '@/constants/theme';
import { useCallback, useState } from 'react';
import { CollapseType } from 'antd/es/layout/Sider';

const { Sider, Content } = Layout;

interface Props {
  children: React.ReactNode;
  onClickSideNavItem?: (key: SideNavItemKey) => void;
}

type CollapseCallback = (collapsed: boolean, type: CollapseType) => void;

const siderWidth = 256;
const collapsedWidth = 0;

export default function AppLayout({ children, onClickSideNavItem }: Props) {
  const [contentMargin, setContentMargin] = useState(siderWidth);

  const onCollapse = useCallback<CollapseCallback>((collapsed, _) => {
    setContentMargin(collapsed ? collapsedWidth : siderWidth);
  }, []);

  return (
    <ConfigProvider theme={theme}>
      <Layout>
        <Sider
          style={{
            height: '100vh',
            backgroundColor: '#f4f4f7',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0
          }}
          width={siderWidth}
          theme="light"
          onCollapse={onCollapse}
          breakpoint="lg"
          collapsedWidth={collapsedWidth}
        >
          <ResourceSideNav onClick={onClickSideNavItem} />
        </Sider>
        <Layout style={{ marginLeft: contentMargin }}>
          <Content
            style={{
              backgroundColor: '#ffffff',
              height: '100vh',
              borderRadius: '1.5%'
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
