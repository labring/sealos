import {
  BaseKubeObjectCondition,
  DeploymentSpec,
  DeploymentStatus,
} from "@/k8slens/kube-object";
import { KubeRecord } from "@/components/common/kube-record";
import { KubeBadge } from "@/components/common/kube-badge";
import { Box, Tooltip } from "@chakra-ui/react";
import { getConditionColor } from "@/utils/condition-color";
import { KubeObjectInfo } from "@/utils/kube-object-info";
import { KubeObjectDetailTolerations } from "../common/object/detail/kube-object-detail-tolerations";
import { KubeObjectDetailAffinities } from "../common/object/detail/kube-object-detail-affinities";
import { keys } from "lodash";

export type DeploymentInfo = KubeObjectInfo & {
  status?: DeploymentStatus;
  spec: DeploymentSpec;
  selectors: Array<string>;
  conditions: Array<BaseKubeObjectCondition>;
};

export const DeploymentInfoList = ({ info }: { info: DeploymentInfo }) => {
  const { status, spec, selectors, conditions } = info;

  return (
    <>
      <KubeRecord
        name="Replicas"
        value={
          <>
            {`${spec.replicas} desired, ${
              status?.updatedReplicas ?? 0
            } updated, `}
            {`${status?.replicas ?? 0} total, ${
              status?.availableReplicas ?? 0
            } available, `}
            {`${status?.unavailableReplicas ?? 0} unavailable`}
          </>
        }
      />
      {selectors.length > 0 && (
        <KubeRecord
          name="Selector"
          value={selectors.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      <KubeRecord name="Strategy Type" value={spec.strategy.type} />
      <KubeRecord
        name="Conditions"
        value={
          <>
            {conditions.map(({ type, message, lastTransitionTime }) => (
              <Tooltip
                key={type}
                label={
                  <>
                    <p>{message}</p>
                    <br />
                    <p>
                      Last transition time: {lastTransitionTime ?? "<unknown>"}
                    </p>
                  </>
                }
                hasArrow
                placement="auto-start"
              >
                <Box as="span">
                  <KubeBadge
                    color={{
                      textColor: "white",
                      backgroundColor: getConditionColor(type),
                    }}
                    label={type}
                  />
                </Box>
              </Tooltip>
            ))}
          </>
        }
      />
      <KubeObjectDetailTolerations
        tolerations={spec.template.spec.tolerations ?? []}
      />
      <KubeObjectDetailAffinities
        affinities={spec.template.spec.affinity}
        affinitiesNum={keys(spec.template.spec.affinity).length}
      />
      {/* TODO: DeploymentReplicaSets */}
      {/* TODO: PodDetailList */}
    </>
  );
};
