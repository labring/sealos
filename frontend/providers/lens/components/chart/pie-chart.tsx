import { Pie } from "@ant-design/plots";
import { Datum } from "@ant-design/charts";
import { sum } from "lodash";

export type PieChartData = {
  type: string;
  value: number;
};

export type PieChartProps = {
  title: string;
  data: Array<PieChartData>;
  color: (type: string) => string;
};

export const PieChart = ({ props }: { props: PieChartProps }) => {
  const config = {
    data: props.data,
    angleField: "value",
    colorField: "type",
    color: (datum: Datum) => props.color(datum["type"]),
    radius: 1,
    innerRadius: 0.88,
    statistic: {
      title: {
        content: props.title,
        style: {
          fontSize: "14px",
          whiteSpace: "pre-wrap",
          overflow: "visible",
        },
      },
      content: {
        content: `${sum(props.data.map((d) => d.value))}`,
        style: {
          fontSize: "14px",
          fontWeight: "bold",
        },
      },
    },
    label: {
      type: "inner",
    },
    legend: {
      layout: "horizontal" as "horizontal",
      position: "bottom" as "bottom",
    },
  };
  return <Pie {...config} animation={false} />;
};
