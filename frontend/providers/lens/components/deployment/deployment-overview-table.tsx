"use client";
import { Box, Tooltip, useDisclosure } from "@chakra-ui/react";
import {
  DeploymentDetail,
  DeploymentDetailDrawer,
} from "./deployment-detail-drawer";
import { getConditionColor } from "@/utils/condition-color";
import { useState } from "react";
import { KubeTable, Row } from "../common/kube-table";
import { Deployment } from "@/k8slens/kube-object";
import { getKubeObjectInfo } from "@/utils/kube-object-info";
import { KubeObjectAge } from "../common/object/kube-object-age";

const columnNames = ["Name", "Pods", "Replicas", "Age", "Conditions"];

export const DeploymentOverviewTable = ({
  deployments,
}: {
  deployments: Array<Deployment>;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detail, SetDetail] = useState<DeploymentDetail>();

  const details: Array<DeploymentDetail> = deployments.map((dep) => ({
    deploymentInfo: {
      ...getKubeObjectInfo(dep),
      status: dep.status,
      spec: dep.spec,
      selectors: dep.getSelectors(),
      conditions: dep.getConditions(),
    },
  }));

  const rows: Array<Row> = details.map(({ deploymentInfo }, idx) => {
    const { replicas = 0, availableReplicas = 0 } = deploymentInfo.status ?? {};
    return {
      idx,
      tds: [
        deploymentInfo.name,
        `${availableReplicas}/${replicas}`,
        replicas,
        <KubeObjectAge creationTimestamp={deploymentInfo.creationTimestamp} />,
        deploymentInfo.conditions.map(({ type, message }) => (
          <Tooltip key={type} label={message} hasArrow placement="auto-start">
            <Box
              as="span"
              textColor={getConditionColor(type)}
              mr="8px"
              _last={{ mr: 0 }}
            >
              {type}
            </Box>
          </Tooltip>
        )),
      ],
      onClickRow(idx) {
        SetDetail(details[idx as number]);
        onOpen();
      },
    };
  });

  return (
    <>
      <KubeTable columnNames={columnNames} rows={rows} />
      {detail && (
        <DeploymentDetailDrawer
          detail={detail}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </>
  );
};
