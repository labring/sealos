import yaml from 'js-yaml';
import { minReplicasKey } from '@/constants/app';
import type { AppEditType } from '@/types/app';
import { json2HPA } from './deployYaml2Json';

/**
 * Restore payload stored in the `deploy.cloud.sealos.io/pause` annotation while an
 * app is paused. `spec` is the full HPA spec captured verbatim at pause time; on
 * resume it is re-applied unchanged, so the CPU target is never re-scaled and the
 * workload kind is never re-guessed. `target`/`value`/`kind`/`min*`/`max*` remain for
 * display and for apps paused before `spec` was recorded (legacy annotations).
 */
export interface PauseData {
  target: string;
  value: string;
  spec?: any;
  kind?: string;
  minReplicas?: string;
  maxReplicas?: string;
}

const parseNumber = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

/** Build the pause payload from a live HPA object and the workload kind. */
export function buildPauseData(hpa: any, appKind?: string): PauseData {
  const metric = hpa?.spec?.metrics?.[0];
  const gpu = metric?.type === 'Pods' || metric?.pods?.metric?.name === 'DCGM_FI_DEV_GPU_UTIL';
  const utilization = metric?.resource?.target?.averageUtilization;
  const gpuValue = metric?.pods?.target?.averageValue;
  // `value` keeps the display (page) representation: utilization is stored ×10 in
  // the HPA, so divide back here. `spec` remains the source of truth for restore.
  const pageValue = gpu
    ? gpuValue
    : parseNumber(utilization) !== undefined
    ? utilization! / 10
    : 50;

  return {
    target: gpu ? 'gpu' : metric?.resource?.name || 'cpu',
    value: `${pageValue}`,
    spec: hpa?.spec,
    kind: appKind,
    minReplicas: hpa?.spec?.minReplicas !== undefined ? `${hpa.spec.minReplicas}` : undefined,
    maxReplicas: hpa?.spec?.maxReplicas !== undefined ? `${hpa.spec.maxReplicas}` : undefined
  };
}

export function parsePauseData(raw: string | undefined): PauseData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PauseData;
  } catch {
    return null;
  }
}

/** True when the paused app had an autoscaling policy worth restoring. */
export function shouldRestoreHpa(data: PauseData | null): boolean {
  return !!(data && (data.spec || data.target));
}

/**
 * Whether an existing pause payload already holds a recoverable HPA spec. Used to
 * avoid a second pause wiping out the data captured by the first.
 */
export function hasSavedHpa(raw: string | undefined): boolean {
  const data = parsePauseData(raw);
  return !!(data && data.spec);
}

/**
 * Produce the HPA manifest to re-create on resume. A captured `spec` is dumped
 * verbatim (no ×10, no kind inference); otherwise fall back to `json2HPA` for
 * legacy annotations, correcting the historically over-stored `value` and passing
 * the workload kind through `storeList`.
 */
export function restoreHPAYaml(appName: string, data: PauseData, appKind?: string): string {
  if (data.spec) {
    return yaml.dump({
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: { name: appName },
      spec: data.spec
    });
  }

  const isDeployment = (data.kind || appKind) === 'Deployment';
  // Legacy annotations stored `value` as the raw HPA utilization (already ×10), so
  // divide it back to a page value before json2HPA multiplies again.
  const legacyPageValue = data.target === 'gpu' ? Number(data.value) : Number(data.value) / 10;
  return json2HPA({
    appName,
    storeList: isDeployment ? [] : [{ name: appName } as any],
    hpa: {
      use: true,
      target: data.target || 'cpu',
      value: legacyPageValue,
      minReplicas: data.minReplicas || '1',
      maxReplicas: data.maxReplicas || '2'
    }
  } as unknown as AppEditType);
}

/**
 * Replicas to start an elastic app with: the recovered policy's `minReplicas`,
 * falling back to the persisted annotation, then to 1.
 */
export function resolveStartReplicas(
  data: PauseData | null,
  annotations: Record<string, any> = {}
): number {
  const fromSpec = data?.spec?.minReplicas ?? parseNumber(data?.minReplicas);
  if (fromSpec !== undefined && !Number.isNaN(fromSpec)) return Number(fromSpec);
  const fromAnnotation = parseNumber(annotations?.[minReplicasKey]);
  if (fromAnnotation !== undefined && !Number.isNaN(fromAnnotation)) return fromAnnotation;
  return 1;
}
