import {
  PVCInfo,
  PVCInfoList,
  PVCSelectorInfo,
  PVCSelectorInfoList,
} from "./pvc-info-list";
import { KubeDrawer } from "../common/kube-drawer";
import { KubeObjectInfoList } from "../common/object/detail/kube-object-detail-info-list";

export type PVCDetail = {
  PVCInfo: PVCInfo;
  PVCSelectorInfo: PVCSelectorInfo;
};

export type PVCDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  detail: PVCDetail;
};

export const PVCDetailDrawer = ({
  isOpen,
  onClose,
  detail,
}: PVCDetailDrawerProps) => {
  return (
    <KubeDrawer props={{ header: detail.PVCInfo.name, isOpen, onClose }}>
      <KubeObjectInfoList info={detail.PVCInfo} />
      <PVCInfoList info={detail.PVCInfo} />
      <PVCSelectorInfoList info={detail.PVCSelectorInfo} />
    </KubeDrawer>
  );
};
