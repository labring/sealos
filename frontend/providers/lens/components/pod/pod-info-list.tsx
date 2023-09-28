import { PodCondition, Toleration } from "@/k8slens/kube-object";
import { Box, Tooltip } from "@chakra-ui/react";
import { KubeRecord } from "../common/kube-record";
import { KubeBadge } from "../common/kube-badge";
import { PodStatus } from "./pod-status";
import { KubeObjectInfo } from "@/utils/kube-object-info";
import { KubeObjectAffinitiesProps } from "../common/object/kube-object-affinities";
import { KubeObjectTolerationsProps } from "../common/object/kube-object-tolerations";

export type PodInfo = KubeObjectInfo &
  KubeObjectAffinitiesProps &
  KubeObjectTolerationsProps & {
    restarts: number;
    podStatus: string;
    podIP?: string;
    podIPs: Array<string>;
    serviceAccount: string;
    priorityClass: string;
    qosClass: string;
    runtimeClass: string;
    conditions: Array<PodCondition>;
  };

export const PodInfoList = ({ info }: { info: PodInfo }) => {
  return (
    <>
      <KubeRecord name="Status" value={<PodStatus status={info.podStatus} />} />

      <KubeRecord name="Pod IP" value={info.podIP} />

      <KubeRecord
        hidden={info.podIPs.length === 0}
        name="Pod IPs"
        value={info.podIPs.map((label) => (
          <KubeBadge key={label} label={label} />
        ))}
      />

      <KubeRecord name="Service Account" value={info.serviceAccount} />

      <KubeRecord
        hidden={info.priorityClass === ""}
        name="Priority Class"
        value={info.priorityClass}
      />

      <KubeRecord name="QoS Class" value={info.qosClass} />

      <KubeRecord
        hidden={info.runtimeClass === ""}
        name="Runtime Class"
        value={info.runtimeClass}
      />

      <KubeRecord
        hidden={info.conditions.length === 0}
        name="Conditions"
        value={info.conditions.map(({ type, lastTransitionTime }) => (
          <>
            <Tooltip
              key={type}
              label={`Last transition time: ${
                lastTransitionTime ?? "<unknown>"
              }`}
              hasArrow
              placement="auto-start"
            >
              {/*fix tooltip*/}
              <Box as="span">
                <KubeBadge label={type} />
              </Box>
            </Tooltip>
          </>
        ))}
      />
    </>
  );
};
