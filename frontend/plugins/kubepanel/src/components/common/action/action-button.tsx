import { CloseOutlined, RetweetOutlined } from '@ant-design/icons';
import { Button, type MenuProps, Dropdown } from 'antd';
import { useState } from 'react';
import { UpdateEditorModal } from './update-editor-modal';
import { KubeObject } from '@/k8slens/kube-object';
import { DeletePopconfirm } from './delete-popconfirm';
import { MdOutlineMoreVert } from 'react-icons/md';

interface Props<K extends KubeObject> {
  obj: K;
}

export const ActionButton = <K extends KubeObject = KubeObject>({ obj }: Props<K>) => {
  const [openUpdateModal, setOpenUpdateModal] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'delete',
      label: (
        <DeletePopconfirm obj={obj}>
          <Button icon={<CloseOutlined />} type="link" size="small" className="text-[#d92d20]">
            Delete
          </Button>
        </DeletePopconfirm>
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
          className="text-[#0884dd]"
        >
          Update
        </Button>
      )
    }
  ].filter((item) => item.label);

  return (
    // wrapper to stop click event propagation
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown disabled={items.length === 0} menu={{ items }} arrow trigger={['click']}>
        <MdOutlineMoreVert className="text-[25px] text-[#667085] hover:text-[#24282C]" />
      </Dropdown>
      <UpdateEditorModal
        key={'update'}
        obj={obj}
        open={openUpdateModal}
        onCancel={() => setOpenUpdateModal(false)}
        onOk={() => setOpenUpdateModal(false)}
      />
    </div>
  );
};
