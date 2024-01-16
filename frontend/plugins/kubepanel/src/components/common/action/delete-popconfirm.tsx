import { deleteResource } from '@/api/kubernetes';
import { KubeObject } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { WarningOutlined } from '@ant-design/icons';
import { Popconfirm, message } from 'antd';
import { useState } from 'react';

interface Props<K extends KubeObject> {
  obj: K;
  children: React.ReactNode;
}

export function DeletePopconfirm<K extends KubeObject = KubeObject>({ obj, children }: Props<K>) {
  if (!obj) return null;
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'deletedMsg';
  return (
    <>
      {contextHolder}
      <Popconfirm
        title={'Delete Resource'}
        description={
          <>
            Are you sure to delete{' '}
            <span className="text-[#0884DD]">
              {obj.kind}: {obj.getName()}
            </span>
            ?
          </>
        }
        icon={<WarningOutlined className="text-red-500" />}
        onConfirm={() => {
          setConfirmLoading(true);
          deleteResource(obj.kind, obj.getName())
            .then((res) => {
              msgApi.success({
                content: `Successfully deleted ${res.data.kind} ${res.data.metadata.name}`,
                key: msgKey
              });
            })
            .catch((err) => {
              const errResp = buildErrorResponse(err);
              msgApi.error({
                content: `Failed to update ${obj.kind} ${obj.getName()}: ${errResp.error.message}`,
                key: msgKey
              });
            })
            .finally(() => {
              setConfirmLoading(false);
            });
        }}
        okText="Yes"
        okButtonProps={{ loading: confirmLoading }}
        cancelText="No"
      >
        {children}
      </Popconfirm>
    </>
  );
}
