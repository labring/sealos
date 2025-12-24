import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeObject } from '@/k8slens/kube-object';
import { getKubeObjectInfo } from '@/utils/kube-object-info';
import { getStatusTextTone } from '@/utils/status-color';
import { Box } from '@chakra-ui/react';
import { Divider } from 'antd';
import { KubeBadge } from '../../kube-badge';
import { KubeObjectAge } from '../kube-object-age';

interface Props {
  obj: KubeObject;
}

export const KubeObjectInfoList = ({ obj }: Props) => {
  const {
    creationTimestamp,
    name,
    uid,
    resourceVersion,
    labels,
    annotations,
    finalizers,
    ownerRefs
  } = getKubeObjectInfo(obj);

  return (
    <>
      <div className="[&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
        <div className="flex items-center justify-between py-2 border-b border-[#E8E8E8]">
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Name</span>
            <span className="text-[#262626] text-xs">{name}</span>
          </div>
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Created</span>
            <span className="text-[#262626] text-xs">
              <KubeObjectAge obj={obj} compact={false} />
            </span>
          </div>
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Status</span>
            <span className="text-[#262626] text-xs">
              {(() => {
                const status =
                  (obj as any).getStatusMessage?.() ||
                  (obj as any).getStatus?.() ||
                  (obj as any).status?.phase ||
                  '-';
                const textTone = getStatusTextTone(status);
                const colorClass =
                  textTone === 'success'
                    ? 'text-green-600'
                    : textTone === 'warning'
                      ? 'text-yellow-600'
                      : textTone === 'danger'
                        ? 'text-red-600'
                        : 'text-[#262626]';
                return <span className={colorClass}>{status}</span>;
              })()}
            </span>
          </div>
        </div>
        <DrawerItem name="UID" value={<span className="text-xs">{uid}</span>} />
        {finalizers.length > 0 && (
          <DrawerItem
            name="Finalizers"
            value={
              <div className="flex flex-wrap gap-1">
                {finalizers.map((label) => (
                  <KubeBadge key={label} label={label} />
                ))}
              </div>
            }
          />
        )}
        {ownerRefs.length > 0 && (
          <DrawerItem
            name="ControlledBy"
            value={ownerRefs.map(({ name, kind }) => (
              <Box key={name} className="text-xs">
                {kind}{' '}
                <Box as="span" color={'blue.300'}>
                  {name}
                </Box>
              </Box>
            ))}
          />
        )}
      </div>
      <Divider />
      {(labels.length > 0 || annotations.length > 0) && (
        <div className="[&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
          {labels.length > 0 && (
            <DrawerItem
              name="Labels"
              vertical
              value={
                <div className="flex flex-wrap gap-1 items-start">
                  {[...labels].sort().map((label) => {
                    const sepIndex = label.indexOf(': ');
                    if (sepIndex === -1)
                      return <KubeBadge key={label} label={label} className="m-0!" />;
                    const key = label.slice(0, sepIndex);
                    const value = label.slice(sepIndex + 2);
                    return (
                      <KubeBadge
                        key={label}
                        label={
                          <span>
                            <span className="font-medium text-gray-900">{key}</span>
                            <span className="text-gray-900 mr-1">:</span>
                            <span className="text-gray-600">{value}</span>
                          </span>
                        }
                        className="m-0!"
                      />
                    );
                  })}
                </div>
              }
            />
          )}
          {annotations.length > 0 && (
            <DrawerItem
              name="Annotations"
              vertical
              value={
                <div className="flex flex-wrap gap-1 items-start">
                  {[...annotations].sort().map((label) => {
                    if (label.startsWith('kubectl.kubernetes.io/last-applied-configuration')) {
                      return (
                        <KubeBadge
                          key={label}
                          label="kubectl.kubernetes.io/last-applied-configuration: -"
                          expandedLabel={label}
                          className="m-0!"
                        />
                      );
                    }
                    const sepIndex = label.indexOf(': ');
                    if (sepIndex === -1)
                      return <KubeBadge key={label} label={label} className="m-0!" />;
                    const key = label.slice(0, sepIndex);
                    const value = label.slice(sepIndex + 2);

                    return (
                      <KubeBadge
                        key={label}
                        label={
                          <span>
                            <span className="font-medium text-gray-900">{key}</span>
                            <span className="text-gray-400 mr-1">:</span>
                            <span className="text-gray-600">{value}</span>
                          </span>
                        }
                        className="m-0!"
                      />
                    );
                  })}
                </div>
              }
            />
          )}
        </div>
      )}
      <>{(labels.length > 0 || annotations.length > 0) && <Divider />}</>
    </>
  );
};
