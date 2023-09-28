"use client";
import { useDisclosure } from "@chakra-ui/react";
import {
  ConfigMapDetail,
  ConfigMapDetailDrawer,
} from "./configmap-detail-drawer";
import { useState } from "react";
import { KubeTable, Row } from "../common/kube-table";
import { ConfigMap } from "@/k8slens/kube-object";
import { getKubeObjectInfo } from "@/utils/kube-object-info";
import { KubeObjectAge } from "../common/object/kube-object-age";

const columnNames = ["Name", "Keys", "Age"];

export const ConfigMapOverviewTable = ({
  configMaps,
}: {
  configMaps: Array<ConfigMap>;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detail, SetDetail] = useState<ConfigMapDetail>();

  const details: Array<ConfigMapDetail> = configMaps.map((configMap) => ({
    configMapInfo: {
      ...getKubeObjectInfo(configMap),
      data: configMap.data,
      keys: configMap.getKeys(),
    },
  }));

  const rows: Array<Row> = details.map(({ configMapInfo }, idx) => ({
    idx,
    tds: [
      configMapInfo.name,
      configMapInfo.keys.join(", "),
      <KubeObjectAge creationTimestamp={configMapInfo.creationTimestamp} />,
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
        <ConfigMapDetailDrawer
          isOpen={isOpen}
          onClose={onClose}
          detail={detail}
        />
      )}
    </>
  );
};
