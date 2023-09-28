"use client";
import { useState } from "react";
import { KubeTable, Row } from "../common/kube-table";
import {
  StatefulSetDetail,
  StatefulSetDetailDrawer,
} from "./statefulset-detail-drawer";
import { useDisclosure } from "@chakra-ui/react";
import { getKubeObjectInfo } from "@/utils/kube-object-info";
import { Pod, StatefulSet } from "@/k8slens/kube-object";
import { KubeObjectAge } from "../common/object/kube-object-age";

export type StatefulSetOverviewData = {
  statefulSet: StatefulSet;
  childPods: Array<Pod>;
};

const columnNames = ["Name", "Pods", "Replicas", "Age"];

export const StatefulSetOverviewTable = ({
  data,
}: {
  data: Array<StatefulSetOverviewData>;
}) => {
  const [detail, SetDetail] = useState<StatefulSetDetail>();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const details: Array<StatefulSetDetail> = data.map(
    ({ statefulSet, childPods }) => {
      return {
        statefulSetInfo: {
          ...getKubeObjectInfo(statefulSet),
          status: statefulSet.status,
          images: statefulSet.getImages(),
          selectors: statefulSet.getSelectors(),
          podStatusPhases: childPods.map((pod) => pod.getStatus()),
          affinities: statefulSet.getAffinity(),
          affinitiesNum: statefulSet.getAffinityNumber(),
          tolerations: statefulSet.getTolerations(),
        },
      };
    }
  );

  const rows: Array<Row> = details.map(({ statefulSetInfo }, idx) => {
    const {
      readyReplicas = 0,
      currentReplicas = 0,
      replicas = 0,
    } = statefulSetInfo.status ?? {};

    return {
      idx,
      tds: [
        statefulSetInfo.name,
        `${readyReplicas}/${currentReplicas}`,
        replicas,
        <KubeObjectAge creationTimestamp={statefulSetInfo.creationTimestamp} />,
      ],
      onClickRow: (idx) => {
        SetDetail(details[idx as number]);
        onOpen();
      },
    };
  });

  return (
    <>
      <KubeTable columnNames={columnNames} rows={rows} />
      {detail && (
        <StatefulSetDetailDrawer
          detail={detail}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </>
  );
};
