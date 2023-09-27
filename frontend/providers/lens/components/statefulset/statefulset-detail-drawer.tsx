import { KubeDrawer } from "../common/kube-drawer";
import { KubeObjectInfoList } from "../common/object/detail/kube-object-detail-info-list";
import { StatefulSetInfo, StatefulSetInfoList } from "./statefulset-info-list";

export type StatefulSetDetail = {
  statefulSetInfo: StatefulSetInfo;
};

export type StatefulSetDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  detail: StatefulSetDetail;
};

export const StatefulSetDetailDrawer = ({
  isOpen,
  onClose,
  detail,
}: StatefulSetDetailDrawerProps) => {
  return (
    <KubeDrawer
      props={{ isOpen, onClose, header: detail.statefulSetInfo.name }}
    >
      <KubeObjectInfoList info={detail.statefulSetInfo} />
      <StatefulSetInfoList info={detail.statefulSetInfo} />
    </KubeDrawer>
  );
};
