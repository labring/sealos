import { PodStatusPhase, StatefulSetStatus } from "@/k8slens/kube-object";
import { KubeObjectInfo } from "@/utils/kube-object-info";
import { KubeRecord } from "../common/kube-record";
import { KubeBadge } from "../common/kube-badge";
import { countBy, entries } from "lodash";
import { Box } from "@chakra-ui/react";
import { getStatusColor } from "@/utils/status-color";
import {
  KubeObjectAffinitiesProps,
} from "../common/object/kube-object-affinities";
import {
  KubeObjectTolerationsProps,
} from "../common/object/kube-object-tolerations";
import { KubeObjectDetailTolerations } from "../common/object/detail/kube-object-detail-tolerations";
import { KubeObjectDetailAffinities } from "../common/object/detail/kube-object-detail-affinities";

export type StatefulSetInfo = KubeObjectInfo &
  KubeObjectAffinitiesProps &
  KubeObjectTolerationsProps & {
    status?: StatefulSetStatus;
    images: Array<string | undefined>;
    selectors: Array<string>;
    podStatusPhases: Array<PodStatusPhase>;
  };

export const StatefulSetInfoList = ({ info }: { info: StatefulSetInfo }) => {
  const { images, selectors, podStatusPhases } = info;

  return (
    <>
      {selectors.length > 0 && (
        <KubeRecord
          name="Selector"
          value={selectors.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      {images.length > 0 && (
        <KubeRecord
          name="Images"
          value={images.map((image) => (
            <p key={image}>{image}</p>
          ))}
        />
      )}

      <KubeObjectDetailTolerations tolerations={info.tolerations} />
      <KubeObjectDetailAffinities
        affinities={info.affinities}
        affinitiesNum={info.affinitiesNum}
      />

      {podStatusPhases.length > 0 && (
        <KubeRecord
          name="Pod Status"
          value={(() => {
            const statuses = countBy(podStatusPhases);
            return entries(statuses).map(([phase, count]) => (
              <Box
                as="span"
                mr="2px"
                textColor={getStatusColor(phase)}
                key={phase}
                _last={{ mr: 0 }}
              >{`${phase}: ${count}`}</Box>
            ));
          })()}
        />
      )}
    </>
  );
};
