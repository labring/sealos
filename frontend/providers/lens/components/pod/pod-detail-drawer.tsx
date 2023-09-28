import { PodInfo, PodInfoList } from "./pod-info-list";
import { ContainerInfo, ContainerInfoList } from "./container-info-list";
import { KubeDrawer } from "../common/kube-drawer";
import { KubeObjectInfoList } from "../common/object/detail/kube-object-detail-info-list";
import { KubeObjectDetailTolerations } from "../common/object/detail/kube-object-detail-tolerations";
import { KubeObjectDetailAffinities } from "../common/object/detail/kube-object-detail-affinities";

export type PodDetail = {
  podInfo: PodInfo;
  containerInfos: Array<ContainerInfo>;
};

export type PodDetailDrawerProps = {
  detail: PodDetail;
  isOpen: boolean;
  onClose: () => void;
};

export const PodDetailDrawer = ({
  detail,
  isOpen,
  onClose,
}: PodDetailDrawerProps) => {
  const { podInfo, containerInfos } = detail;
  return (
    <KubeDrawer props={{ isOpen, onClose, header: podInfo.name }}>
      <KubeObjectInfoList info={podInfo} />
      <PodInfoList info={podInfo} />

      <KubeObjectDetailTolerations tolerations={podInfo.tolerations} />
      <KubeObjectDetailAffinities
        affinities={podInfo.affinities}
        affinitiesNum={podInfo.affinitiesNum}
      />
      {/* TODO: Secrets */}
      <ContainerInfoList info={containerInfos} />
      {/* TODO: Volumes */}
    </KubeDrawer>
  );
};
