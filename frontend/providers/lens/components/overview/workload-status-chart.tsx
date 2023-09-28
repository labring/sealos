import { PieChart } from "@/components/chart/pie-chart";

export type PieChartStatusType =
  | "Running"
  | "Scheduled"
  | "Pending"
  | "Suspended"
  | "Evicted"
  | "Failed"
  | "Succeeded"
  | "Terminated"
  | "Terminating"
  | "Unknown"
  | "Empty"
  | "Complete";

export type PieChartStatusData = {
  type: PieChartStatusType;
  value: number;
};

const statusBackgroundColorMapping = {
  Running: "#399c3d",
  Scheduled: "#399c3d",
  Pending: "#ff9800",
  Suspended: "#ff9800",
  Evicted: "#ce3933",
  Succeeded: "#206923",
  Failed: "#ce3933",
  Terminated: "#9dabb5",
  Terminating: "#9dabb5",
  Unknown: "#ededed",
  Empty: "#ededed",
  Complete: "#206923",
} as { [key in PieChartStatusType]: string };

export const WorkloadStatus = ({
  title,
  data,
}: {
  title: string;
  data: Array<PieChartStatusData>;
}) => {
  if (data.length == 0) {
    data = [{ type: "Empty", value: 0 }];
  }

  return (
    <PieChart
      props={{
        title,
        data,
        color: (type) =>
          statusBackgroundColorMapping[type as PieChartStatusType],
      }}
    />
  );
};
