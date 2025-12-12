import { Toleration } from '@/k8slens/kube-object';

interface Props {
  tolerations: Array<Toleration>;
}

export const KubeObjectTolerations = ({ tolerations }: Props) => {
  return (
    <div className="flex flex-col">
      {tolerations.map((toleration, index) => (
        <div key={index} className="py-2 border-b border-[#E8E8E8] last:border-b-0">
          <div className="flex justify-between items-center mb-1">
            <div className="text-[#262626] text-sm break-all font-medium">
              {toleration.key || <span className="text-gray-500 italic">No Key</span>}
            </div>
            {toleration.effect && (
              <span className="text-gray-500 text-xs">{toleration.effect}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-2 text-xs text-gray-500">
            <span className="text-gray-400">Op:</span>
            <span>{toleration.operator}</span>
            {toleration.value && (
              <>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-gray-400">Val:</span>
                <span>{toleration.value}</span>
              </>
            )}
            {typeof toleration.tolerationSeconds === 'number' && (
              <>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-gray-400">Sec:</span>
                <span>{toleration.tolerationSeconds}s</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
