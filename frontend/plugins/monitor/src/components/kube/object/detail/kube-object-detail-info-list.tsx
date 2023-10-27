import { KubeRecord } from '../../kube-record';
import { KubeObjectAge } from '../kube-object-age';
import { LocaleDate } from '../../local-date';
import moment from 'moment-timezone';
import { KubeBadge } from '../../kube-badge';
import { Box } from '@chakra-ui/react';
import { KubeObject } from '@/k8slens/kube-object';
import { KubeObjectInfo, getKubeObjectInfo } from '@/utils/kube-object-info';
import { StringKeyOf } from 'type-fest';

export type HiddenField = StringKeyOf<KubeObjectInfo>;

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
      <KubeRecord
        hidden={hiddenFields.includes('creationTimestamp') || !creationTimestamp}
        name="Created"
        value={
          <>
            <KubeObjectAge creationTimestamp={creationTimestamp} compact={false} />
            {' ago '}
            {creationTimestamp && (
              <LocaleDate date={creationTimestamp} localeTimezone={moment.tz.guess()} />
            )}
          </>
        }
      />
      <KubeRecord
        hidden={hiddenFields.includes('name')}
        name="Name"
        value={name} // TODO: KubeObject Icon
      />
      <KubeRecord hidden={hiddenFields.includes('uid')} name="UID" value={uid} />
      <KubeRecord
        hidden={hiddenFields.includes('resourceVersion')}
        name="Resource Version"
        value={resourceVersion}
      />
      {labels.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes('labels')}
          name="Labels"
          value={labels.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      {annotations.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes('annotations')}
          name="Annotations"
          value={annotations.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}

      {finalizers.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes('finalizers')}
          name="Finalizers"
          value={finalizers.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      {ownerRefs.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes('ownerRefs')}
          name="ControlledBy"
          value={ownerRefs.map(({ name, kind }) => (
            <Box key={name}>
              {kind}{' '}
              <Box as="span" textColor={'blue.300'}>
                {name}
              </Box>
            </Box>
          ))}
        />
      )}
    </>
  );
};
