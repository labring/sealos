import { KubeRecord } from '@/components/kube/kube-record';
import { Collapse, ConfigProvider } from 'antd';

interface Props {
  children: React.ReactNode;
  header?: {
    name: string;
    value?: React.ReactNode;
  };
}
const DrawerCollapse = ({ children, header }: Props) => {
  if (!header) return null;
  return (
    <ConfigProvider
      theme={{
        components: {
          Collapse: {
            headerPadding: 0
          }
        }
      }}
    >
      <Collapse
        className="py-2 bg-transparent rounded-none border-b border-solid border-color-border"
        expandIconPosition="end"
        bordered={false}
      >
        <Collapse.Panel
          header={<KubeRecord padding={false} name={header.name} value={header.value} />}
          key="1"
        >
          {children}
        </Collapse.Panel>
      </Collapse>
    </ConfigProvider>
  );
};

export default DrawerCollapse;
