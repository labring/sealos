import { ApiResp } from '@/services/kubernet';
import { Button, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';

interface Props {
  targetName: string;
  open: boolean;
  onDelete: () => Promise<ApiResp>;
  onCancel: () => void;
  onOk: () => void;
}

const DeleteWarningModal = ({ targetName, open, onDelete, onCancel, onOk }: Props) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!confirmed) return;
    const deleteRequest = async () => {
      const resp = await onDelete();
      if (resp.code === 200) {
        msgApi.success('Successfully deleted');
      } else {
        msgApi.error(`Failed to delete: ${resp.data.message}`);
      }
      setConfirmed(false);
      onOk();
    };

    deleteRequest();
  }, [confirmed]);

  return (
    <>
      {contextHolder}
      <Modal
        title={<div>Delete Warning</div>}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="confirm" onClick={() => setConfirmed(true)} danger disabled={!isConfirmed}>
            Confirm
          </Button>
        ]}
        open={open}
        onCancel={onCancel}
      >
        <div>
          <p className="text-center mb-2">
            Are you sure to delete <span className="font-bold">{targetName}</span>?
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
