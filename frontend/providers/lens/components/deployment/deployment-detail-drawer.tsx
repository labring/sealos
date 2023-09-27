import { KubeDrawer } from "../common/kube-drawer";
import { KubeObjectInfoList } from "../common/object/detail/kube-object-detail-info-list";
import { DeploymentInfo, DeploymentInfoList } from "./deployment-info-list";

export type DeploymentDetail = {
  deploymentInfo: DeploymentInfo;
};

export type DeploymentDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  detail: DeploymentDetail;
};

export const DeploymentDetailDrawer = ({
  isOpen,
  onClose,
  detail,
}: DeploymentDetailDrawerProps) => {
  return (
    <KubeDrawer props={{ isOpen, onClose, header: detail.deploymentInfo.name }}>
      <KubeObjectInfoList info={detail.deploymentInfo} />
      <DeploymentInfoList info={detail.deploymentInfo} />
    </KubeDrawer>
  );
};
