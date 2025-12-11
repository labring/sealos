import { Affinity, LabelSelector, LabelMatchExpression } from '@/k8slens/kube-object';

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
    <div className="flex flex-wrap gap-1 mb-1">
      {labels.map(([k, v]) => (
        <span
          key={k}
          className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs border border-gray-200 whitespace-nowrap"
        >
          {k}={v}
        </span>
      ))}
      {expressions.map((expr, i) => (
        <span
          key={i}
          className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-200 whitespace-nowrap"
        >
          {renderExpression(expr)}
        </span>
      ))}
    </div>
  );
};

// --- NodeAffinity Rendering ---
const NodeAffinityCard = ({ affinity }: { affinity: any }) => {
  if (!affinity) return null;

  const required = affinity.requiredDuringSchedulingIgnoredDuringExecution;
  const preferred = affinity.preferredDuringSchedulingIgnoredDuringExecution;

  const hasRequired = required?.nodeSelectorTerms?.length > 0;
  const hasPreferred = preferred?.length > 0;

  if (!hasRequired && !hasPreferred) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold text-gray-800 mb-2">Node Affinity</div>

      {/* Required: nodeSelectorTerms[] */}
      {hasRequired && (
        <div className="mb-2">
          <div className="text-xs text-red-600 font-medium mb-1">Required</div>
          {required.nodeSelectorTerms.map((term: any, i: number) => (
            <div key={`req-${i}`} className="mb-1">
              <SelectorBadges selector={term} />
            </div>
          ))}
        </div>
      )}

      {/* Preferred: { weight, preference }[] */}
      {hasPreferred && (
        <div>
          <div className="text-xs text-orange-600 font-medium mb-1">Preferred</div>
          {preferred.map((item: any, i: number) => (
            <div key={`pref-${i}`} className="flex flex-wrap items-center gap-1 mb-1">
              {item.weight !== undefined && (
                <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs border border-orange-200">
                  w:{item.weight}
                </span>
              )}
              <SelectorBadges selector={item.preference} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- PodAffinity / PodAntiAffinity Rendering ---
const PodAffinityCard = ({ title, affinity }: { title: string; affinity: any }) => {
  if (!affinity) return null;

  const required = affinity.requiredDuringSchedulingIgnoredDuringExecution;
  const preferred = affinity.preferredDuringSchedulingIgnoredDuringExecution;

  const hasRequired = required?.length > 0;
  const hasPreferred = preferred?.length > 0;

  if (!hasRequired && !hasPreferred) return null;

  // Render a PodAffinityTerm (used for required rules)
  const renderPodAffinityTerm = (term: any, prefix: string, idx: number) => (
    <div key={`${prefix}-${idx}`} className="mb-2 last:mb-0">
      <SelectorBadges selector={term.labelSelector} />
      {term.topologyKey && (
        <div className="text-xs text-gray-500">
          Topology: <span className="text-gray-700 font-medium">{term.topologyKey}</span>
        </div>
      )}
      {term.namespaces?.length > 0 && (
        <div className="text-xs text-gray-500">
          Namespaces: <span className="text-gray-700">{term.namespaces.join(', ')}</span>
        </div>
      )}
      {term.namespaceSelector && (
        <div className="text-xs text-gray-500 mt-1">
          <span className="mr-1">Namespace Selector:</span>
          <SelectorBadges selector={term.namespaceSelector} />
        </div>
      )}
    </div>
  );

  // Render a WeightedPodAffinityTerm (used for preferred rules)
  const renderWeightedTerm = (item: any, idx: number) => {
    const term = item.podAffinityTerm || item;
    return (
      <div key={`pref-${idx}`} className="mb-2 last:mb-0">
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {item.weight !== undefined && (
            <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs border border-orange-200">
              w:{item.weight}
            </span>
          )}
          <SelectorBadges selector={term.labelSelector} />
        </div>
        {term.topologyKey && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">topology:</span>{' '}
            <span className="text-gray-700">{term.topologyKey}</span>
          </div>
        )}
        {term.namespaces?.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">namespaces:</span>{' '}
            <span className="text-gray-700">{term.namespaces.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold text-gray-800 mb-2">{title}</div>

      {/* Required: PodAffinityTerm[] directly */}
      {hasRequired && (
        <div className="mb-2">
          <div className="text-xs text-red-600 font-medium mb-1">Required</div>
          {required.map((term: any, i: number) => renderPodAffinityTerm(term, 'req', i))}
        </div>
      )}

      {/* Preferred: WeightedPodAffinityTerm[] with nested podAffinityTerm */}
      {hasPreferred && (
        <div>
          <div className="text-xs text-orange-600 font-medium mb-1">Preferred</div>
          {preferred.map((item: any, i: number) => renderWeightedTerm(item, i))}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
export const KubeObjectAffinities = ({ affinity }: Props) => {
  const { nodeAffinity, podAffinity, podAntiAffinity } = affinity;

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {nodeAffinity && <NodeAffinityCard affinity={nodeAffinity} />}
      {podAffinity && <PodAffinityCard title="Pod Affinity" affinity={podAffinity} />}
      {podAntiAffinity && <PodAffinityCard title="Pod Anti-Affinity" affinity={podAntiAffinity} />}
    </div>
  );
};
