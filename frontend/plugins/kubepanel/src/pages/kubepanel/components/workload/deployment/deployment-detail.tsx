import { KubeBadge } from '@/components/kube/kube-badge';
import { KubeRecord } from '@/components/kube/kube-record';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Deployment } from '@/k8slens/kube-object';
import { getConditionColor } from '@/utils/condtion-color';
import { Tooltip } from 'antd';
import PodDetailTolerations from '../pod/pod-detail-tolerations';
import PodDetailAffinities from '../pod/pod-detail-affinities';
import Drawer from '../../drawer/drawer';
import DrawerPanel from '../../drawer/drawer-panel';

interface Props {
  dep?: Deployment;
  open: boolean;
  onClose: () => void;
}

const DeploymentDetail = ({ dep, open, onClose }: Props) => {
  if (!dep) {
    return null;
  }

  if (!(dep instanceof Deployment)) {
    // logger.error("[DeploymentDetails]: passed object that is not an instanceof Deployment", deployment);

    return null;
  }

  const { status, spec } = dep;
  const selectors = dep.getSelectors();
  const conditions = dep.getConditions();

  return (
    <Drawer open={open} title={`Deployment: ${dep.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={dep} />
        <KubeRecord
          name="Replicas"
          value={
            <>
              {`${spec.replicas} desired, ${status?.updatedReplicas ?? 0} updated, `}
              {`${status?.replicas ?? 0} total, ${status?.availableReplicas ?? 0} available, `}
              {`${status?.unavailableReplicas ?? 0} unavailable`}
            </>
          }
        />
        {selectors.length > 0 && (
          <KubeRecord
            name="Selector"
            value={selectors.map((label) => (
              <KubeBadge key={label} label={label} />
            ))}
          />
        )}
        <KubeRecord name="Strategy Type" value={spec.strategy.type} />
        <KubeRecord
          name="Conditions"
          value={
            <>
              {conditions.map(({ type, message, lastTransitionTime }) => (
                <Tooltip
                  key={type}
                  title={
                    <>
                      <p>{message}</p>
                      <br />
                      <p>Last transition time: {lastTransitionTime ?? '<unknown>'}</p>
                    </>
                  }
                >
                  <span>
                    <KubeBadge
                      color={{
                        textColor: 'white',
                        backgroundColor: getConditionColor(type)
                      }}
                      label={type}
                    />
                  </span>
                </Tooltip>
              ))}
            </>
          }
        />
        <PodDetailTolerations workload={dep} />
        <PodDetailAffinities workload={dep} />

        {/* TODO: DeploymentReplicaSets */}
        {/* TODO: PodDetailList */}
      </DrawerPanel>
    </Drawer>
  );
};

export default DeploymentDetail;
