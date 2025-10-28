import { Form, Input, Button, Select, Space, message, Modal, Typography, Divider } from 'antd';
import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { DrawerTitle } from '@/components/common/drawer/drawer-title';
import { Ingress } from '@/k8slens/kube-object';
import { updateResource } from '@/api/kubernetes';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { PlusOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

type PathForm = {
  path?: string;
  pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  serviceName: string;
  servicePort?: number | string;
};

type RuleForm = {
  paths: PathForm[];
};

type FormValues = {
  rules: RuleForm[];
  tls: { secretName: string }[];
};

interface Props {
  ingress?: Ingress | null;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const PathTypeSelect = (
  <Select
    allowClear
    size="middle"
    style={{ width: 180 }}
    options={[
      { label: 'Prefix', value: 'Prefix' },
      { label: 'Exact', value: 'Exact' },
      { label: 'ImplementationSpecific', value: 'ImplementationSpecific' }
    ]}
  />
);

export const IngressVisualEditorDrawer = ({ ingress, open, onCancel, onOk }: Props) => {
  if (!ingress) return null;

  const [form] = Form.useForm<FormValues>();
  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'ingressVisualEditMsg';
  const [submitting, setSubmitting] = useState(false);

  const initialValues: FormValues = {
    rules:
      ingress.spec.rules?.map((rule) => ({
        paths: (rule.http?.paths || []).map((p) => ({
          path: p.path || '/',
          pathType: p.pathType || 'Prefix',
          serviceName: (p.backend as any)?.service?.name ?? (p.backend as any)?.serviceName ?? '',
          servicePort:
            (p.backend as any)?.service?.port?.number ??
            (p.backend as any)?.service?.port?.name ??
            (p.backend as any)?.servicePort
        }))
      })) || [],
    tls: []
  };

  // Ensure the form reflects original ingress data each time the drawer opens
  useEffect(() => {
    if (open) {
      form.setFieldsValue(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingress]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      const newRules = (ingress.spec.rules || []).map((origRule, idx) => ({
        host: origRule.host,
        http: {
          paths: (values.rules[idx]?.paths || origRule.http?.paths || []).map((p) => ({
            pathType: p.pathType,
            path: p.path,
            backend: {
              service: {
                name: p.serviceName,
                port:
                  typeof p.servicePort === 'number'
                    ? { number: p.servicePort }
                    : (() => {
                        const asNum = Number(p.servicePort);
                        return Number.isFinite(asNum)
                          ? { number: asNum }
                          : { name: String(p.servicePort || '') };
                      })()
              }
            }
          }))
        }
      }));

      const updated: Partial<Ingress> = {
        ...ingress,
        spec: {
          ...ingress.spec,
          rules: newRules
        }
      };

      msgApi.loading({ content: 'Updating Ingress...', key: msgKey }, 0);
      const yaml = dumpKubeObject(updated as any);
      const res = await updateResource(ingress.kind, ingress.getName(), yaml);
      msgApi.success({
        content: `Updated ${res.data.kind} ${res.data.metadata.name}`,
        key: msgKey
      });
      onOk();
    } catch (err: any) {
      const resp = buildErrorResponse(err);
      msgApi.error({
        content: `Update failed: ${resp.error.message}`,
        key: msgKey
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (form.isFieldsTouched(true)) {
      Modal.confirm({
        title: 'Discard changes?',
        content: 'Unsaved changes will be lost.',
        okText: 'Confirm',
        cancelText: 'Continue Editing',
        onOk: () => {
          form.setFieldsValue(initialValues);
          onCancel();
        }
      });
    } else {
      form.setFieldsValue(initialValues);
      onCancel();
    }
  };

  return (
    <>
      {contextHolder}
      <Drawer open={open} onClose={handleCancel} title={`Edit Ingress Paths: ${ingress.getName()}`}>
        <DrawerPanel
          title={
            <DrawerTitle>
              <div className="flex items-center justify-between">
                <span>Edit Paths</span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCancel}
                    icon={<CloseOutlined />}
                    size="small"
                    type="default"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    icon={<SaveOutlined />}
                    size="small"
                    loading={submitting}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DrawerTitle>
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            style={{ paddingRight: 8 }}
          >
            <Form.List name="rules">
              {(fields) => (
                <div>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="mb-4 rounded-md border border-[#e5e7eb] bg-[#fafafa]"
                    >
                      <DrawerTitle>
                        Host: {ingress.spec.rules?.[field.name]?.host || '*'}
                      </DrawerTitle>
                      <div className="p-3">
                        <Form.List name={[field.name, 'paths']}>
                          {(pathFields, { add: addPath, remove: removePath }) => (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[#5A646E]">Paths</span>
                                <Button
                                  onClick={() =>
                                    addPath({
                                      path: '',
                                      pathType: 'Prefix',
                                      serviceName: '',
                                      servicePort: ''
                                    })
                                  }
                                  type="dashed"
                                  size="small"
                                  icon={<PlusOutlined />}
                                >
                                  Add Path
                                </Button>
                              </div>
                              {pathFields.map((pf) => (
                                <div
                                  key={pf.key}
                                  className="mb-2 p-2 rounded border border-[#e5e7eb] bg-white"
                                >
                                  <Space wrap style={{ width: '100%' }}>
                                    <Form.Item
                                      label="Path"
                                      name={[pf.name, 'path']}
                                      rules={[{ required: true, message: 'Please enter Path' }]}
                                    >
                                      <Input
                                        placeholder="e.g. /, /api"
                                        style={{ width: 220 }}
                                        size="middle"
                                        readOnly={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                        disabled={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                      />
                                    </Form.Item>

                                    <Form.Item
                                      label="PathType"
                                      name={[pf.name, 'pathType']}
                                      rules={[
                                        { required: true, message: 'Please select PathType' }
                                      ]}
                                    >
                                      {(() => {
                                        const isRoot =
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/';
                                        return (
                                          <Select
                                            allowClear
                                            size="middle"
                                            style={{ width: 180 }}
                                            disabled={isRoot}
                                            options={[
                                              { label: 'Prefix', value: 'Prefix' },
                                              { label: 'Exact', value: 'Exact' },
                                              {
                                                label: 'ImplementationSpecific',
                                                value: 'ImplementationSpecific'
                                              }
                                            ]}
                                          />
                                        );
                                      })()}
                                    </Form.Item>

                                    <Form.Item
                                      label="Service Name"
                                      name={[pf.name, 'serviceName']}
                                      rules={[
                                        { required: true, message: 'Please enter Service Name' }
                                      ]}
                                    >
                                      <Input
                                        placeholder="Backend Service Name"
                                        style={{ width: 220 }}
                                        size="middle"
                                        readOnly={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                        disabled={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                      />
                                    </Form.Item>

                                    <Form.Item
                                      label="Service Port"
                                      name={[pf.name, 'servicePort']}
                                      tooltip="Supports port number or named port"
                                    >
                                      <Input
                                        placeholder="Number or named port"
                                        style={{ width: 180 }}
                                        size="middle"
                                        readOnly={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                        disabled={
                                          String(
                                            form.getFieldValue(['rules', field.name, 'paths'])?.[
                                              pf.name
                                            ]?.path ?? ''
                                          ).trim() === '/'
                                        }
                                      />
                                    </Form.Item>

                                    <Form.Item
                                      noStyle
                                      shouldUpdate={(prev, curr) => {
                                        const prevPath =
                                          prev?.rules?.[field.name]?.paths?.[pf.name]?.path;
                                        const currPath =
                                          curr?.rules?.[field.name]?.paths?.[pf.name]?.path;
                                        return prevPath !== currPath;
                                      }}
                                    >
                                      {() => {
                                        const pathVal = String(
                                          form.getFieldValue(['rules', field.name, 'paths'])?.[
                                            pf.name
                                          ]?.path ?? ''
                                        ).trim();
                                        const isRoot = pathVal === '/';
                                        return (
                                          <Button
                                            danger
                                            type="link"
                                            disabled={isRoot}
                                            onClick={() => {
                                              const current = String(
                                                form.getFieldValue([
                                                  'rules',
                                                  field.name,
                                                  'paths'
                                                ])?.[pf.name]?.path ?? ''
                                              ).trim();
                                              if (current === '/') {
                                                msgApi.warning(
                                                  'The root path "/" cannot be deleted'
                                                );
                                                return;
                                              }
                                              removePath(pf.name);
                                            }}
                                            icon={<DeleteOutlined />}
                                          >
                                            Delete Path
                                          </Button>
                                        );
                                      }}
                                    </Form.Item>
                                  </Space>
                                </div>
                              ))}
                              <Divider dashed style={{ margin: '8px 0' }} />
                            </div>
                          )}
                        </Form.List>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Form.List>
          </Form>
        </DrawerPanel>
      </Drawer>
    </>
  );
};

export default IngressVisualEditorDrawer;
