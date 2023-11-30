import { BarsOutlined, CloseOutlined, RetweetOutlined } from '@ant-design/icons';
import { Button, type MenuProps, Dropdown } from 'antd';
import DeleteWarningModal from './delete-waring-modal';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { ApiResp } from '@/services/kubernet';
import UpdateEditorModal from './update-editor-modal';
import { KubeObject } from '@/k8slens/kube-object';

interface Props<K extends KubeObject> {
  obj: K;
  onDelete?: () => Promise<ApiResp>;
  onUpdate?: (data: string) => Promise<ApiResp>;
}

const ActionButton = <K extends KubeObject = KubeObject>({ obj, onDelete, onUpdate }: Props<K>) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [childKey, setChildKey] = useState(0);

  const onClose = useCallback((setOpen: Dispatch<SetStateAction<boolean>>) => {
    setOpen(false);
    setChildKey(childKey + 1);
  }, []);

  const items: MenuProps['items'] = [
    {
      key: 'delete',
      label: onDelete && (
        <Button
          icon={<CloseOutlined />}
          type="link"
          size="small"
          danger
          onClick={() => setOpenDeleteModal(true)}
        >
          Delete
        </Button>
      )
    },
    {
      key: 'update',
      label: onUpdate && (
        <Button
          icon={<RetweetOutlined />}
          type="link"
          size="small"
          onClick={() => setOpenUpdateModal(true)}
        >
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
          key={`delete-${childKey}`}
          targetName={obj.getName()}
          onDelete={onDelete}
          open={openDeleteModal}
          onCancel={() => onClose(setOpenDeleteModal)}
          onOk={() => onClose(setOpenDeleteModal)}
        />
      )}
      {onUpdate && (
        <UpdateEditorModal
          key={`update-${childKey}`}
          obj={obj}
          open={openUpdateModal}
          onUpdate={onUpdate}
          onCancel={() => onClose(setOpenUpdateModal)}
          onOk={() => onClose(setOpenUpdateModal)}
        />
      )}
    </div>
  );
};

export default ActionButton;
