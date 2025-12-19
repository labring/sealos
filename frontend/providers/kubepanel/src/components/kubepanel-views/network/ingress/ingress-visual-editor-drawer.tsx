import { Form, Input, Button, Select, Space, message, Modal } from 'antd';
import { Drawer } from '@/components/common/drawer/drawer';
import { Ingress, ExtensionsBackend, NetworkingBackend } from '@/k8slens/kube-object';
import { updateResource } from '@/api/kubernetes';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';

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

export const IngressVisualEditorDrawer = ({ ingress, open, onCancel, onOk }: Props) => {
  if (!ingress) return null;

  const [form] = Form.useForm<FormValues>();
  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'ingressVisualEditMsg';
  const [submitting, setSubmitting] = useState(false);

  // Helper function to check if path is root path
  const getPathValue = useCallback(
    (fieldName: number, pathFieldName: number): string => {
      return String(
        form.getFieldValue(['rules', fieldName, 'paths'])?.[pathFieldName]?.path ?? ''
      ).trim();
    },
    [form]
  );

  const isRootPath = useCallback(
    (fieldName: number, pathFieldName: number): boolean => {
      return getPathValue(fieldName, pathFieldName) === '/';
    },
    [getPathValue]
  );

  const initialValues: FormValues = {
    rules:
      ingress.spec.rules?.map((rule) => ({
        paths: (rule.http?.paths || []).map((p) => ({
          path: p.path || '/',
          pathType: p.pathType || 'Prefix',
          serviceName:
            (p.backend as NetworkingBackend)?.service?.name ??
            (p.backend as ExtensionsBackend)?.serviceName ??
            '',
          servicePort:
            (p.backend as NetworkingBackend)?.service?.port?.number ??
            (p.backend as NetworkingBackend)?.service?.port?.name ??
            (p.backend as ExtensionsBackend)?.servicePort
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
          paths: (values.rules[idx]?.paths || origRule.http?.paths || []).map((p) => {
            // Type guard: check if p is PathForm (has serviceName/servicePort) or HTTPIngressPath
            const isPathForm = 'serviceName' in p && 'servicePort' in p;
            if (isPathForm) {
              const pathForm = p as PathForm;
              return {
                pathType: pathForm.pathType,
                path: pathForm.path,
                backend: {
                  service: {
                    name: pathForm.serviceName,
                    port:
                      typeof pathForm.servicePort === 'number'
                        ? { number: pathForm.servicePort }
                        : (() => {
                            const asNum = Number(pathForm.servicePort);
                            return Number.isFinite(asNum)
                              ? { number: asNum }
                              : { name: String(pathForm.servicePort || '') };
                          })()
                  }
                }
              };
            } else {
              // It's HTTPIngressPath, use it as-is
              return p;
            }
          })
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
      const yaml = dumpKubeObject(updated);
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
      <Drawer
        open={open}
        onClose={handleCancel}
        title={`Edit Ingress Paths: ${ingress.getName()}`}
        width="750px"
        extra={
          <div className="flex items-center gap-2">
            <Button onClick={handleCancel} size="middle" type="default">
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              icon={<SaveOutlined />}
              size="middle"
              loading={submitting}
            >
              Save
            </Button>
          </div>
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
              <div className="flex flex-col gap-6">
                {fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-4">
                    <div className="font-medium text-base text-gray-900 border-b border-gray-200 pb-2">
                      Host: {ingress.spec.rules?.[field.name]?.host || '*'}
                    </div>
                    <Form.List name={[field.name, 'paths']}>
                      {(pathFields, { add: addPath, remove: removePath }) => (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 font-medium">Paths</span>
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
                              className="p-4 rounded-lg bg-gray-50 border border-gray-100"
                            >
                              <Space wrap align="start" style={{ width: '100%' }} size="middle">
                                <Form.Item
                                  label="Path"
                                  name={[pf.name, 'path']}
                                  rules={[{ required: true, message: 'Please enter Path' }]}
                                  className="mb-0!"
                                >
                                  <Input
                                    placeholder="/"
                                    style={{ width: 160 }}
                                    disabled={isRootPath(field.name, pf.name)}
                                    readOnly={isRootPath(field.name, pf.name)}
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="PathType"
                                  name={[pf.name, 'pathType']}
                                  rules={[{ required: true, message: 'Please select PathType' }]}
                                  className="mb-0!"
                                >
                                  <Select
                                    style={{ width: 140 }}
                                    disabled={isRootPath(field.name, pf.name)}
                                    options={[
                                      { label: 'Prefix', value: 'Prefix' },
                                      { label: 'Exact', value: 'Exact' },
                                      {
                                        label: 'ImplementationSpecific',
                                        value: 'ImplementationSpecific'
                                      }
                                    ]}
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Service Name"
                                  name={[pf.name, 'serviceName']}
                                  rules={[{ required: true, message: 'Please enter Service Name' }]}
                                  className="mb-0!"
                                >
                                  <Input
                                    placeholder="Service Name"
                                    style={{ width: 160 }}
                                    disabled={isRootPath(field.name, pf.name)}
                                    readOnly={isRootPath(field.name, pf.name)}
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Port"
                                  name={[pf.name, 'servicePort']}
                                  tooltip="Port number or name"
                                  className="mb-0!"
                                >
                                  <Input
                                    placeholder="80"
                                    style={{ width: 80 }}
                                    disabled={isRootPath(field.name, pf.name)}
                                    readOnly={isRootPath(field.name, pf.name)}
                                  />
                                </Form.Item>

                                <Form.Item
                                  label=" "
                                  colon={false}
                                  className="mb-0!"
                                  shouldUpdate={(prev, curr) => {
                                    const prevPath =
                                      prev?.rules?.[field.name]?.paths?.[pf.name]?.path;
                                    const currPath =
                                      curr?.rules?.[field.name]?.paths?.[pf.name]?.path;
                                    return prevPath !== currPath;
                                  }}
                                >
                                  {() => {
                                    const isRoot = isRootPath(field.name, pf.name);
                                    return (
                                      <Button
                                        danger
                                        type="text"
                                        disabled={isRoot}
                                        onClick={() => {
                                          if (isRoot) {
                                            msgApi.warning('The root path "/" cannot be deleted');
                                            return;
                                          }
                                          removePath(pf.name);
                                        }}
                                        icon={<DeleteOutlined />}
                                      />
                                    );
                                  }}
                                </Form.Item>
                              </Space>
                            </div>
                          ))}
                        </div>
                      )}
                    </Form.List>
                  </div>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </>
  );
};

export default IngressVisualEditorDrawer;
