import { updateResource } from '@/api/kubernetes';
import { KubeObject } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { Editor } from '@monaco-editor/react';
import { Button, Modal, message } from 'antd';
import { editor } from 'monaco-editor';
import { useRef } from 'react';

interface Props<K extends KubeObject> {
  obj?: K;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const UpdateEditorModal = <K extends KubeObject = KubeObject>({
  obj,
  open,
  onCancel,
  onOk
}: Props<K>) => {
  if (!obj) return null;

  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'updatedMsg';
  const editorRef = useRef<editor.IStandaloneCodeEditor>();

  const editorValue = dumpKubeObject<KubeObject>(obj);

  return (
    <>
      {contextHolder}
      <Modal
        title={<div>{`${obj.kind}: ${obj.getName()}`}</div>}
        open={open}
        onCancel={onCancel}
        destroyOnClose
        footer={[
          <Button
            key="ok"
            type="link"
            onClick={() => {
              msgApi.loading({ content: 'Updating...', key: msgKey }, 0);
              if (!editorRef.current) {
                msgApi.error(
                  'There is an error to get the editor value. You can try to reopen the modal.'
                );
                return;
              }
              updateResource(obj.kind, obj.getName(), editorRef.current.getValue())
                .then((res) => {
                  msgApi.success({
                    content: `Successfully updated ${res.data.kind} ${res.data.metadata.name}`,
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
          >
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
