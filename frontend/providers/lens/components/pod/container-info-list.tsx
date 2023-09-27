import {
  ContainerPort,
  PodContainerStatus,
  VolumeMount,
} from "@/k8slens/kube-object";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Tooltip,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import { KubeRecord } from "../common/kube-record";
import { ContainerLastState, ContainerStatus } from "./container-status-common";
import { KubeBadge } from "../common/kube-badge";
import { isDefined } from "@/k8slens/utilities";
import React from "react";
import { ContainerStatusBrick } from "./container-status-brick";

export type ContainerInfo = {
  name: string;
  isInitial?: boolean;
  state: string;
  lastState: string;
  podContainerStatus: PodContainerStatus | null | undefined;
  image?: string;
  imageId?: string;
  imagePullPolicy?: string;
  ports?: Array<ContainerPort>;
  volumeMounts?: Array<VolumeMount>;
  liveness: Array<string>;
  readiness: Array<string>;
  startup: Array<string>;
  command?: Array<string>;
  arguments?: Array<string>;
};

export const ContainerInfoList = ({ info }: { info: Array<ContainerInfo> }) => {
  return (
    <>
      <Box textAlign={"center"} fontWeight={"bold"} mb="16px">
        Containers
      </Box>
      <Accordion allowMultiple>
        {info.map((item) => (
          <AccordionItem key={item.name}>
            <AccordionButton>
              <Box as="span">
                <ContainerStatusBrick
                  state={item.state}
                  status={item.podContainerStatus}
                />{" "}
                {item.name}
                {item.isInitial ? "(initial)" : null}
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <KubeRecord
                name="Status"
                value={
                  <ContainerStatus
                    state={item.state}
                    status={item.podContainerStatus}
                  />
                }
              />
              <KubeRecord
                hidden={
                  !item.podContainerStatus?.lastState?.terminated &&
                  item.lastState !== "terminated"
                }
                name="Last Status"
                value={
                  <ContainerLastState
                    lastState={item.lastState}
                    status={item.podContainerStatus}
                  />
                }
              />
              <KubeRecord
                name="Image"
                value={
                  <Tooltip label={item.imageId} hasArrow placement="auto-start">
                    <Box as="span">
                      <KubeBadge label={item.image} />
                    </Box>
                  </Tooltip>
                }
              />
              {item.imagePullPolicy &&
                item.imagePullPolicy != "IfNotPresent" && (
                  <KubeRecord
                    name="ImagePullPolicy"
                    value={item.imagePullPolicy}
                  />
                )}
              {item.ports && item.ports.length > 0 && (
                <KubeRecord
                  name="Ports"
                  value={item.ports
                    .filter(isDefined)
                    .map(({ name, containerPort, protocol }) => (
                      <KubeBadge
                        key={`${item.name}-port-${containerPort}-${protocol}`}
                        label={`${
                          name ? `${name}: ` : ""
                        }${containerPort}/${protocol}`}
                      />
                    ))}
                />
              )}
              {item.volumeMounts && item.volumeMounts.length > 0 && (
                <KubeRecord
                  name="Mounts"
                  value={item.volumeMounts.map(
                    ({ name, mountPath, readOnly }) => (
                      <React.Fragment key={name + mountPath}>
                        <Box
                          bgColor="color.vague"
                          borderRadius={"4px"}
                          p=".2em .4em"
                          mt="2px"
                        >
                          {mountPath}
                        </Box>
                        <Box as="span">
                          {`from ${name} (${readOnly ? "ro" : "rw"})`}
                        </Box>
                      </React.Fragment>
                    )
                  )}
                />
              )}
              {item.liveness.length > 0 && (
                <KubeRecord
                  name="Liveness"
                  value={item.liveness.map((value, index) => (
                    <KubeBadge key={index} label={value} />
                  ))}
                />
              )}
              {item.readiness.length > 0 && (
                <KubeRecord
                  name="Readiness"
                  value={item.readiness.map((value, index) => (
                    <KubeBadge key={index} label={value} />
                  ))}
                />
              )}
              {item.startup.length > 0 && (
                <KubeRecord
                  name="Startup"
                  value={item.startup.map((value, index) => (
                    <KubeBadge key={index} label={value} />
                  ))}
                />
              )}
              {item.command && (
                <KubeRecord name="Command" value={item.command.join(" ")} />
              )}
              {item.arguments && (
                <KubeRecord name="Arguments" value={item.arguments.join(" ")} />
              )}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
};
