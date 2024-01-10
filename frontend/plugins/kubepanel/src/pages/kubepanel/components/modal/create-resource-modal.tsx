import { KubeObjectKind } from '@/constants/kube-object';
import { Editor } from '@monaco-editor/react';
import { editor as EditorNS } from 'monaco-editor';
import { Button, Cascader, Modal, Spin, message } from 'antd';
import { BaseOptionType } from 'antd/lib/cascader';
import React, { useEffect, useRef, useState } from 'react';
import { createResource, getTemplate } from '@/api/kubernetes';
import {
  DashboardOutlined,
  DatabaseOutlined,
  GatewayOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons';

interface Props {
  open: boolean;
  setClose: () => void;
}

interface Option extends BaseOptionType {
  value: string;
  label: React.ReactNode;
  children?: Option[];
}

// function: render icon+label
const labelRender = (icon: React.ReactNode, label: string) => {
  return (
    <span>
      {icon}
      <span className="ml-2">{label}</span>
    </span>
  );
};

const options: Option[] = [
  {
    value: 'workload',
    label: labelRender(<DashboardOutlined />, 'workload'),
    children: [
      {
        value: KubeObjectKind.Pod,
        label: 'Pod'
      },
      {
        value: KubeObjectKind.Deployment,
        label: 'Deployment'
      },
      {
        value: KubeObjectKind.StatefulSet,
        label: 'Stateful Set'
      }
    ]
  },
  {
    value: 'network',
    label: labelRender(<GatewayOutlined />, 'network'),
    children: [
      {
        value: KubeObjectKind.Ingress,
        label: 'Ingress'
      }
    ]
  },
  {
    value: 'config',
    label: labelRender(<SettingOutlined />, 'config'),
    children: [
      {
        value: KubeObjectKind.ConfigMap,
        label: 'Config Map'
      },
      {
        value: KubeObjectKind.Secret,
        label: 'Secret'
      }
    ]
  },
  {
    value: 'storage',
    label: labelRender(<DatabaseOutlined />, 'storage'),
    children: [
      {
        value: KubeObjectKind.PersistentVolumeClaim,
        label: 'Persistent Volume Claim'
      }
    ]
  }
];

const defaultTemplate = 'please choose a template.';

const CreateResourceModal = ({ open, setClose }: Props) => {
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [optionValue, setOptionValue] = useState<KubeObjectKind>();
  const [template, setTemplate] = useState<string>(defaultTemplate);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();

  const editorRef = useRef<EditorNS.IStandaloneCodeEditor | null>(null);
  const onEditorMount = (editor: EditorNS.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const onChange = (value: (string | number)[]) => {
    if (!value || value.length === 0) {
      setDisabled(true);
      setTemplate(defaultTemplate);
      return;
    }
    setDisabled(false);
    setOptionValue(value[value.length - 1] as KubeObjectKind);
    setLoading(true);
  };

  useEffect(() => {
    if (!optionValue) return;
    const fetchTemplate = async () => {
      const storage = localStorage.getItem(`template-${optionValue}`);
      if (!storage) {
        try {
          const data = await getTemplate(optionValue).then((res) => res.data);
          localStorage.setItem(`template-${optionValue}`, data);
          setTemplate(data);
        } catch (err) {
          // TODO: handle error and give a retry button
          msgApi.error('Failed to fetch template');
          console.error(err);
        }
      } else {
        setTemplate(storage);
      }
      setLoading(false);
    };

    fetchTemplate();
  }, [msgApi, optionValue]);

  useEffect(() => {
    if (!confirmLoading || !optionValue) return;
    const postRequest = async () => {
      if (!editorRef.current) return;
      try {
        const response = await createResource(optionValue, editorRef.current.getValue());
        if (response.code !== 201) {
          msgApi.error(`Failed to create resource: ${response.data.message}`);
        } else {
          msgApi.success('Successfully created resource');
        }
      } catch (err) {
        msgApi.error(`Failed to create resource: ${err}`);
        console.error(err);
      }

      setConfirmLoading(false);
    };

    postRequest();
  }, [confirmLoading, msgApi, optionValue]);

  const onCreate = () => {
    setConfirmLoading(true);
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={'Create Resource'}
        onCancel={setClose}
        onOk={setClose}
        footer={[
          <Button key="cancel" onClick={setClose} className="w-20">
            Cancel
          </Button>,
          <Button
            key="create"
            loading={confirmLoading}
            type="primary"
            onClick={onCreate}
            disabled={disabled}
            className="w-20"
          >
            Create
          </Button>
        ]}
      >
        <div className="pb-3">
          <Cascader
            onChange={onChange}
            placeholder="Choose a Template"
            options={options}
            bordered={false}
            autoClearSearchValue
            className=" rounded-md"
            style={{ width: '200px' }}
          />
        </div>
        <Spin spinning={loading}>
          <div className="border-solid rounded-md border-2	border-[#DFE2EA] p-1">
            <Editor
              onMount={onEditorMount}
              height={'70vh'}
              language="yaml"
              value={template}
              options={{
                readOnly: disabled,
                minimap: { enabled: false },
                scrollbar: {
                  vertical: 'hidden'
                },
                rulers: []
              }}
            />
          </div>
        </Spin>
      </Modal>
    </>
  );
};

export default CreateResourceModal;
