import { LabelMatchExpression } from "@/k8slens/kube-object";
import { KubeObjectInfo } from "@/utils/kube-object-info";
import { KubeRecord } from "../common/kube-record";
import { Box } from "@chakra-ui/react";
import { KubeBadge } from "../common/kube-badge";
import React from "react";

export type PVCInfo = KubeObjectInfo & {
  accessModes?: Array<string>;
  storageClassName?: string;
  storage: string;
  podsNames: Array<string>;
  status: string;
};

export type PVCSelectorInfo = {
  matchLabels: Array<string>;
  matchExpressions: Array<LabelMatchExpression>;
};

export const PVCInfoList = ({ info }: { info: PVCInfo }) => {
  const { storageClassName, storage, podsNames, status } = info;

  return (
    <>
      <KubeRecord name="Access Modes" value={info.accessModes?.join(", ")} />
      <KubeRecord name="Storage Class Name" value={storageClassName} />
      <KubeRecord name="Storage" value={storage} />
      <KubeRecord
        name="Pods Names"
        value={podsNames.map((name) => (
          <Box as="span" color="blue.300" key={name}>
            {name}
          </Box>
        ))}
      />
      <KubeRecord name="Status" value={status} />
    </>
  );
};

export const PVCSelectorInfoList = ({ info }: { info: PVCSelectorInfo }) => {
  const { matchLabels, matchExpressions } = info;

  return (
    <>
      <Box textAlign={"center"} fontWeight={"bold"} mb="16px">
        Selectors
      </Box>
      <KubeRecord
        name="Match Labels"
        value={matchLabels.map((label) => (
          <KubeBadge key={label} label={label} />
        ))}
      />
      <KubeRecord
        name="Match Expressions"
        value={matchExpressions.map(({ key, operator, values }, idx) => (
          <React.Fragment key={idx}>
            <Box textColor={"#51575d"} textAlign={"center"}>
              {`Key: ${key}`}
            </Box>
            <KubeRecord name="Operator" value={operator} />
            <KubeRecord name="Values" value={values} />
          </React.Fragment>
        ))}
      />
    </>
  );
};
