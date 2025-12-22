import { updateResource } from '@/api/kubernetes';
import {
  DaemonSet,
  Deployment,
  Job,
  PodSecurityContext,
  ReplicaSet,
  StatefulSet
} from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { Button, InputNumber } from 'antd';
import useMessage from 'antd/lib/message/useMessage';
import { cloneDeep, isEqual } from 'lodash';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  securityContext?: PodSecurityContext;
  editable?: boolean;
  workload?: Deployment | StatefulSet | DaemonSet | ReplicaSet | Job;
  onUpdate?: () => void;
}

const PodDetailSecurityContext = ({
  securityContext,
  editable = true,
  workload,
  onUpdate
}: Props) => {
  const [msgApi, contextHolder] = useMessage();
  const [context, setContext] = useState<PodSecurityContext | undefined>(securityContext);
  const [draftContext, setDraftContext] = useState<PodSecurityContext | undefined>(securityContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const msgKey = 'security-context-save';

  useEffect(() => {
    setContext(securityContext);
    setDraftContext(securityContext);
    setIsEditing(false);
  }, [securityContext]);

  const isModified = useMemo(() => !isEqual(context, draftContext), [context, draftContext]);

  const handleSave = async () => {
    if (!isModified || !workload) return;

    const ownerSpec = workload.spec as any;
    const hasTemplateSpec = Boolean(ownerSpec?.template?.spec);
    const currentPodSpec = hasTemplateSpec
      ? cloneDeep(ownerSpec.template.spec)
      : cloneDeep(ownerSpec);

    if (!currentPodSpec) {
      msgApi.error('Cannot locate pod spec for this resource.');
      return;
    }

    const updatedPodSpec = {
      ...currentPodSpec,
      securityContext: draftContext || undefined
    };

    // Remove securityContext if all fields are undefined
    if (
      !draftContext ||
      (draftContext.runAsUser === undefined &&
        draftContext.runAsGroup === undefined &&
        draftContext.fsGroup === undefined)
    ) {
      delete updatedPodSpec.securityContext;
    }

    const updatedSpec = hasTemplateSpec
      ? {
          ...cloneDeep(ownerSpec),
          template: {
            ...cloneDeep(ownerSpec.template),
            spec: updatedPodSpec
          }
        }
      : {
          ...cloneDeep(ownerSpec),
          ...updatedPodSpec
        };

    const updatedResource = {
      apiVersion: workload.apiVersion,
      kind: workload.kind,
      metadata: {
        name: workload.metadata.name,
        namespace: workload.metadata.namespace,
        resourceVersion: workload.metadata.resourceVersion,
        ...(workload.metadata.labels && { labels: workload.metadata.labels }),
        ...(workload.metadata.annotations && { annotations: workload.metadata.annotations })
      },
      spec: updatedSpec
    } as any;

    try {
      setIsSaving(true);
      msgApi.loading({ content: 'Saving security context...', key: msgKey }, 0);
      const yaml = dumpKubeObject(updatedResource);
      await updateResource(workload.kind, workload.getName(), yaml);

      setContext(draftContext);
      setIsEditing(false);
      msgApi.success({ content: 'Security context saved', key: msgKey });
      onUpdate?.();
    } catch (err) {
      const resp = buildErrorResponse(err);
      msgApi.error({
        content: resp.error.message || 'Failed to save security context',
        key: msgKey
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftContext(context);
    setIsEditing(false);
  };

  const handleChange = (field: keyof PodSecurityContext, value: number | undefined) => {
    setDraftContext((prev) => ({
      ...(prev || {}),
      [field]: value
    }));
  };

  const displayContext = isEditing ? draftContext : context;

  // 如果 securityContext 为空且不在编辑状态，不渲染
  if (!displayContext && !isEditing) return null;

  // 如果所有字段都为空且不在编辑状态，不渲染
  const hasAnyValue =
    displayContext?.runAsUser !== undefined ||
    displayContext?.runAsGroup !== undefined ||
    displayContext?.fsGroup !== undefined;

  if (!hasAnyValue && !isEditing) return null;

  return (
    <>
      {contextHolder}
      <div className="py-3 border-b border-[#E8E8E8] last:border-b-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[#8C8C8C] font-medium text-sm">Security</div>
          {editable && workload && (
            <div className="flex items-center gap-1 shrink-0">
              {!isEditing && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                />
              )}
              {isEditing && (
                <>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={handleCancel}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined style={{ color: '#16a34a' }} />}
                    disabled={!isModified}
                    loading={isSaving}
                    onClick={handleSave}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 text-xs w-full min-h-[32px]">
          {(isEditing || displayContext?.runAsUser !== undefined) && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-gray-500 whitespace-nowrap">User:</span>
              {isEditing ? (
                <InputNumber
                  size="small"
                  className="flex-1 min-w-0"
                  value={draftContext?.runAsUser}
                  onChange={(val) => handleChange('runAsUser', val ?? undefined)}
                  placeholder="UID"
                  min={0}
                />
              ) : (
                <span className="text-gray-900 font-medium">{displayContext?.runAsUser}</span>
              )}
            </div>
          )}
          {(isEditing || displayContext?.runAsGroup !== undefined) && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-gray-500 whitespace-nowrap">Group:</span>
              {isEditing ? (
                <InputNumber
                  size="small"
                  className="flex-1 min-w-0"
                  value={draftContext?.runAsGroup}
                  onChange={(val) => handleChange('runAsGroup', val ?? undefined)}
                  placeholder="GID"
                  min={0}
                />
              ) : (
                <span className="text-gray-900 font-medium">{displayContext?.runAsGroup}</span>
              )}
            </div>
          )}
          {(isEditing || displayContext?.fsGroup !== undefined) && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-gray-500 whitespace-nowrap">FS Group:</span>
              {isEditing ? (
                <InputNumber
                  size="small"
                  className="flex-1 min-w-0"
                  value={draftContext?.fsGroup}
                  onChange={(val) => handleChange('fsGroup', val ?? undefined)}
                  placeholder="GID"
                  min={0}
                />
              ) : (
                <span className="text-gray-900 font-medium">{displayContext?.fsGroup}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PodDetailSecurityContext;
