// applanuchpad
export const pauseKey = 'deploy.cloud.sealos.io/pause';
export const deployManagerKey = 'cloud.sealos.io/app-deploy-manager';
export const noGpuSliderKey = 'NoGpu';
export const maxReplicasKey = 'deploy.cloud.sealos.io/maxReplicas';
export const minReplicasKey = 'deploy.cloud.sealos.io/minReplicas';
export const appDeployKey = 'cloud.sealos.io/app-deploy-manager';
/**
 * Legacy Applaunchpad application label used by old templates and StatefulSet PVCs.
 *
 * Keep new Template lifecycle logic on `templateDeployKey`; use this label only for
 * legacy cleanup/read paths that must find resources created before Template injected
 * instance-level labels into `volumeClaimTemplates`.
 *
 * @deprecated Prefer `templateDeployKey` for Template instance ownership.
 */
export const legacyAppLabelKey = 'app';
export const publicDomainKey = `cloud.sealos.io/app-deploy-manager-domain`;
export const gpuNodeSelectorKey = 'nvidia.com/gpu.product';
export const gpuResourceKey = 'nvidia.com/gpu';
// template
export const templateDeployKey = 'cloud.sealos.io/deploy-on-sealos';
export const templateDisplayNameKey = 'cloud.sealos.io/deploy-on-sealos-displayName';

// ownerReferences (template instance cascade deletion)
export const ownerReferencesKey = 'cloud.sealos.io/owner-references';
export const ownerReferencesReadyValue = 'ready';

// db
export const kubeblocksTypeKey = 'clusterdefinition.kubeblocks.io/name';
export const dbProviderKey = 'sealos-db-provider-cr';
// labels
export const componentLabel = 'app.kubernetes.io/component';
