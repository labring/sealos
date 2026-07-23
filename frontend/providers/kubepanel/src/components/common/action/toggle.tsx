import { KubeObjectKind } from '@/constants/kube-object';
import {
  DashboardOutlined,
  DatabaseOutlined,
  DownOutlined,
  GatewayOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Dropdown, MenuProps, Space } from 'antd';
import { useCallback, useState } from 'react';

const items: MenuProps['items'] = [
  {
    key: 'Workload',
    label: 'Workload',
    icon: <DashboardOutlined />,
    children: [
      {
        key: KubeObjectKind.Pod,
        label: 'Pod'
      },
      {
        key: KubeObjectKind.Deployment,
        label: 'Deployment'
      },
      {
        key: KubeObjectKind.StatefulSet,
        label: 'Stateful Set'
      }
    ]
  },
  {
    key: 'Network',
    label: 'Network',
    icon: <GatewayOutlined />,
    children: [
      {
        key: KubeObjectKind.Ingress,
        label: 'Ingress'
      }
    ]
  },
  {
    key: 'Config',
    label: 'Config',
    icon: <SettingOutlined />,
    children: [
      {
        key: KubeObjectKind.ConfigMap,
        label: 'Config Map'
      },
      {
        key: KubeObjectKind.Secret,
        label: 'Secret'
      }
    ]
  },
  {
    key: 'Storage',
    label: 'Storage',
    icon: <DatabaseOutlined />,
    children: [
      {
        key: KubeObjectKind.PersistentVolumeClaim,
        label: 'Persistent Volume Claim'
      }
    ]
  }
];

export type TemplateToggleChooseEventHandler = (kind: KubeObjectKind) => void;

interface TemplateToggleProps {
  onChoose: TemplateToggleChooseEventHandler;
}

const placeholder = 'Choose a Template';

export function TemplateToggle({ onChoose }: TemplateToggleProps) {
  const [input, setInput] = useState(placeholder);
  const [hovered, setHovered] = useState(false);

  const onClick = useCallback<Required<MenuProps>['onClick']>(
    (e) => {
      setInput(e.key);
      onChoose(e.key as KubeObjectKind);
    },
    [setInput, onChoose]
  );

  return (
    <div>
      <Dropdown menu={{ items, onClick }} onOpenChange={(e) => setHovered(e)}>
        <Space
          size={10}
          className={`transition duration-500 px-2.5 py-1.5 cursor-pointer ${
            hovered ? 'bg-[#9699B41A]' : input !== placeholder ? 'bg-[#9699B41A]' : 'bg-none'
          } rounded-lg`}
        >
          <span
            className={`transition duration-500 text-sm ${
              hovered ? 'text-[#0884DD]' : 'text-[#485264]'
            }`}
          >
            {input}
          </span>
          <DownOutlined className="text-[8px] text-[#485264]" />
        </Space>
      </Dropdown>
    </div>
  );
}
