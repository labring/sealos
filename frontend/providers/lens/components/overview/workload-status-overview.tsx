import { Box, Flex } from "@chakra-ui/react";
import { WorkloadStatus, PieChartStatusData } from "./workload-status-chart";

export type WorkloadTitle =
  | "Pods"
  | "Deployments"
  | "Daemon Sets"
  | "Stateful Sets"
  | "Replica Sets"
  | "Jobs"
  | "Cron Jobs";

export type WorkloadStatusOverviewData = {
  title: WorkloadTitle;
  data: Array<PieChartStatusData>;
  onClickTitle?: () => void;
};

export const WorkloadStatusOverview = ({
  data,
}: {
  data: Array<WorkloadStatusOverviewData>;
}) => {
  return (
    <Flex
      flexFlow="row wrap"
      align={"center"}
      justify="space-around"
      border="1px"
      borderColor="gray.200"
    >
      {data.map((item) => (
        <Box key={item.title} flex="1" maxW="150px">
          <WorkloadStatus {...item} />
        </Box>
      ))}
    </Flex>
  );
};
