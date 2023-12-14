import { deleteResource } from '@/api/kubernetes';
import { KubeObject } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { Button, Input, Modal, message } from 'antd';
import { useState } from 'react';

interface Props<K extends KubeObject> {
  obj: K;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const DeleteWarningModal = <K extends KubeObject = KubeObject>({
  obj,
  open,
  onCancel,
  onOk
}: Props<K>) => {
  if (!obj) return null;

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'deletedMsg';

  return (
    <>
      {contextHolder}
      <Modal
        title={<div>Delete Warning</div>}
        open={open}
        onCancel={onCancel}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            onClick={() => {
              msgApi.loading({ content: 'Deleting...', key: msgKey, duration: 0 });
              deleteResource(obj.kind, obj.getName())
                .then((res) => {
                  msgApi.success({
                    content: `Successfully deleted ${res.data.kind} ${res.data.metadata.name}`,
                    key: msgKey
                  });
                  onOk();
                })
                .catch((err) => {
                  const errResp = buildErrorResponse(err);
                  msgApi.error({
                    content: `Failed to update ${obj.kind} ${obj.getName()}: ${
                      errResp.error.message
                    }`,
                    key: msgKey
                  });
                });
            }}
            danger
            disabled={!isConfirmed}
          >
            Confirm
          </Button>
        ]}
      >
        <div>
          <p className="text-center mb-2">
            Are you sure to delete <span className="font-bold">{obj.getName()}</span>?
          </p>
          <p className="text-center">
            Please enter <span className="font-semibold">Confirm</span> to confirm deletion:
          </p>
          <Input
            onChange={(e) => {
              setIsConfirmed(e.target.value === 'Confirm');
            }}
          />
        </div>
      </Modal>
    </>
  );
};

export default DeleteWarningModal;
