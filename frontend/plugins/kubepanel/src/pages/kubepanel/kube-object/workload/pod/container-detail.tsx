import { Container, Pod } from '@/k8slens/kube-object';
import ContainerStatusBrick from './container-status-brick';
import { keys } from 'lodash';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import ContainerStatus, { ContainerLastState } from './container-status';
import { KubeBadge } from '@/components/kube/kube-badge';
import { Tooltip } from 'antd';
import { isDefined } from '@/k8slens/utilities';
import React from 'react';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';

interface Props {
  pod?: Pod;
}

const ContainerDetail = ({ pod }: Props) => {
  if (!pod) return null;
  const initContainers = pod.getInitContainers();
  const containers = pod.getContainers();

  return (
    <DrawerPanel title="Containers">
      {initContainers.map((container) => (
        <ContainerInfo key={container.name} pod={pod} container={container} isInitial={true} />
      ))}
      {containers.map((container) => (
        <ContainerInfo key={container.name} pod={pod} container={container} isInitial={false} />
      ))}
    </DrawerPanel>
  );
};

const ContainerInfo = ({
  container,
  pod,
  isInitial
}: {
  container: Container;
  pod: Pod;
  isInitial: boolean;
}) => {
  if (!pod || !container) return null;
  const { name, image, imagePullPolicy, ports, volumeMounts, command, args } = container;
  const status = pod.getContainerStatuses().find((status) => status.name === container.name);
  const state = status ? keys(status?.state ?? {})[0] : '';
  const lastState = status ? keys(status?.lastState ?? {})[0] : '';
  const ready = status ? status.ready : '';
  const imageId = status ? status.imageID : '';
  const liveness = pod.getLivenessProbe(container);
  const readiness = pod.getReadinessProbe(container);
  const startup = pod.getStartupProbe(container);

  return (
    <>
      <div>
        <ContainerStatusBrick state={state} status={status} />
        {name}
        {isInitial ? ' (initial)' : ''}
      </div>
      {status && (
        <DrawerItem name="Status" value={<ContainerStatus state={state} status={status} />} />
      )}
      {lastState && (
        <DrawerItem
          name="Last Status"
          value={<ContainerLastState lastState={lastState} status={status} />}
        />
      )}
      <DrawerItem
        name="Image"
        value={
          <Tooltip title={imageId}>
            <span>
              <KubeBadge label={image} />
            </span>
          </Tooltip>
        }
      />
      {imagePullPolicy && imagePullPolicy !== 'IfNotPresent' && (
        <DrawerItem name="ImagePullPolicy" value={imagePullPolicy} />
      )}
      {ports && ports.length > 0 && (
        <DrawerItem
          name="Ports"
          value={ports.filter(isDefined).map((port) => {
            const { name, containerPort, protocol } = port;
            const text = `${name ? `${name}: ` : ''}${containerPort}/${protocol}`;
            return (
              <div key={`${container.name}-port-${port.containerPort}-${port.protocol}`}>
                {text}
              </div>
            );
          })}
        />
      )}
      {volumeMounts && volumeMounts.length > 0 && (
        <DrawerItem
          name="Mounts"
          value={volumeMounts.map((mount) => {
            const { name, mountPath, readOnly } = mount;

            return (
              <React.Fragment key={name + mountPath}>
                <span className="mount-path">{mountPath}</span>
                <span className="mount-from">{`from ${name} (${readOnly ? 'ro' : 'rw'})`}</span>
              </React.Fragment>
            );
          })}
        />
      )}
      {liveness.length > 0 && (
        <DrawerItem
          name="Liveness"
          value={liveness.map((value, index) => (
            <KubeBadge key={index} label={value} />
          ))}
        />
      )}
      {readiness.length > 0 && (
        <DrawerItem
          name="Readiness"
          value={readiness.map((value, index) => (
            <KubeBadge key={index} label={value} />
          ))}
        />
      )}
      {startup.length > 0 && (
        <DrawerItem
          name="Startup"
          value={startup.map((value, index) => (
            <KubeBadge key={index} label={value} />
          ))}
        />
      )}
      {command && <DrawerItem name="Command" value={command.join(' ')} />}
      {args && <DrawerItem name="Arguments" value={args.join(' ')} />}
    </>
  );
};

export default ContainerDetail;
