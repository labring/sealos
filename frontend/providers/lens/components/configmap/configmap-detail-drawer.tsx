import { KubeDrawer } from "../common/kube-drawer";
import { KubeObjectInfoList } from "../common/object/detail/kube-object-detail-info-list";
import { ConfigMapInfo, ConfigMapInfoList } from "./configmap-info-list";

export type ConfigMapDetail = {
  configMapInfo: ConfigMapInfo;
};

export type ConfigMapDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  detail: ConfigMapDetail;
};

export const ConfigMapDetailDrawer = ({
  isOpen,
  onClose,
  detail,
}: ConfigMapDetailDrawerProps) => {
  return (
    <KubeDrawer props={{ isOpen, onClose, header: detail.configMapInfo.name }}>
      <KubeObjectInfoList info={detail.configMapInfo} />
      <ConfigMapInfoList info={detail.configMapInfo} />
    </KubeDrawer>
  );
};
