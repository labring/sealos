import { PodContainerStatus } from "@/k8slens/kube-object";
import { getStatusColor } from "@/utils/status-color";
import { Box } from "@chakra-ui/react";
import { lowerCase } from "lodash";

type ContainerStatusBrickProps = {
  state: string;
  status: PodContainerStatus | null | undefined;
};

export const ContainerStatusBrick = ({
  state,
  status,
}: ContainerStatusBrickProps) => {
  const { ready = false } = status ?? {};
  let color: string;
  if (!ready && lowerCase(state) === "running") color = "color.warning";
  else color = getStatusColor(state) ?? "color.terminated";

  return (
    <Box
      display={"inline-block"}
      w="8px"
      h="8px"
      mr="8px"
      borderRadius="2px"
      bgColor={color}
      _last={{ mr: 0 }}
    />
  );
};
