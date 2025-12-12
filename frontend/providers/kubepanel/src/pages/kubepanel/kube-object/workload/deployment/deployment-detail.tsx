import { KubeBadge } from '@/components/kube/kube-badge';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Deployment } from '@/k8slens/kube-object';
import { getConditionTextTone } from '@/utils/condtion-color';
import { Tooltip, Typography } from 'antd';
import { useDeploymentStore } from '@/store/kube';
import PodDetailTolerations from '../pod/pod-detail-tolerations';
import PodDetailAffinities from '../pod/pod-detail-affinities';
import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import ContainerDetail from '../pod/container-detail';

const DeploymentDetail = ({ obj: dep, open, onClose }: DetailDrawerProps<Deployment>) => {
  if (!dep || !(dep instanceof Deployment)) {
    return null;
  }

  const { status, spec } = dep;
  const selectors = dep.getSelectors();
  const conditions = dep.getConditions();
  const { initialize } = useDeploymentStore();

  return (
    <Drawer open={open} title={`Deployment: ${dep.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={dep} />
        <DrawerItem
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
          <DrawerItem
            name={<div className="pt-1">Selector</div>}
            value={
              <div className="flex flex-wrap gap-1">
                {selectors.map((label) => (
                  <KubeBadge key={label} label={label} className="m-0!" />
                ))}
              </div>
            }
          />
        )}
        <DrawerItem name="Strategy Type" value={spec.strategy.type} />
        <DrawerItem
          name="Conditions"
          value={
            <div className="flex flex-wrap gap-1">
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
                  <Typography.Text className="mr-0" type={getConditionTextTone(type)}>
                    {type}
                  </Typography.Text>
                </Tooltip>
              ))}
            </div>
          }
        />
        <PodDetailTolerations workload={dep} />
        <PodDetailAffinities workload={dep} />

        <ContainerDetail
          containers={spec.template.spec.containers}
          initContainers={spec.template.spec.initContainers}
          workload={dep}
          onUpdate={() => initialize(() => {}, true)}
        />
      </DrawerPanel>
    </Drawer>
  );
};

export default DeploymentDetail;
