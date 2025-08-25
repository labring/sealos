import { editor as EditorNS } from 'monaco-editor';
import { Button, Flex, Modal, Spin, notification } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import { createResource, getTemplate } from '@/api/kubernetes';
import { TemplateToggle, TemplateToggleChooseEventHandler } from './toggle';
import { buildErrorResponse } from '@/services/backend/response';
import { KubeObjectKind } from '@/constants/kube-object';
import Title from '@/components/common/title/title';
import StyledEditor from '@/components/common/editor/styled';

interface Props {
  open: boolean;
  setClose: () => void;
}

const defaultTemplate = 'Please select a template first.';
const noticeKey = 'createResource';

export const CreateResourceModal = ({ open, setClose }: Props) => {
  const [disabled, setDisabled] = useState(true);
  const [kind, setKind] = useState<KubeObjectKind | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<string>(defaultTemplate);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [notifyApi, contextHolder] = notification.useNotification();
  const editorRef = useRef<EditorNS.IStandaloneCodeEditor | null>(null);
  const onEditorMount = (editor: EditorNS.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const onChoose = useCallback<TemplateToggleChooseEventHandler>(
    (kind) => {
      setKind(kind);
      setDisabled(false);
      const storage = localStorage.getItem(`template-${kind}`);
      if (storage) {
        setTemplate(storage);
        return;
      }
      setLoading(true);
      // fetch template
      getTemplate(kind)
        .then((res) => {
          setTemplate(res.data);
        })
        .catch((err: any) => {
          const errResp = buildErrorResponse(err);
          notifyApi.error({
            key: noticeKey,
            message: errResp.error.reason,
            description: errResp.error.message
          });
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [notifyApi]
  );

  const onCreate = useCallback(() => {
    setConfirmLoading(true);
    const editor = editorRef.current;
    if (!editor) {
      setConfirmLoading(false);
      notifyApi.error({
        key: noticeKey,
        message: 'Editor Not Found',
        description: 'Please reopen the create resource panel, sorry for the inconvenience.'
      });
      return;
    }
    if (!kind) {
      setConfirmLoading(false);
      notifyApi.error({
        key: noticeKey,
        message: 'Template Not Found',
        description: 'Please select a template first, sorry for the inconvenience.'
      });
      return;
    }
    const value = editor.getValue();
    createResource(kind, value)
      .then(() => {
        notifyApi.success({
          key: noticeKey,
          message: 'Success',
          description: 'Your resource has been created.'
        });
      })
      .catch((err: any) => {
        const errResp = buildErrorResponse(err);
        notifyApi.error({
          key: noticeKey,
          message: errResp.error.reason,
          description: errResp.error.message
        });
      })
      .finally(() => {
        setConfirmLoading(false);
      });
  }, [kind, notifyApi]);
  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={setClose}
        onOk={setClose}
        footer={[
          <Button key="cancel" onClick={setClose} className="mr-2">
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={confirmLoading}
            onClick={onCreate}
            disabled={disabled}
          >
            Create
          </Button>
        ]}
      >
        <Title type="primary" className="pb-3">
          Create Resource
        </Title>
        <Flex vertical gap="12px">
          <TemplateToggle onChoose={onChoose} />
          <Spin spinning={loading}>
            <StyledEditor
              value={template}
              language="yaml"
              onMount={onEditorMount}
              options={{
                readOnly: disabled,
                minimap: { enabled: false },
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto'
                },
                contextmenu: false,
                cursorBlinking: 'smooth',
                scrollBeyondLastLine: false,
                overviewRulerBorder: false,
                codeLens: false,
                acceptSuggestionOnCommitCharacter: false,
                acceptSuggestionOnEnter: 'off',
                accessibilitySupport: 'off'
              }}
            />
          </Spin>
        </Flex>
      </Modal>
    </>
  );
};
