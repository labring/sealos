import { BarsOutlined, CloseOutlined, RetweetOutlined } from '@ant-design/icons';
import { Button, type MenuProps, Dropdown } from 'antd';
import DeleteWarningModal from './delete-waring-modal';
import { useState } from 'react';
import { ApiResp } from '@/services/kubernet';

interface Props {
  targetName: string;
  onDelete?: () => Promise<ApiResp>;
  onUpdate?: () => void;
}

const ActionButton = ({ targetName, onDelete, onUpdate }: Props) => {
  const [open, setOpen] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'delete',
      label: onDelete && (
        <Button
          icon={<CloseOutlined />}
          type="link"
          size="small"
          danger
          onClick={() => setOpen(true)}
        >
          Delete
        </Button>
      )
    },
    {
      key: 'update',
      label: onUpdate && (
        <Button icon={<RetweetOutlined />} type="link" size="small" onClick={onUpdate}>
          Update
        </Button>
      )
    }
  ].filter((item) => item.label);

  return (
    // wrapper to stop click event propagation
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown disabled={items.length === 0} menu={{ items }}>
        <Button icon={<BarsOutlined />}></Button>
      </Dropdown>
      {onDelete && (
        <DeleteWarningModal
          targetName={targetName}
          onDelete={onDelete}
          open={open}
          onCancel={() => setOpen(false)}
          onOk={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default ActionButton;
