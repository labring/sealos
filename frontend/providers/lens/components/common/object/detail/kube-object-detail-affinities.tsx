import {
  KubeObjectAffinities,
  KubeObjectAffinitiesProps,
} from "../kube-object-affinities";
import { KubeAccordion } from "../../kube-accordion";

export const KubeObjectDetailAffinities = ({
  affinitiesNum,
  affinities,
}: KubeObjectAffinitiesProps) => {
  if (affinitiesNum <= 0) return null;

  return (
    <KubeAccordion
      items={[
        {
          key: "affinities",
          title: "Affinities",
          content: (
            <KubeObjectAffinities
              affinitiesNum={affinitiesNum}
              affinities={affinities}
            />
          ),
        },
      ]}
    />
  );
};
