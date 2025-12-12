import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Select, Space, Table, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { isEqual } from 'lodash';
import {
  Ingress,
  IngressRule,
  ExtensionsBackend,
  NetworkingBackend,
  ComputedIngressRoute,
  computeRuleDeclarations
} from '@/k8slens/kube-object';

interface IngressPathEditorProps {
  ingress: Ingress;
  isEditing?: boolean;
  onChange?: (rules: IngressRule[]) => void;
}

type PathForm = {
  path?: string;
  pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  serviceName: string;
  servicePort?: number | string;
};

type RuleForm = {
  host: string;
  paths: PathForm[];
};

const IngressPathEditor = ({ ingress, isEditing = false, onChange }: IngressPathEditorProps) => {
  const [rules, setRules] = useState<RuleForm[]>([]);

  const convertIngressToForm = (ing: Ingress): RuleForm[] => {
    if (!ing || !ing.spec) {
      return [];
    }
    return (
      ing.spec.rules?.map((rule) => ({
        host: rule.host || '*',
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
      })) || []
    );
  };

  const resetDraft = (ing: Ingress) => {
    setRules(convertIngressToForm(ing));
  };

  useEffect(() => {
    if (!isEditing) {
      resetDraft(ingress);
    }
  }, [ingress, isEditing]);

  useEffect(() => {
    if (isEditing) {
      resetDraft(ingress);
    }
  }, [isEditing, ingress]);

  const draftRules = useMemo(() => {
    return rules.map((rule) => ({
      host: rule.host === '*' ? undefined : rule.host,
      http: {
        paths: rule.paths.map((p) => ({
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
    })) as IngressRule[];
  }, [rules]);

  const lastSentRef = useRef<IngressRule[]>();

  useEffect(() => {
    if (!isEditing) {
      lastSentRef.current = undefined;
      return;
    }
    if (!isEqual(draftRules, lastSentRef.current)) {
      lastSentRef.current = draftRules;
      onChange?.(draftRules);
    }
  }, [draftRules, isEditing, onChange]);

  const addPath = (ruleIndex: number) => {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[ruleIndex].paths.push({
        path: '',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: ''
      });
      return newRules;
    });
  };

  const removePath = (ruleIndex: number, pathIndex: number) => {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[ruleIndex].paths.splice(pathIndex, 1);
      return newRules;
    });
  };

  const updatePath = (ruleIndex: number, pathIndex: number, field: keyof PathForm, value: any) => {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[ruleIndex].paths[pathIndex] = {
        ...newRules[ruleIndex].paths[pathIndex],
        [field]: value
      };
      return newRules;
    });
  };

  const displayRules = isEditing ? rules : convertIngressToForm(ingress);

  if (!isEditing) {
    if (!ingress) {
      return null;
    }
    return (
      <div className="flex flex-col gap-4">
        {ingress.getRules().map((rule, idx) => {
          const pathTypeMap = new Map<string, string>();
          rule.http?.paths?.forEach((p) => {
            const pathKey = p.path || '/';
            pathTypeMap.set(pathKey, p.pathType || 'Prefix');
          });

          const rulesColumns: ColumnsType<ComputedIngressRoute> = [
            {
              key: 'path',
              title: 'Path',
              render: (_, { pathname, displayAsLink, url }) => {
                const text = pathname === '' ? '_' : pathname;
                const pathType = pathTypeMap.get(pathname) || 'Prefix';
                const typeLabel = pathType === 'Prefix' ? '≈' : pathType === 'Exact' ? '=' : '~';
                const typeColor =
                  pathType === 'Prefix' ? '#1890ff' : pathType === 'Exact' ? '#52c41a' : '#722ed1';

                return (
                  <div className="flex items-center gap-2">
                    <Tooltip title={pathType}>
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded"
                        style={{
                          backgroundColor: `${typeColor}15`,
                          color: typeColor,
                          border: `1px solid ${typeColor}40`
                        }}
                      >
                        {typeLabel}
                      </span>
                    </Tooltip>
                    {displayAsLink ? (
                      <Button
                        href={url}
                        rel="noreferrer"
                        target="_blank"
                        type="link"
                        onClick={(e) => e.stopPropagation()}
                        className="p-0! h-auto"
                      >
                        {text}
                      </Button>
                    ) : (
                      <span>{text}</span>
                    )}
                  </div>
                );
              }
            },
            {
              key: 'backends',
              title: 'Service',
              dataIndex: 'service'
            }
          ];

          return (
            <div key={rule.host || idx}>
              {rule.http && (
                <Table
                  size="small"
                  bordered
                  columns={rulesColumns}
                  dataSource={computeRuleDeclarations(ingress, rule)}
                  pagination={false}
                  rowKey={(record) => record.url}
                  title={() => (
                    <div className="font-medium text-gray-900">
                      {rule.host ? `Host: ${rule.host}` : 'Host: *'}
                    </div>
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {displayRules.map((rule, ruleIndex) => (
        <div key={ruleIndex}>
          <div className="border border-gray-200 rounded">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="font-medium text-gray-900">
                {rule.host ? `Host: ${rule.host}` : 'Host: *'}
              </span>
              <Button
                onClick={() => addPath(ruleIndex)}
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
              >
                Add Path
              </Button>
            </div>
            <div className="divide-y divide-gray-200">
              {rule.paths.map((path, pathIndex) => (
                <div key={pathIndex} className="p-3">
                  <div className="grid grid-cols-[200px_1fr] gap-3 mb-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600 font-medium">Type</label>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={path.pathType}
                        onChange={(val) => updatePath(ruleIndex, pathIndex, 'pathType', val)}
                        disabled={String(path.path || '').trim() === '/'}
                        options={[
                          { label: 'Prefix', value: 'Prefix' },
                          { label: 'Exact', value: 'Exact' },
                          { label: 'ImplementationSpecific', value: 'ImplementationSpecific' }
                        ]}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600 font-medium">Path</label>
                      <Input
                        size="small"
                        placeholder="/"
                        value={path.path}
                        onChange={(e) => updatePath(ruleIndex, pathIndex, 'path', e.target.value)}
                        readOnly={String(path.path || '').trim() === '/'}
                        disabled={String(path.path || '').trim() === '/'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600 font-medium">Service</label>
                      <Input
                        size="small"
                        placeholder="Service Name"
                        value={path.serviceName}
                        onChange={(e) =>
                          updatePath(ruleIndex, pathIndex, 'serviceName', e.target.value)
                        }
                        readOnly={String(path.path || '').trim() === '/'}
                        disabled={String(path.path || '').trim() === '/'}
                      />
                    </div>
                    <div className="flex flex-col gap-1" style={{ width: '70px' }}>
                      <label className="text-xs text-gray-600 font-medium">Port</label>
                      <Input
                        size="small"
                        placeholder="80"
                        value={path.servicePort}
                        onChange={(e) =>
                          updatePath(ruleIndex, pathIndex, 'servicePort', e.target.value)
                        }
                        readOnly={String(path.path || '').trim() === '/'}
                        disabled={String(path.path || '').trim() === '/'}
                      />
                    </div>
                    <Button
                      danger
                      type="text"
                      size="small"
                      disabled={String(path.path || '').trim() === '/'}
                      onClick={() => removePath(ruleIndex, pathIndex)}
                      icon={<DeleteOutlined />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IngressPathEditor;
