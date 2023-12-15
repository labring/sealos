import { BarsOutlined, CloseOutlined, RetweetOutlined } from '@ant-design/icons';
import { Button, type MenuProps, Dropdown } from 'antd';
import DeleteWarningModal from '../action-button/delete-waring-modal';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import UpdateEditorModal from '../action-button/update-editor-modal';
import { KubeObject } from '@/k8slens/kube-object';

interface Props<K extends KubeObject> {
  obj: K;
}

const ActionButton = <K extends KubeObject = KubeObject>({ obj }: Props<K>) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'delete',
      label: (
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
      label: (
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
      <DeleteWarningModal
        key={`delete`}
        obj={obj}
        open={openDeleteModal}
        onCancel={() => setOpenDeleteModal(false)}
        onOk={() => setOpenDeleteModal(false)}
      />
      <UpdateEditorModal
        key={`update`}
        obj={obj}
        open={openUpdateModal}
        onCancel={() => setOpenUpdateModal(false)}
        onOk={() => setOpenUpdateModal(false)}
      />
    </div>
  );
};

export default ActionButton;
