import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeObjectAge } from '../kube-object-age';
import { LocaleDate } from '../../local-date';
import moment from 'moment-timezone';
import { KubeBadge } from '../../kube-badge';
import { Box } from '@chakra-ui/react';
import { KubeObject } from '@/k8slens/kube-object';
import { KubeObjectInfo, getKubeObjectInfo } from '@/utils/kube-object-info';

export type HiddenField = Extract<keyof KubeObjectInfo, string>;

interface Props {
  hiddenFields?: Array<HiddenField>;
  obj: KubeObject;
}

export const KubeObjectInfoList = ({ hiddenFields = ['uid', 'resourceVersion'], obj }: Props) => {
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
      <DrawerItem
        hidden={hiddenFields.includes('creationTimestamp') || !creationTimestamp}
        name="Created"
        value={
          <>
            <KubeObjectAge obj={obj} compact={false} />
          </>
        }
      />
      <DrawerItem
        hidden={hiddenFields.includes('name')}
        name="Name"
        value={name} // TODO: KubeObject Icon
      />
      <DrawerItem hidden={hiddenFields.includes('uid')} name="UID" value={uid} />
      <DrawerItem
        hidden={hiddenFields.includes('resourceVersion')}
        name="Resource Version"
        value={resourceVersion}
      />
      {labels.length > 0 && (
        <DrawerItem
          hidden={hiddenFields.includes('labels')}
          name="Labels"
          vertical
          value={
            <div className="flex flex-col gap-1 items-start">
              {labels.map((label) => {
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
          hidden={hiddenFields.includes('annotations')}
          name="Annotations"
          vertical
          value={
            <div className="flex flex-col gap-1 items-start">
              {annotations.map((label) => {
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

      {finalizers.length > 0 && (
        <DrawerItem
          hidden={hiddenFields.includes('finalizers')}
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
          hidden={hiddenFields.includes('ownerRefs')}
          name="ControlledBy"
          value={ownerRefs.map(({ name, kind }) => (
            <Box key={name}>
              {kind}{' '}
              <Box as="span" color={'blue.300'}>
                {name}
              </Box>
            </Box>
          ))}
        />
      )}
    </>
  );
};
