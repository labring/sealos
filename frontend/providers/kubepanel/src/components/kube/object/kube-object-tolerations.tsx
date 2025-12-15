import { Toleration } from '@/k8slens/kube-object';

interface Props {
  tolerations: Array<Toleration>;
}

export const KubeObjectTolerations = ({ tolerations }: Props) => {
  return (
    <div className="flex flex-col gap-2">
      {tolerations.map((toleration, index) => {
        const op = (toleration.operator || 'Equal').toLowerCase();
        return (
          <div key={index} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-gray-500">when</span>
            <span className="font-semibold text-gray-900 break-all">
              {toleration.key || 'all keys'}
            </span>
            <span className="text-gray-500">{op === 'exists' ? 'exists' : 'equals'}</span>
            {op !== 'exists' && (
              <span className="font-semibold text-gray-900 break-all">
                {toleration.value !== undefined ? toleration.value : '""'}
              </span>
            )}
            <span className="text-gray-500 mr-1">:</span>
            {toleration.effect ? (
              <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs border border-orange-200 font-medium">
                {toleration.effect}
              </span>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs border border-gray-200 font-medium">
                All effects
              </span>
            )}
            {typeof toleration.tolerationSeconds === 'number' && (
              <span className="text-gray-500 ml-1">({toleration.tolerationSeconds}s)</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
