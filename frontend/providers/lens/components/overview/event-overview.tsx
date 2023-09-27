import { KubeTable, Row } from "@/components/common/kube-table";
import { ReactiveDuration } from "@/components/duration/reactive-duration";
import { EventData } from "@/k8s/store/event.store";
import { KubeObjectAge } from "../common/object/kube-object-age";

const columnNames = [
  "Type",
  "Message",
  "Involved Object",
  "Count",
  "Source",
  "Age",
  "Last Seen",
];

export const EventOverviewTable = ({ data }: { data: Array<EventData> }) => {
  const rows: Array<Row> = [];
  data.forEach((v, idx) => {
    rows.push({
      idx: idx,
      tds: [
        v.type,
        v.message,
        v.involvedObject,
        v.count,
        v.source,
        <KubeObjectAge key="age" creationTimestamp={v.creationTimestamp} />,
        <ReactiveDuration key="last-seen" timestamp={v.lastTimestamp} />,
      ],
    });
  });

  return <KubeTable columnNames={columnNames} rows={rows} />;
};
