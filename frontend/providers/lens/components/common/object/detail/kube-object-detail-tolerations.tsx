import { KubeAccordion } from "../../kube-accordion";
import { KubeRecord } from "../../kube-record";
import {
  KubeObjectTolerations,
  KubeObjectTolerationsProps,
} from "../kube-object-tolerations";

export const KubeObjectDetailTolerations = ({
  tolerations,
}: KubeObjectTolerationsProps) => {
  if (tolerations.length === 0) return null;

  <KubeAccordion
    items={[
      {
        key: "tolerations",
        title: <KubeRecord name="Tolerations" value={tolerations.length} />,
        content: <KubeObjectTolerations tolerations={tolerations} />,
      },
    ]}
  />;
};
