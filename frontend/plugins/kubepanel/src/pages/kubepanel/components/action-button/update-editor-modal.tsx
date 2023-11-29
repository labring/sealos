import { KubeObject } from '@/k8slens/kube-object';
import { ApiResp } from '@/services/kubernet';
import { dumpKubeObject } from '@/utils/yaml';
import { Editor } from '@monaco-editor/react';
import { Button, Modal, message } from 'antd';
import { editor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';

interface Props<K extends KubeObject> {
  obj: K;
  open: boolean;
  onUpdate: (data: string) => Promise<ApiResp>;
  onCancel: () => void;
  onOk: () => void;
}

const UpdateEditorModal = <K extends KubeObject = KubeObject>({
  obj,
  open,
  onUpdate,
  onCancel,
  onOk
}: Props<K>) => {
  const [clickedUpdate, setClickedUpdate] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();
  const editorRef = useRef<editor.IStandaloneCodeEditor>();

  useEffect(() => {
    if (!clickedUpdate || !editorRef.current) return;
    const updateRequest = async () => {
      const resp = await onUpdate(editorRef.current!.getValue());
      if (resp.code === 200) {
        msgApi.success('Successfully updated');
        onOk();
      } else {
        msgApi.error(`Failed to update: ${resp.data.message}`);
      }

      setClickedUpdate(false);
    };

    updateRequest();
  }, [clickedUpdate]);

  const editorValue = dumpKubeObject<KubeObject>(obj);

  return (
    <>
      {contextHolder}
      <Modal
        title={<div>{`${obj.kind}: ${obj.getName()}`}</div>}
        open={open}
        onCancel={onCancel}
        footer={[
          <Button key="ok" type="link" onClick={() => setClickedUpdate(true)}>
            Update
          </Button>,
          <Button key="cancel" onClick={onCancel} danger>
            Cancel
          </Button>
        ]}
      >
        <Editor
          onMount={(editor) => (editorRef.current = editor)}
          value={editorValue}
          language="yaml"
          height="50vh"
        />
      </Modal>
    </>
  );
};

export default UpdateEditorModal;
