"use client";
import { Box, useDisclosure } from "@chakra-ui/react";
import { PVCDetail, PVCDetailDrawer } from "./pvc-detail-drawer";
import { useState } from "react";
import { KubeTable, Row } from "../common/kube-table";
import { PersistentVolumeClaim, Pod } from "@/k8slens/kube-object";
import { getKubeObjectInfo } from "@/utils/kube-object-info";
import { KubeObjectAge } from "../common/object/kube-object-age";

const columnNames = ["Name", "Storage Class", "Size", "Pods", "Age", "Status"];

export const PVCOverviewTable = ({
  pvcs,
  pods,
}: {
  pvcs: Array<PersistentVolumeClaim>;
  pods: Array<Pod>;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detail, SetDetail] = useState<PVCDetail>();

  const details: Array<PVCDetail> = pvcs.map((pvc) => {
    const { storageClassName, accessModes } = pvc.spec;
    const podsNames = pvc.getPods(pods).map((pod) => pod.getName());
    return {
      PVCInfo: {
        ...getKubeObjectInfo(pvc),
        accessModes,
        storageClassName,
        storage: pvc.getStorage(),
        podsNames,
        status: pvc.getStatus(),
      },
      PVCSelectorInfo: {
        matchLabels: pvc.getMatchLabels(),
        matchExpressions: pvc.getMatchExpressions(),
      },
    };
  });

  const rows: Array<Row> = details.map(({ PVCInfo }, idx) => ({
    idx,
    tds: [
      PVCInfo.name,
      PVCInfo.storageClassName,
      PVCInfo.storage,
      PVCInfo.podsNames.map((name) => (
        <Box as="span" color="blue.300" key={name}>
          {name}
        </Box>
      )),
      <KubeObjectAge creationTimestamp={PVCInfo.creationTimestamp} />,
      PVCInfo.status,
    ],
    onClickRow: (idx) => {
      SetDetail(details[idx as number]);
      onOpen();
    },
  }));

  return (
    <>
      <KubeTable columnNames={columnNames} rows={rows} />
      {detail && (
        <PVCDetailDrawer detail={detail} isOpen={isOpen} onClose={onClose} />
      )}
    </>
  );
};
