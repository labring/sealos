import React from 'react';
import {
  Affinity,
  LabelSelector,
  LabelMatchExpression,
  NodeAffinity,
  PodAffinity,
  SpecificAffinity
} from '@/k8slens/kube-object';

interface Props {
  affinity: Affinity;
}

// --- Helper: Render a single LabelMatchExpression as natural language ---
const renderExpression = (expr: LabelMatchExpression): string => {
  const { key, operator, values } = expr;
  switch (operator) {
    case 'In':
      return `${key} in [${values?.join(', ') || ''}]`;
    case 'NotIn':
      return `${key} not in [${values?.join(', ') || ''}]`;
    case 'Exists':
      return `${key} exists`;
    case 'DoesNotExist':
      return `${key} does not exist`;
    default:
      return `${key} ${operator} ${(values as string[] | undefined)?.join(', ') || ''}`;
  }
};

// --- Helper: Render LabelSelector as badges ---
const SelectorBadges = ({ selector }: { selector?: LabelSelector }) => {
  if (!selector) return null;

  const labels = selector.matchLabels ? Object.entries(selector.matchLabels) : [];
  const expressions = selector.matchExpressions || [];

  if (labels.length === 0 && expressions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 items-start mb-1">
      {labels.map(([k, v]) => (
        <span
          key={k}
          className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs border border-gray-200 break-all whitespace-normal"
        >
          <span className="font-medium text-gray-900">{k}</span>
          <span className="text-gray-900 mr-1">:</span>
          <span className="text-gray-600">{v}</span>
        </span>
      ))}
      {expressions.map((expr, i) => (
        <span
          key={i}
          className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-200 break-all whitespace-normal"
        >
          {renderExpression(expr)}
        </span>
      ))}
    </div>
  );
};

// --- NodeAffinity Rendering ---
const NodeAffinityCard = ({ affinity }: { affinity: SpecificAffinity<NodeAffinity> }) => {
  // In K8s NodeAffinity, required... is a NodeSelector object, not an array.
  // We cast to any to safely access nodeSelectorTerms.
  const required = affinity.requiredDuringSchedulingIgnoredDuringExecution as any;
  const nodeSelectorTerms = required?.nodeSelectorTerms || [];
  const preferred = affinity.preferredDuringSchedulingIgnoredDuringExecution || [];

  const hasRequired = nodeSelectorTerms.length > 0;
  const hasPreferred = preferred.length > 0;

  if (!hasRequired && !hasPreferred) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="font-medium text-gray-900">Node Affinity</div>
      {nodeSelectorTerms.map((term: any, i: number) => (
        <div key={`req-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs border border-red-200 font-medium">
              Required
            </span>
            <span className="text-gray-500">nodes where</span>
            {term.matchExpressions?.map((expr: any, k: number) => (
              <div key={k} className="contents">
                {k > 0 && <span className="text-gray-500">and</span>}
                <span className="font-semibold text-gray-900 break-all">{expr.key}</span>
                <span className="text-gray-500">{expr.operator.toLowerCase()}</span>
                {expr.values && (
                  <span className="font-semibold text-gray-900 break-all">
                    [{expr.values.join(', ')}]
                  </span>
                )}
              </div>
            ))}
            {/* Handle matchFields if present */}
            {term.matchFields?.map((expr: any, k: number) => (
              <div key={`field-${k}`} className="contents">
                {(k > 0 || (term.matchExpressions?.length ?? 0) > 0) && (
                  <span className="text-gray-500">and</span>
                )}
                <span className="font-semibold text-gray-900 break-all">{expr.key}</span>
                <span className="text-gray-500">{expr.operator.toLowerCase()}</span>
                {expr.values && (
                  <span className="font-semibold text-gray-900 break-all">
                    [{expr.values.join(', ')}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {preferred?.map((pref, i) => (
        <div key={`pref-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs border border-orange-200 font-medium">
              Preferred
            </span>
            <span className="text-gray-500">nodes where</span>
            {pref.preference?.matchExpressions?.map((expr, j) => (
              <div key={j} className="contents">
                {j > 0 && <span className="text-gray-500">and</span>}
                <span className="font-semibold text-gray-900 break-all">{expr.key}</span>
                <span className="text-gray-500">{expr.operator.toLowerCase()}</span>
                {expr.values && (
                  <span className="font-semibold text-gray-900 break-all">
                    [{expr.values.join(', ')}]
                  </span>
                )}
              </div>
            ))}
            <span className="text-gray-400 text-xs ml-auto">(weight: {pref.weight})</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- PodAffinity / PodAntiAffinity Rendering ---
const PodAffinityCard = ({
  title,
  affinity
}: {
  title: string;
  affinity: SpecificAffinity<PodAffinity>;
}) => {
  const isAnti = title.includes('Anti');
  const required = affinity.requiredDuringSchedulingIgnoredDuringExecution;
  const preferred = affinity.preferredDuringSchedulingIgnoredDuringExecution;

  const hasRequired = (required?.length || 0) > 0;
  const hasPreferred = (preferred?.length || 0) > 0;

  if (!hasRequired && !hasPreferred) return null;

  // Simplified text: just "Avoid pods" or "Run with pods".
  // The badge (Required/Preferred) provides the context of stringency/preference.
  const actionText = isAnti ? 'Avoid pods' : 'Run with pods';

  const renderSelector = (selector?: LabelSelector) => {
    if (!selector) return <span className="italic text-gray-400">any</span>;
    const parts: React.ReactNode[] = [];
    if (selector.matchLabels) {
      Object.entries(selector.matchLabels).forEach(([k, v]) => {
        parts.push(
          <span key={`l-${k}`} className="font-semibold text-gray-900 break-all">
            {k}={v}
          </span>
        );
      });
    }
    if (selector.matchExpressions) {
      selector.matchExpressions.forEach((expr, i) => {
        parts.push(
          <span key={`e-${i}`} className="font-semibold text-gray-900 break-all">
            {expr.key} {expr.operator.toLowerCase()}{' '}
            {expr.values ? `[${expr.values.join(', ')}]` : ''}
          </span>
        );
      });
    }
    if (parts.length === 0) return <span className="italic text-gray-400">any</span>;
    return (
      <span className="inline-flex flex-wrap gap-1">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-gray-400">,</span>}
            {p}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="font-medium text-gray-900">{title}</div>
      {required?.map((term, i) => (
        <div key={`req-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs border border-red-200 font-medium">
              Required
            </span>
            <span className="text-gray-500">{actionText}</span>
            {renderSelector(term.labelSelector)}
            <span className="text-gray-500">in</span>
            <span className="font-semibold text-gray-900 break-all">{term.topologyKey}</span>
            {(term as any).namespaces && (
              <span className="text-gray-400 text-xs">
                (ns: {(term as any).namespaces.join(', ')})
              </span>
            )}
          </div>
        </div>
      ))}

      {preferred?.map((pref, i) => {
        // Cast to any because PodAffinity type in api-types.ts lacks weight/podAffinityTerm
        const weight = (pref as any).weight;
        const term = (pref as any).podAffinityTerm || pref;

        return (
          <div key={`pref-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs border border-orange-200 font-medium">
                Preferred
              </span>
              <span className="text-gray-500">{actionText}</span>
              {renderSelector(term.labelSelector)}
              <span className="text-gray-500">in</span>
              <span className="font-semibold text-gray-900 break-all">{term.topologyKey}</span>
              <span className="text-gray-400 text-xs ml-auto">(weight: {weight})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---
export const KubeObjectAffinities = ({ affinity }: Props) => {
  const { nodeAffinity, podAffinity, podAntiAffinity } = affinity;

  return (
    <div className="grid gap-3 grid-cols-1">
      {nodeAffinity && <NodeAffinityCard affinity={nodeAffinity} />}
      {podAffinity && <PodAffinityCard title="Pod Affinity" affinity={podAffinity} />}
      {podAntiAffinity && <PodAffinityCard title="Pod Anti-Affinity" affinity={podAntiAffinity} />}
    </div>
  );
};
