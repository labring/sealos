import { ConfigMap } from '@/k8slens/kube-object';
import { useConfigMapStore } from '@/store/kube';
import { Drawer } from '@/components/common/drawer/drawer';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { entries, isEqual } from 'lodash';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import React from 'react';
import { Button, Input } from 'antd';
import { dumpKubeObject } from '@/utils/yaml';
import { updateResource } from '@/api/kubernetes';
import useMessage from 'antd/lib/message/useMessage';
import { SaveOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';

const ConfigMapDetail = ({ obj: configMap, open, onClose }: DetailDrawerProps<ConfigMap>) => {
  if (!configMap || !(configMap instanceof ConfigMap)) {
    return null;
  }

  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [msgApi, contextHolder] = useMessage();
  const { initialize } = useConfigMapStore();

  const originalData = React.useMemo(() => {
    const map: Record<string, string> = {};
    entries(configMap.data).forEach(([key, val]) => {
      map[key] = val ?? '';
    });
    return map;
  }, [configMap.data]);

  const [formValues, setFormValues] = React.useState<Record<string, string>>(originalData);

  React.useEffect(() => {
    setFormValues(originalData);
  }, [originalData]);

  // Reset editing state when drawer closes or ConfigMap changes
  React.useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  React.useEffect(() => {
    setIsEditing(false);
  }, [configMap?.getId()]);

  const data = Array.from(entries(formValues));
  const simpleData = data.filter(([_, val]) => !val?.includes('\n') && (val?.length || 0) < 50);
  const complexData = data.filter(([_, val]) => val?.includes('\n') || (val?.length || 0) >= 50);

  const isModified = !isEqual(originalData, formValues);

  const handleSave = () => {
    setIsSaving(true);
    updateResource(
      configMap.kind,
      configMap.getName(),
      dumpKubeObject<ConfigMap>({
        ...configMap,
        data: formValues
      })
    )
      .then(() => {
        msgApi.success('Saved');
        initialize(() => {}, true);
        setIsEditing(false);
      })
      .catch((err) => {
        msgApi.error(err?.message || 'Save failed');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <Drawer open={open} title={`ConfigMap: ${configMap.getName()}`} onClose={onClose}>
      <div className="flex flex-col">
        <DrawerPanel>
          <KubeObjectInfoList obj={configMap} />
        </DrawerPanel>

        {data.length > 0 && <div className="h-px bg-[#E8E8E8] my-6" />}

        {data.length > 0 && (
          <div className="flex flex-col gap-6 pb-6">
            {contextHolder}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">Data</div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setIsEditing(true)}
                    className="px-0"
                  >
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => {
                        setIsEditing(false);
                        setFormValues(originalData);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SaveOutlined />}
                      loading={isSaving}
                      onClick={handleSave}
                      disabled={!isModified}
                    >
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            {simpleData.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-gray-500">Entries</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F9F9FA] p-4 rounded-lg border border-[#E8E8E8]">
                  {simpleData.map(([name, value]) => {
                    const isLong = name.length >= 30 || (value?.length || 0) >= 30;
                    return (
                      <div
                        key={name}
                        className={`flex flex-col gap-0.5 ${isLong ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}
                      >
                        <span className="text-[#64748B] text-xs font-medium">{name}</span>
                        {isEditing ? (
                          <Input
                            className="font-mono text-sm bg-white"
                            value={value}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [name]: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="text-[#262626] text-sm break-all font-mono select-text">
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {complexData.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-gray-500">Files</div>
                <div className="flex flex-col gap-4">
                  {complexData.map(([name, value = '']) => (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="text-[#262626] font-medium text-sm select-text">{name}</div>
                      {isEditing ? (
                        <Input.TextArea
                          autoSize={{ minRows: 4, maxRows: 16 }}
                          className="bg-white border-[#E8E8E8] rounded-md text-sm font-mono"
                          value={value}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [name]: e.target.value }))
                          }
                        />
                      ) : (
                        <pre className="bg-[#F4F4F5] p-3 rounded-md text-sm font-mono overflow-auto max-h-[300px] whitespace-pre-wrap break-all text-[#262626] border border-[#E8E8E8] m-0">
                          {value}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default ConfigMapDetail;
