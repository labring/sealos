import { Affinity } from "@/k8slens/kube-object";
import { Textarea } from "@chakra-ui/react";
import yaml from "js-yaml";

export type KubeObjectAffinitiesProps = {
  affinitiesNum: number;
  affinities?: Affinity;
};

export const KubeObjectAffinities = ({
  affinitiesNum,
  affinities,
}: KubeObjectAffinitiesProps) => {
  if (affinitiesNum <= 0) return null;

  return <Textarea readOnly value={yaml.dump(affinities)} />;
};
