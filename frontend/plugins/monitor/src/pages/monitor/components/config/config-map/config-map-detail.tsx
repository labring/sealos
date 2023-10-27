import { ConfigMap } from '@/k8slens/kube-object';
import Drawer from '../../drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import DrawerTitle from '../../drawer/drawer-title';
import { entries } from 'lodash';
import { Input } from 'antd';

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
      <KubeObjectInfoList obj={configMap} />
      <div className="m-8" />
      {data.length > 0 && (
        <>
          <DrawerTitle>Data</DrawerTitle>
          {data.map(([name, value = '']) => (
            <div key={name} className="mb-2">
              <div className="text-zinc-300 font-bold pb-0.5">{name}</div>
              <Input.TextArea classNames={{textarea: 'font-mono'}} wrap="off" rows={6} disabled value={value} />
            </div>
          ))}
        </>
      )}
    </Drawer>
  );
};

export default ConfigMapDetail;
