import { updateResource } from '@/api/kubernetes';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeBadge } from '@/components/kube/kube-badge';
import {
  Container,
  DaemonSet,
  Deployment,
  Job,
  Pod,
  ReplicaSet,
  StatefulSet
} from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { dumpKubeObject } from '@/utils/yaml';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Select, Tooltip } from 'antd';
import useMessage from 'antd/lib/message/useMessage';
import { cloneDeep, isEqual, keys } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import ContainerStatus, { ContainerLastState } from './container-status';
import ContainerStatusBrick from './container-status-brick';
import ProbeCard, { ExtendedProbe } from './probe-card';

interface Props {
  pod?: Pod;
  containers?: Container[];
  initContainers?: Container[];
  editable?: boolean;
  workload?: Deployment | StatefulSet | DaemonSet | ReplicaSet | Job | Pod;
  onUpdate?: () => void;
}

const ContainerDetail = ({
  pod,
  containers: propContainers,
  initContainers: propInitContainers,
  editable = true,
  workload,
  onUpdate
}: Props) => {
  const initContainers = pod ? pod.getInitContainers() : propInitContainers || [];
  const containers = pod ? pod.getContainers() : propContainers || [];

  if (initContainers.length === 0 && containers.length === 0) return null;

  const [selectedContainer, setSelectedContainer] = useState<string>(
    containers[0]?.name || initContainers[0]?.name || ''
  );

  useEffect(() => {
    setSelectedContainer(containers[0]?.name || initContainers[0]?.name || '');
  }, [pod?.getId(), containers.length, initContainers.length]);

  const currentContainer =
    containers.find((c) => c.name === selectedContainer) ||
    initContainers.find((c) => c.name === selectedContainer);
  const isInit = !!initContainers.find((c) => c.name === selectedContainer);

  const renderOptionLabel = (container: Container, isInit: boolean) => {
    let state = '';
    let status = undefined;

    if (pod) {
      status = pod.getContainerStatuses().find((status) => status.name === container.name);
      state = status ? keys(status?.state ?? {})[0] : '';
    }

    return (
      <div className="flex items-center gap-2">
        {pod && <ContainerStatusBrick state={state} status={status} />}
        {container.name}
        {isInit && ' (Init)'}
      </div>
    );
  };

  const options = [
    {
      label: 'Init Containers',
      options: initContainers.map((c) => ({
        label: renderOptionLabel(c, true),
        value: c.name
      }))
    },
    {
      label: 'Containers',
      options: containers.map((c) => ({
        label: renderOptionLabel(c, false),
        value: c.name
      }))
    }
  ].filter((group) => group.options.length > 0);

  const isSingleContainer = containers.length + initContainers.length <= 1;

  return (
    <>
      <div className="flex items-center justify-between mt-8 mb-4">
        <div className="text-[#262626] font-medium text-base">Containers</div>
        <Select
          className="min-w-50"
          value={selectedContainer}
          onChange={setSelectedContainer}
          options={options}
          open={isSingleContainer ? false : undefined}
        />
      </div>

      {currentContainer && (
        <ContainerInfo
          pod={pod}
          container={currentContainer}
          isInitial={isInit}
          editable={editable}
          workload={workload}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

const ContainerInfo = ({
  container,
  pod,
  isInitial,
  editable,
  workload,
  onUpdate
}: {
  container: Container;
  pod?: Pod;
  isInitial: boolean;
  editable: boolean;
  workload?: Deployment | StatefulSet | DaemonSet | ReplicaSet | Job | Pod;
  onUpdate?: () => void;
}) => {
  if (!container) return null;
  const { name, image, imagePullPolicy, ports, volumeMounts, command, args, env } = container;

  const startupProbe = container.startupProbe;
  const livenessProbe = container.livenessProbe;
  const readinessProbe = container.readinessProbe;

  const [msgApi, contextHolder] = useMessage();
  const [probes, setProbes] = useState<{
    startup?: ExtendedProbe;
    liveness?: ExtendedProbe;
    readiness?: ExtendedProbe;
  }>({ startup: startupProbe, liveness: livenessProbe, readiness: readinessProbe });

  const [draftProbes, setDraftProbes] = useState<{
    startup?: ExtendedProbe;
    liveness?: ExtendedProbe;
    readiness?: ExtendedProbe;
  }>(probes);
  const [isEditingProbes, setIsEditingProbes] = useState(false);
  const [isSavingProbes, setIsSavingProbes] = useState(false);
  const msgKey = 'probe-save';

  useEffect(() => {
    setProbes({ startup: startupProbe, liveness: livenessProbe, readiness: readinessProbe });
    setDraftProbes({ startup: startupProbe, liveness: livenessProbe, readiness: readinessProbe });
    setIsEditingProbes(false);
  }, [startupProbe, livenessProbe, readinessProbe]);

  // Reset editing state when drawer closes or container changes
  useEffect(() => {
    if (!open) {
      setIsEditingProbes(false);
    }
  }, [open]);

  useEffect(() => {
    setIsEditingProbes(false);
  }, [container?.name]);

  const handleProbeChange = (key: 'startup' | 'liveness' | 'readiness', value?: ExtendedProbe) => {
    setDraftProbes((prev) => ({ ...prev, [key]: value }));
  };

  const isModified = useMemo(() => !isEqual(probes, draftProbes), [probes, draftProbes]);

  // Resolve the relevant pod spec for the current context (Pod or Workload)
  const podSpec = useMemo(() => {
    const owner = workload || pod;
    if (!owner || !owner.spec) return null;

    const ownerSpec = owner.spec as any;
    const hasTemplateSpec = Boolean(ownerSpec?.template?.spec);

    return hasTemplateSpec ? cloneDeep(ownerSpec.template.spec) : cloneDeep(ownerSpec);
  }, [workload, pod]);

  const handleSaveProbes = async () => {
    if (!isModified) return;

    // Decide which owner object to persist (workload preferred, fallback to pod)
    const owner = workload || pod;
    if (!owner || !owner.spec) {
      msgApi.error('No parent resource found to update probes.');
      return;
    }

    const containerField = isInitial ? 'initContainers' : 'containers';

    // Clone current pod spec (template.spec for workloads, or spec for pods)
    // Use type guard to check if template exists on the spec
    const ownerSpec = owner.spec as any;
    const hasTemplateSpec = Boolean(ownerSpec?.template?.spec);
    const currentPodSpec = hasTemplateSpec
      ? cloneDeep(ownerSpec.template.spec)
      : cloneDeep(ownerSpec);

    if (!currentPodSpec) {
      msgApi.error('Cannot locate pod spec for this resource.');
      return;
    }

    const sourceContainers = currentPodSpec[containerField] || [];
    const updatedContainers = sourceContainers.map((c: any) => {
      if (c?.name !== container.name) return c;

      const updated = { ...c };

      // Handle probes: undefined means remove the field, otherwise set the value
      if (draftProbes.startup === undefined) {
        delete updated.startupProbe;
      } else {
        updated.startupProbe = draftProbes.startup;
      }

      if (draftProbes.liveness === undefined) {
        delete updated.livenessProbe;
      } else {
        updated.livenessProbe = draftProbes.liveness;
      }

      if (draftProbes.readiness === undefined) {
        delete updated.readinessProbe;
      } else {
        updated.readinessProbe = draftProbes.readiness;
      }

      return updated;
    });

    const updatedPodSpec = {
      ...currentPodSpec,
      [containerField]: updatedContainers
    };

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

    // Build a clean resource object with only serializable fields
    const updatedResource = {
      apiVersion: owner.apiVersion,
      kind: owner.kind,
      metadata: {
        name: owner.metadata.name,
        namespace: owner.metadata.namespace,
        resourceVersion: owner.metadata.resourceVersion,
        ...(owner.metadata.labels && { labels: owner.metadata.labels }),
        ...(owner.metadata.annotations && { annotations: owner.metadata.annotations })
      },
      spec: updatedSpec
    } as any;

    try {
      setIsSavingProbes(true);
      msgApi.loading({ content: 'Saving probes...', key: msgKey }, 0);
      const yaml = dumpKubeObject(updatedResource);
      await updateResource(owner.kind, owner.getName(), yaml);

      setProbes(draftProbes);
      setIsEditingProbes(false);
      msgApi.success({ content: 'Probes saved', key: msgKey });
      onUpdate?.();
    } catch (err) {
      const resp = buildErrorResponse(err);
      msgApi.error({ content: resp.error.message || 'Failed to save probes', key: msgKey });
    } finally {
      setIsSavingProbes(false);
    }
  };

  const handleCancelProbes = () => {
    setDraftProbes(probes);
    setIsEditingProbes(false);
  };

  let status, state, lastState, ready, imageId;

  if (pod) {
    status = pod.getContainerStatuses().find((status) => status.name === container.name);
    state = status ? keys(status?.state ?? {})[0] : '';
    lastState = status ? keys(status?.lastState ?? {})[0] : '';
    ready = status ? status.ready : '';
    imageId = status ? (status.imageID ?? '') : '';
  }

  // Helper to render env var value source
  const renderEnvValueSource = (envVar: any) => {
    if (envVar.value !== undefined) {
      return <span className="text-gray-700 break-all">{envVar.value || '""'}</span>;
    }
    if (envVar.valueFrom) {
      const { configMapKeyRef, secretKeyRef, fieldRef, resourceFieldRef } = envVar.valueFrom;
      if (configMapKeyRef) {
        return (
          <span className="text-gray-500">
            configMap:{configMapKeyRef.name}/{configMapKeyRef.key}
          </span>
        );
      }
      if (secretKeyRef) {
        return (
          <span className="text-gray-500">
            secret:{secretKeyRef.name}/{secretKeyRef.key}
          </span>
        );
      }
      if (fieldRef) {
        return <span className="text-gray-500">field:{fieldRef.fieldPath}</span>;
      }
      if (resourceFieldRef) {
        return <span className="text-gray-500">resource:{resourceFieldRef.resource}</span>;
      }
    }
    return <span className="text-gray-400">-</span>;
  };

  // Helper to split image name for visual truncation
  const splitImage = (img: string) => {
    const lastColon = img.lastIndexOf(':');
    const lastAt = img.lastIndexOf('@');
    const index = Math.max(lastColon, lastAt);
    if (index > -1) {
      return { prefix: img.slice(0, index), suffix: img.slice(index) };
    }
    return { prefix: img, suffix: '' };
  };

  const { prefix, suffix } = splitImage(image || '');

  return (
    <>
      {pod && (
        <DrawerItem
          name="Phase"
          className="items-center!"
          value={
            <div className="flex items-center gap-2">
              <ContainerStatus state={state as any} status={status as any} />
            </div>
          }
        />
      )}

      {pod && lastState === 'terminated' && (
        <DrawerItem
          name="Last State"
          value={<ContainerLastState lastState={lastState as any} status={status as any} />}
        />
      )}

      <DrawerItem
        name="Image"
        className="items-center!"
        value={
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <Tooltip title={imageId || image}>
              <div className="flex items-center min-w-0 cursor-pointer text-[#262626]">
                <span className="truncate">{prefix}</span>
                <span className="whitespace-nowrap shrink-0">{suffix}</span>
              </div>
            </Tooltip>
            {imagePullPolicy && <KubeBadge label={imagePullPolicy} />}
          </div>
        }
      />

      {ports && ports.length > 0 && (
        <DrawerItem
          name="Ports"
          value={ports.map((port) => (
            <div key={port.containerPort} className="mb-1 last:mb-0 text-xs">
              <span className="mr-2">
                {port.containerPort}/{port.protocol}
              </span>
              {port.name && <span className="text-gray-500">({port.name})</span>}
            </div>
          ))}
        />
      )}

      {container.resources?.limits && (
        <DrawerItem
          name="Resources"
          value={
            <div className="flex flex-wrap gap-4 text-xs">
              {container.resources.limits.cpu && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">CPU:</span>
                  <span className="font-medium text-gray-900">
                    {container.resources.limits.cpu}
                  </span>
                </div>
              )}
              {container.resources.limits.memory && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Memory:</span>
                  <span className="font-medium text-gray-900">
                    {container.resources.limits.memory}
                  </span>
                </div>
              )}
              {container.resources.limits['ephemeral-storage'] && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Ephemeral Storage:</span>
                  <span className="font-medium text-gray-900">
                    {container.resources.limits['ephemeral-storage']}
                  </span>
                </div>
              )}
            </div>
          }
        />
      )}

      {volumeMounts && volumeMounts.length > 0 && (
        <DrawerItem
          name="Mounts"
          value={volumeMounts.map((mount) => {
            const { name, mountPath, readOnly } = mount;
            const volume = podSpec?.volumes?.find((v: any) => v.name === name);
            let sourceLabel = '';
            let sourceValue = '';

            if (volume) {
              if (volume.persistentVolumeClaim) {
                sourceLabel = 'pvc';
                sourceValue = volume.persistentVolumeClaim.claimName;
              } else if (volume.configMap) {
                sourceLabel = 'cm';
                sourceValue = volume.configMap.name;
              } else if (volume.secret) {
                sourceLabel = 's';
                sourceValue = volume.secret.secretName;
              } else if (volume.emptyDir) {
                sourceLabel = 'emptyDir';
              } else if (volume.hostPath) {
                sourceLabel = 'hostPath';
                sourceValue = volume.hostPath.path;
              } else if (volume.downwardAPI) {
                sourceLabel = 'downwardAPI';
                sourceValue =
                  volume.downwardAPI.items?.map((item: any) => item.path).join(', ') ||
                  'downwardAPI';
              } else if (volume.projected) {
                sourceLabel = 'projected';
                sourceValue =
                  (
                    volume.projected.sources?.map((s: any) => {
                      if (s.serviceAccountToken) return 'serviceAccountToken';
                      if (s.configMap) return `cm/${s.configMap.name}`;
                      if (s.secret) return `secret/${s.secret.name}`;
                      if (s.downwardAPI) return 'downwardAPI';
                      return 'unknown';
                    }) || []
                  ).join(', ') || 'projected';
              }
            }

            const isImmutableSource =
              sourceLabel === 'cm' ||
              sourceLabel === 's' ||
              sourceLabel === 'downwardAPI' ||
              sourceLabel === 'projected';

            return (
              <div key={name + mountPath} className="mb-2 last:mb-0 text-xs">
                <span className="mount-path mr-2">{mountPath}</span>
                <span className="mount-from text-gray-500">
                  {`from ${name}`}
                  {!isImmutableSource && ` (${readOnly ? 'ro' : 'rw'})`}
                </span>
                {sourceLabel && (
                  <Tooltip title={sourceValue}>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded border border-gray-200 cursor-pointer">
                      {sourceLabel}
                    </span>
                  </Tooltip>
                )}
              </div>
            );
          })}
        />
      )}

      {command && (
        <DrawerItem
          name="Command"
          className="items-center!"
          value={<span className="text-xs">{command.join(' ')}</span>}
        />
      )}
      {args && (
        <DrawerItem
          name="Arguments"
          className="items-center!"
          value={<span className="text-xs">{args.join(' ')}</span>}
        />
      )}

      {env && env.length > 0 && (
        <div className="py-3 border-b border-[#E8E8E8] last:border-b-0">
          <div className="text-[#8C8C8C] font-medium text-sm mb-2">Env</div>
          <div className="overflow-x-auto text-xs text-[#262626] bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E8E8]">
            {(() => {
              const getTypeScore = (e: any) => {
                if (e.value !== undefined) return 0;
                if (e.valueFrom?.fieldRef || e.valueFrom?.resourceFieldRef) return 1;
                if (e.valueFrom?.configMapKeyRef || e.valueFrom?.secretKeyRef) return 2;
                return 3;
              };

              const sortedEnv = [...env].sort((a: any, b: any) => {
                const scoreA = getTypeScore(a);
                const scoreB = getTypeScore(b);
                if (scoreA !== scoreB) return scoreA - scoreB;
                return a.name.localeCompare(b.name);
              });

              return sortedEnv.map((envVar: any, index: number) => {
                const currentScore = getTypeScore(envVar);
                const prevScore = index > 0 ? getTypeScore(sortedEnv[index - 1]) : currentScore;
                const showDivider = index > 0 && currentScore !== prevScore;

                return (
                  <React.Fragment key={envVar.name}>
                    {showDivider && <div className="h-px bg-[#E8E8E8] my-1" />}
                    <div className="mb-1 last:mb-0 whitespace-nowrap">
                      <span className="font-medium">{envVar.name}=</span>
                      {renderEnvValueSource(envVar)}
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      )}

      {contextHolder}
      {!isInitial && (
        <div className="pt-3 border-b border-[#E8E8E8] last:border-b-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[#8C8C8C] font-medium text-sm">Health Check</div>
            {editable && (
              <div className="flex items-center gap-2">
                {!isEditingProbes && (
                  <Button
                    type="link"
                    size="small"
                    className="px-0"
                    onClick={() => setIsEditingProbes(true)}
                  >
                    Edit
                  </Button>
                )}
                {isEditingProbes && (
                  <>
                    <Button size="small" icon={<CloseOutlined />} onClick={handleCancelProbes}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SaveOutlined />}
                      disabled={!isModified}
                      loading={isSavingProbes}
                      onClick={handleSaveProbes}
                    >
                      Save
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <ProbeCard
              title="Startup"
              probe={isEditingProbes ? draftProbes.startup : probes.startup}
              isEditing={editable && isEditingProbes}
              onChange={(val) => handleProbeChange('startup', val)}
            />
            <ProbeCard
              title="Liveness"
              probe={isEditingProbes ? draftProbes.liveness : probes.liveness}
              isEditing={editable && isEditingProbes}
              onChange={(val) => handleProbeChange('liveness', val)}
            />
            <ProbeCard
              title="Readiness"
              probe={isEditingProbes ? draftProbes.readiness : probes.readiness}
              isEditing={editable && isEditingProbes}
              onChange={(val) => handleProbeChange('readiness', val)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ContainerDetail;
