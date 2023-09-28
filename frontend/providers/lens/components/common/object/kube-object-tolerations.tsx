import { Toleration } from "@/k8slens/kube-object";
import { KubeTable, Row } from "@/components/common/kube-table";

const columnNames = ["Key", "Operator", "Value", "Effect", "Seconds"];

export type KubeObjectTolerationsProps = {
  tolerations: Array<Toleration>;
};

export const KubeObjectTolerations = ({
  tolerations,
}: KubeObjectTolerationsProps) => {
  if (tolerations.length === 0) return null;

  const rows: Array<Row> = tolerations.map(
    ({ key, operator, value, effect, tolerationSeconds }, idx) => ({
      idx,
      tds: [key, operator, value, effect, tolerationSeconds],
    })
  );
  return <KubeTable columnNames={columnNames} rows={rows} />;
};
