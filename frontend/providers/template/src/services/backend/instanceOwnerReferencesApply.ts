import type { CustomObjectsApi } from '@kubernetes/client-node';
import JsYaml from 'js-yaml';

import { ownerReferencesKey, ownerReferencesReadyValue } from '@/constants/keys';

type ApplyMode = 'create' | 'replace' | 'dryrun';

type ApplyYamlList = (yamlList: string[], type: ApplyMode) => Promise<any[]>;

type InstanceObject = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    uid?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  [key: string]: any;
};

type AnyK8sObject = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, any>;
    labels?: Record<string, any>;
    ownerReferences?: any[];
    [key: string]: any;
  };
  [key: string]: any;
};

export type ApplyWithInstanceOwnerReferencesDeps = {
  applyYamlList: ApplyYamlList;
  k8sCustomObjects: CustomObjectsApi;
  namespace: string;
};

export function generateInstanceOwnerReference(instanceName: string, uid: string) {
  return [
    {
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      name: instanceName,
      uid,
      /**
       * Do NOT set controller=true here.
       * Some resources may already carry a controller owner (e.g. from applaunchpad/workload),
       * and Kubernetes only allows a single controller reference.
       */
      controller: false,
      blockOwnerDeletion: false
    }
  ];
}

const CLUSTER_SCOPED_KINDS = new Set<string>([
  'Namespace',
  'Node',
  'PersistentVolume',
  'StorageClass',
  'CustomResourceDefinition',
  'ClusterRole',
  'ClusterRoleBinding',
  'MutatingWebhookConfiguration',
  'ValidatingWebhookConfiguration',
  'APIService'
]);

function isInstanceObject(obj: AnyK8sObject): obj is InstanceObject {
  return (
    obj?.kind === 'Instance' &&
    typeof obj?.apiVersion === 'string' &&
    obj.apiVersion.startsWith('app.sealos.io/')
  );
}

function shouldInjectOwnerReferences(obj: AnyK8sObject): boolean {
  if (!obj) return false;
  const kind = obj.kind;
  if (!kind || !obj.metadata) return false;
  if (isInstanceObject(obj)) return false;
  if (CLUSTER_SCOPED_KINDS.has(kind)) return false;
  return true;
}

function ensureMetadata(obj: AnyK8sObject): Required<AnyK8sObject>['metadata'] {
  if (!obj.metadata) obj.metadata = {};
  return obj.metadata as Required<AnyK8sObject>['metadata'];
}

function ensureLabels(meta: Required<AnyK8sObject>['metadata']) {
  if (!meta.labels) meta.labels = {};
  return meta.labels;
}

function addOrReplaceOwnerReference(existing: any[] | undefined, instanceOwnerRef: any): any[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  const idx = list.findIndex(
    (r) =>
      r?.apiVersion === instanceOwnerRef.apiVersion &&
      r?.kind === instanceOwnerRef.kind &&
      r?.name === instanceOwnerRef.name
  );
  if (idx >= 0) {
    list[idx] = instanceOwnerRef;
    return list;
  }
  list.push(instanceOwnerRef);
  return list;
}

function parseYamlList(yamlList: string[]): AnyK8sObject[] {
  const all: AnyK8sObject[] = [];
  for (const str of yamlList) {
    const docs = (JsYaml.loadAll(str).filter(Boolean) as AnyK8sObject[]) || [];
    all.push(...docs);
  }
  return all;
}

async function readInstanceUid(
  k8sCustomObjects: CustomObjectsApi,
  namespace: string,
  instanceName: string
): Promise<string> {
  const result = (await k8sCustomObjects.getNamespacedCustomObject(
    'app.sealos.io',
    'v1',
    namespace,
    'instances',
    instanceName
  )) as { body: InstanceObject };
  return result.body?.metadata?.uid || '';
}

/**
 * Apply YAMLs with Instance as owner root.
 *
 * - dryrun: no ownerReferences injection
 * - create/replace:
 *   1) find Instance doc, mark ready label
 *   2) apply Instance first
 *   3) read Instance UID
 *   4) inject Instance ownerReference into every other namespaced resource in the yaml set
 *   5) apply dependents
 */
export async function applyWithInstanceOwnerReferences(
  deps: ApplyWithInstanceOwnerReferencesDeps,
  yamlList: string[],
  mode: ApplyMode
): Promise<{ appliedKinds: string[] }> {
  if (mode === 'dryrun') {
    const res = await deps.applyYamlList(yamlList, 'dryrun');
    return { appliedKinds: res.map((i: any) => i?.kind).filter(Boolean) };
  }

  const resources = parseYamlList(yamlList);
  const instanceIndex = resources.findIndex((r) => isInstanceObject(r));
  if (instanceIndex === -1) {
    const res = await deps.applyYamlList(yamlList, mode);
    return { appliedKinds: res.map((i: any) => i?.kind).filter(Boolean) };
  }

  const instance = resources[instanceIndex] as InstanceObject;
  const instanceMeta = ensureMetadata(instance);
  const instanceName = instanceMeta.name;
  if (!instanceName) {
    const res = await deps.applyYamlList(yamlList, mode);
    return { appliedKinds: res.map((i: any) => i?.kind).filter(Boolean) };
  }

  instanceMeta.namespace = deps.namespace;
  const labels = ensureLabels(instanceMeta as any);
  labels[ownerReferencesKey] = ownerReferencesReadyValue;

  // 1) apply Instance first
  await deps.applyYamlList([JsYaml.dump(instance)], mode);

  // 2) read UID
  const uid = await readInstanceUid(deps.k8sCustomObjects, deps.namespace, instanceName);
  if (!uid) {
    throw new Error('Instance UID is empty after apply');
  }

  // 3) inject ownerReferences
  const instanceOwnerRef = generateInstanceOwnerReference(instanceName, uid)[0];
  const dependentResources = resources.filter((_, idx) => idx !== instanceIndex);

  for (const obj of dependentResources) {
    const meta = ensureMetadata(obj);
    meta.namespace = deps.namespace;
    if (!shouldInjectOwnerReferences(obj)) continue;
    meta.ownerReferences = addOrReplaceOwnerReference(meta.ownerReferences, instanceOwnerRef);
  }

  // 4) apply dependents
  if (dependentResources.length > 0) {
    const dependentYamlList = dependentResources.map((r) => JsYaml.dump(r));
    await deps.applyYamlList(dependentYamlList, mode);
  }

  return { appliedKinds: resources.map((r) => r?.kind).filter(Boolean) as string[] };
}
