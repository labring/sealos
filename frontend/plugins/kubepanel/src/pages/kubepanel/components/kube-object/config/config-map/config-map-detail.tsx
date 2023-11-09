import { ConfigMap } from '@/k8slens/kube-object';
import Drawer from '../../../drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { entries } from 'lodash';
import DrawerPanel from '../../../drawer/drawer-panel';
import { Editor } from '@monaco-editor/react';

interface Props {
  configMap?: ConfigMap;
  open: boolean;
  onClose: () => void;
}

const ConfigMapDetail = ({ configMap, open, onClose }: Props) => {
  if (!configMap) {
    return null;
  }

  if (!(configMap instanceof ConfigMap)) {
    // logger.error("[ConfigMapDetail]: passed object that is not an instanceof ConfigMap", configMap);

    return null;
  }

  const data = Array.from(entries(configMap.data));

  return (
    <Drawer open={open} title={`ConfigMap: ${configMap.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={configMap} />
      </DrawerPanel>
      <div className="m-8" />
      {data.length > 0 && (
        <DrawerPanel title="Data">
          {data.map(([name, value = '']) => (
            <div key={name} className="mb-2">
              {name && <div className="text-black font-medium pb-0.5">{name}</div>}
              <Editor
                height={'200px'}
                value={value}
                options={{ readOnly: true, minimap: { enabled: false } }}
              />
            </div>
          ))}
        </DrawerPanel>
      )}
    </Drawer>
  );
};

export default ConfigMapDetail;
