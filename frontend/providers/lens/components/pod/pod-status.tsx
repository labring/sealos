import { getStatusColor } from "@/utils/status-color";
import { Box } from "@chakra-ui/react";

export const PodStatus = ({ status }: { status: string }) => {
  const color = getStatusColor(status) ?? "color.vague";
  return (
    <Box as="span" color={color}>
      {status}
    </Box>
  );
};
