import type { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import JsYaml from 'js-yaml';

import { ownerReferencesKey, ownerReferencesReadyValue } from '@/constants/keys';
import {
  type AnyK8sObject,
  generateInstanceOwnerReference,
  readInstanceUid,
  isInstanceObject,
  shouldInjectOwnerReferences,
  ensureMetadata,
  addOrReplaceOwnerReference,
  parseYamlList
} from './instanceOwnerReferencesApply';

type ApplyMode = 'create' | 'replace';

export type ApplyWithNodePortDeps = {
  applyYamlList: (yamlList: string[], type: ApplyMode) => Promise<any[]>;
  k8sCustomObjects: CustomObjectsApi;
  k8sCore: CoreV1Api;
  namespace: string;
};

type IngressMapping = {
  host: string;
  serviceName: string;
  servicePort: number | string;
};

type ApplyWithNodePortResult = {
  uid: string;
  appliedKinds: string[];
  nodePortMap: Record<string, number>;
  externalURLs: Record<string, string>;
};

/**
 * Extract host → backend service mappings from an Ingress object.
 */
function extractIngressMappings(ingress: AnyK8sObject): IngressMapping[] {
  const rules = ingress?.spec?.rules;
  if (!Array.isArray(rules)) return [];

  const mappings: IngressMapping[] = [];
  for (const rule of rules) {
    const host = rule?.host;
    if (!host) continue;

    const paths = rule?.http?.paths;
    if (!Array.isArray(paths) || paths.length === 0) continue;

    const backend = paths[0]?.backend;
    const serviceName = backend?.service?.name;
    const servicePort = backend?.service?.port?.number ?? backend?.service?.port?.name;
    if (serviceName && servicePort) {
      mappings.push({ host, serviceName, servicePort });
    }
  }
  return mappings;
}

function getMappingKey(mapping: IngressMapping): string {
  return `${mapping.serviceName}:${mapping.servicePort}`;
}

function getNodePortServiceName(serviceName: string): string {
  return `${serviceName}-nodeport`;
}

function isMappedServicePort(port: any, mappings: IngressMapping[]): boolean {
  return mappings.some((mapping) => {
    if (typeof mapping.servicePort === 'number') {
      return port?.port === mapping.servicePort;
    }
    return port?.name === mapping.servicePort;
  });
}

/**
 * Build URL replacement pairs: [original, replacement].
 * Covers both https:// and http:// prefixes, with and without port numbers.
 */
function buildReplacementMap(
  mappings: IngressMapping[],
  nodePortMap: Record<string, number>,
  nodeIP: string
): [string, string][] {
  const pairs: [string, string][] = [];
  for (const m of mappings) {
    const nodePort = nodePortMap[getMappingKey(m)];
    if (!nodePort) continue;

    const target = `http://${nodeIP}:${nodePort}`;
    // https://host → target
    pairs.push([`https://${m.host}`, target]);
    // http://host → target
    pairs.push([`http://${m.host}`, target]);
  }
  return pairs;
}

/**
 * Apply all URL replacements to a YAML string.
 * Also handles URLs with explicit port numbers (e.g. https://host:443/).
 */
function applyReplacements(yamlStr: string, replacements: [string, string][]): string {
  for (const [from, to] of replacements) {
    yamlStr = yamlStr.replaceAll(from, to);
    // Handle cases with explicit port (e.g. https://host:443/path)
    // Extract host from the "from" pattern
    const hostMatch = from.match(/^https?:\/\/(.+)$/);
    if (hostMatch) {
      const host = hostMatch[1];
      // Replace https://host:PORT and http://host:PORT with target
      const portRegex = new RegExp(
        `https?://${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\d+`,
        'g'
      );
      yamlStr = yamlStr.replace(portRegex, to);
    }
  }
  return yamlStr;
}

function isIngressObject(obj: AnyK8sObject): boolean {
  return obj?.kind === 'Ingress';
}

/**
 * Two-phase NodePort deployment:
 *
 * Phase 1: Apply Instance CRD + NodePort Services (converted from Ingress backends)
 * Phase 2: Replace domain URLs with http://nodeIP:nodePort, apply remaining resources
 *
 * Ingress objects are dropped (not applied).
 */
export async function applyWithNodePort(
  deps: ApplyWithNodePortDeps,
  yamlList: string[],
  mode: ApplyMode,
  nodeIP: string
): Promise<ApplyWithNodePortResult> {
  // --- Phase 0: Parse & classify ---
  const resources = parseYamlList(yamlList);

  const ingresses: AnyK8sObject[] = [];
  const instanceIndex = resources.findIndex((r) => isInstanceObject(r));
  const instance = instanceIndex !== -1 ? resources[instanceIndex] : null;

  // Collect all Ingress mappings
  const allMappings: IngressMapping[] = [];
  for (const obj of resources) {
    if (isIngressObject(obj)) {
      ingresses.push(obj);
      allMappings.push(...extractIngressMappings(obj));
    }
  }

  // If no Ingress found, fall back to normal apply (no NodePort conversion needed)
  if (allMappings.length === 0) {
    // Delegate to standard owner-references apply logic inline
    return applyStandardFlow(deps, resources, instanceIndex, mode);
  }

  // Identify which Service ports need a dedicated NodePort Service.
  // The original Service stays intact so internal-only ports are not exposed.
  const nodePortServices: { service: AnyK8sObject; mappings: IngressMapping[] }[] = [];

  for (let i = 0; i < resources.length; i++) {
    const obj = resources[i];
    if (obj?.kind === 'Service' && obj?.metadata?.name) {
      const mappings = allMappings.filter((mapping) => mapping.serviceName === obj.metadata.name);
      if (mappings.length > 0) {
        nodePortServices.push({ service: obj, mappings });
      }
    }
  }

  // --- Phase 1: Apply Instance + NodePort Services ---
  let instanceName = '';
  let uid = '';

  if (instance) {
    const instanceMeta = ensureMetadata(instance);
    instanceName = instanceMeta.name || '';
    instanceMeta.namespace = deps.namespace;

    if (!instanceMeta.labels) instanceMeta.labels = {};
    instanceMeta.labels[ownerReferencesKey] = ownerReferencesReadyValue;

    // Apply Instance first
    await deps.applyYamlList([JsYaml.dump(instance)], mode);

    // Read Instance UID
    if (instanceName) {
      uid = await readInstanceUid(deps.k8sCustomObjects, deps.namespace, instanceName);
      if (!uid) {
        throw new Error('Instance UID is empty after apply');
      }
    }
  }

  const instanceOwnerRef =
    instanceName && uid ? generateInstanceOwnerReference(instanceName, uid)[0] : null;

  // Create dedicated NodePort Services with only the ports referenced by Ingress backends.
  const nodePortMap: Record<string, number> = {};
  for (const { service: svc, mappings } of nodePortServices) {
    const sourceMeta = ensureMetadata(svc);
    const sourcePorts = Array.isArray(svc.spec?.ports) ? svc.spec.ports : [];
    const mappedPorts = sourcePorts.filter((port: any) => isMappedServicePort(port, mappings));
    if (mappedPorts.length === 0) continue;

    const nodePortServiceName = getNodePortServiceName(sourceMeta.name!);
    const metadata: AnyK8sObject['metadata'] = {
      name: nodePortServiceName,
      namespace: deps.namespace
    };
    if (sourceMeta.labels) metadata.labels = sourceMeta.labels;
    if (sourceMeta.annotations) metadata.annotations = sourceMeta.annotations;

    const nodePortService: AnyK8sObject = {
      apiVersion: svc.apiVersion || 'v1',
      kind: 'Service',
      metadata,
      spec: {
        type: 'NodePort',
        selector: svc.spec?.selector,
        ports: mappedPorts.map((port: any) => {
          const { nodePort, ...rest } = port;
          return rest;
        })
      }
    };
    const meta = ensureMetadata(nodePortService);

    // Inject owner reference
    if (instanceOwnerRef && shouldInjectOwnerReferences(nodePortService)) {
      meta.ownerReferences = addOrReplaceOwnerReference(meta.ownerReferences, instanceOwnerRef);
    }

    await deps.applyYamlList([JsYaml.dump(nodePortService)], mode);

    // Read back the Service to get the assigned NodePort
    const { body: svcBody } = await deps.k8sCore.readNamespacedService(
      nodePortServiceName,
      deps.namespace
    );
    const ports = svcBody?.spec?.ports;
    if (Array.isArray(ports)) {
      for (const port of ports) {
        if (!port.nodePort) continue;
        for (const mapping of mappings) {
          const matchesMapping =
            typeof mapping.servicePort === 'number'
              ? port.port === mapping.servicePort
              : port.name === mapping.servicePort;
          if (matchesMapping) {
            nodePortMap[getMappingKey(mapping)] = port.nodePort;
            nodePortMap[nodePortServiceName] = port.nodePort;
            if (!nodePortMap[mapping.serviceName]) {
              nodePortMap[mapping.serviceName] = port.nodePort;
            }
          }
        }
      }
    }
  }

  // --- Phase 2: URL replacement + apply remaining ---
  const replacements = buildReplacementMap(allMappings, nodePortMap, nodeIP);

  // Build external URL map for response
  const externalURLs: Record<string, string> = {};
  for (const m of allMappings) {
    const np = nodePortMap[getMappingKey(m)];
    if (np) {
      externalURLs[m.host] = `http://${nodeIP}:${np}`;
    }
  }

  // Collect remaining resources (not Instance, not Ingress, not already-applied Services)
  const remaining: AnyK8sObject[] = [];
  for (let i = 0; i < resources.length; i++) {
    if (i === instanceIndex) continue;
    if (isIngressObject(resources[i])) continue;
    remaining.push(resources[i]);
  }

  if (remaining.length > 0) {
    // Dump remaining to YAML string, apply URL replacements, re-parse
    const remainingYamlStr = remaining.map((r) => JsYaml.dump(r)).join('\n---\n');
    const replacedYamlStr = applyReplacements(remainingYamlStr, replacements);
    const replacedResources = JsYaml.loadAll(replacedYamlStr).filter(Boolean) as AnyK8sObject[];

    // Inject namespace + ownerReferences
    for (const obj of replacedResources) {
      const meta = ensureMetadata(obj);
      meta.namespace = deps.namespace;
      if (instanceOwnerRef && shouldInjectOwnerReferences(obj)) {
        meta.ownerReferences = addOrReplaceOwnerReference(meta.ownerReferences, instanceOwnerRef);
      }
    }

    const replacedYamlList = replacedResources.map((r) => JsYaml.dump(r));
    await deps.applyYamlList(replacedYamlList, mode);
  }

  // Collect all applied kinds
  const appliedKinds: string[] = [];
  if (instance?.kind) appliedKinds.push(instance.kind);
  for (const { service: svc } of nodePortServices) {
    if (svc.kind) appliedKinds.push(svc.kind);
  }
  for (const r of remaining) {
    if (r.kind) appliedKinds.push(r.kind);
  }

  return {
    uid,
    appliedKinds,
    nodePortMap,
    externalURLs
  };
}

/**
 * Standard apply flow (no NodePort conversion) — used as fallback when no Ingress is found.
 * Mirrors the logic of applyWithInstanceOwnerReferences but returns the NodePort result shape.
 */
async function applyStandardFlow(
  deps: ApplyWithNodePortDeps,
  resources: AnyK8sObject[],
  instanceIndex: number,
  mode: ApplyMode
): Promise<ApplyWithNodePortResult> {
  if (instanceIndex === -1) {
    const yamlList = resources.map((r) => JsYaml.dump(r));
    const res = await deps.applyYamlList(yamlList, mode);
    return {
      uid: '',
      appliedKinds: res.map((i: any) => i?.kind).filter(Boolean),
      nodePortMap: {},
      externalURLs: {}
    };
  }

  const instance = resources[instanceIndex];
  const instanceMeta = ensureMetadata(instance);
  const instanceName = instanceMeta.name;
  if (!instanceName) {
    const yamlList = resources.map((r) => JsYaml.dump(r));
    const res = await deps.applyYamlList(yamlList, mode);
    return {
      uid: '',
      appliedKinds: res.map((i: any) => i?.kind).filter(Boolean),
      nodePortMap: {},
      externalURLs: {}
    };
  }

  instanceMeta.namespace = deps.namespace;
  if (!instanceMeta.labels) instanceMeta.labels = {};
  instanceMeta.labels[ownerReferencesKey] = ownerReferencesReadyValue;

  await deps.applyYamlList([JsYaml.dump(instance)], mode);

  const uid = await readInstanceUid(deps.k8sCustomObjects, deps.namespace, instanceName);
  if (!uid) {
    throw new Error('Instance UID is empty after apply');
  }

  const instanceOwnerRef = generateInstanceOwnerReference(instanceName, uid)[0];
  const dependents = resources.filter((_, idx) => idx !== instanceIndex);

  for (const obj of dependents) {
    const meta = ensureMetadata(obj);
    meta.namespace = deps.namespace;
    if (shouldInjectOwnerReferences(obj)) {
      meta.ownerReferences = addOrReplaceOwnerReference(meta.ownerReferences, instanceOwnerRef);
    }
  }

  if (dependents.length > 0) {
    await deps.applyYamlList(
      dependents.map((r) => JsYaml.dump(r)),
      mode
    );
  }

  return {
    uid,
    appliedKinds: resources.map((r) => r?.kind).filter(Boolean) as string[],
    nodePortMap: {},
    externalURLs: {}
  };
}
