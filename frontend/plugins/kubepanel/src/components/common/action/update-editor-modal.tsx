import { updateResource } from '@/api/kubernetes';
import StyledEditor from '@/components/common/editor/styled';
import Title from '@/components/common/title/title';
import { KubeObject } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { Button, Modal, message } from 'antd';
import { editor } from 'monaco-editor';
import { useRef } from 'react';

interface Props<K extends KubeObject> {
  obj?: K;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export const UpdateEditorModal = <K extends KubeObject = KubeObject>({
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
        open={open}
        width={'90vw'}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="update"
            type="primary"
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
          </Button>
        ]}
      >
        <Title type="primary" className="pb-5">
          {obj.kind}: {obj.getName()}
        </Title>
        <StyledEditor
          onMount={(editor) => (editorRef.current = editor)}
          value={editorValue}
          language="yaml"
        />
      </Modal>
    </>
  );
};
