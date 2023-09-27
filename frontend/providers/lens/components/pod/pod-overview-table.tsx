"use client";
import { Box, Tooltip, useDisclosure } from "@chakra-ui/react";
import { KubeTable, Row } from "../common/kube-table";
import { PodDetail, PodDetailDrawer } from "./pod-detail-drawer";
import { ContainerStatusBrick } from "./container-status-brick";
import { Container, Pod, PodContainerStatus } from "@/k8slens/kube-object";
import { entries, startCase } from "lodash";
import React, { useState } from "react";
import { KubeRecord } from "../common/kube-record";
import { ContainerStatus } from "./container-status-common";
import { PodStatus } from "./pod-status";
import { PodInfo } from "./pod-info-list";
import { getKubeObjectInfo } from "@/utils/kube-object-info";
import { ContainerInfo } from "./container-info-list";
import { KubeObjectAge } from "../common/object/kube-object-age";

const getContainerInfo = (
  pod: Pod,
  containers: Container[],
  isInitContainer: boolean = false
) => {
  return containers.map((container) => {
    const { name, image, imagePullPolicy, ports, volumeMounts, command, args } =
      container;
    const status = pod
      .getContainerStatuses()
      .find((status) => status.name === container.name);
    const state = status ? Object.keys(status?.state ?? {})[0] : "";
    const lastState = status ? Object.keys(status?.lastState ?? {})[0] : "";
    const imageId = status ? status.imageID : "";
    const liveness = pod.getLivenessProbe(container);
    const readiness = pod.getReadinessProbe(container);
    const startup = pod.getStartupProbe(container);
    return {
      name,
      isInitial: isInitContainer,
      state,
      lastState,
      podContainerStatus: status,
      image,
      imageId,
      imagePullPolicy,
      ports,
      volumeMounts,
      liveness,
      readiness,
      startup,
      command,
      arguments: args,
    };
  });
};

const columnNames = [
  "Name",
  "Containers",
  "Restarts",
  "Controlled By",
  "QoS",
  "Age",
  "Status",
];

export const PodOverviewTable = ({ pods }: { pods: Array<Pod> }) => {
  const [detail, SetDetail] = useState<PodDetail>();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const podDetails = pods.map((pod) => {
    const podInfo: PodInfo = {
      ...getKubeObjectInfo(pod),
      restarts: pod.getRestartsCount(),
      podStatus: pod.getStatusMessage(),
      podIP: pod.status?.podIP,
      podIPs: pod.getIPs(),
      serviceAccount: pod.getServiceAccountName(),
      priorityClass: pod.getPriorityClassName(),
      qosClass: pod.getQosClass(),
      runtimeClass: pod.getRuntimeClassName(),
      conditions: pod.getConditions(),
      tolerations: pod.getTolerations(),
      affinitiesNum: pod.getAffinityNumber(),
      affinities: pod.getAffinity(),
    };

    const initContainers = pod.getInitContainers();
    const containers = pod.getContainers();
    const containerInfos: Array<ContainerInfo> = [];
    containerInfos.push(...getContainerInfo(pod, initContainers, true));
    containerInfos.push(...getContainerInfo(pod, containers));
    return { podInfo, containerInfos };
  });

  const rows: Array<Row> = podDetails.map(
    ({ podInfo, containerInfos }, index) => ({
      idx: index,
      tds: [
        podInfo.name,
        containerInfos.map(({ name, state, podContainerStatus }) => {
          const label = renderTooltipLabel(name, state, podContainerStatus);
          return (
            <Tooltip label={label} hasArrow placement="auto-start">
              <Box as="span">
                <ContainerStatusBrick
                  state={state}
                  status={podContainerStatus}
                />
              </Box>
            </Tooltip>
          );
        }),
        podInfo.restarts,
        podInfo.ownerRefs.map(({ name, kind }) => (
          <Tooltip label={name} hasArrow placement="auto-start">
            {kind}
          </Tooltip>
        )),
        podInfo.qosClass,
        <KubeObjectAge creationTimestamp={podInfo.creationTimestamp} />,
        <PodStatus status={podInfo.podStatus} />,
      ],
      onClickRow(idx) {
        SetDetail(podDetails[idx as number]);
        onOpen();
      },
    })
  );

  return (
    <>
      <KubeTable columnNames={columnNames} rows={rows} />
      {detail && (
        <PodDetailDrawer isOpen={isOpen} onClose={onClose} detail={detail} />
      )}
    </>
  );
};

const legalKeys = ["running", "terminated", "waiting"] as const;
const renderTooltipLabel = (
  name: string,
  stateKey: string,
  status: PodContainerStatus | undefined | null
) => {
  const { ready = false, state } = status ?? {};
  if (!state) return null;

  const key = stateKey as keyof typeof state;
  if (!legalKeys.includes(key)) return null;

  return (
    <>
      <Box>
        {name} {<ContainerStatus state={key} status={status} />}
      </Box>
      {entries(state[key]).map(([name, value]) => (
        <KubeRecord
          color={{ nameColor: "white", valueColor: "white" }}
          key={name}
          name={startCase(name)}
          value={value}
        />
      ))}
    </>
  );
};
