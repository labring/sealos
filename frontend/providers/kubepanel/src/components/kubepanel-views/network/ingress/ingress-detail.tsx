import { updateResource } from '@/api/kubernetes';
import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Ingress, IngressRule } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import { useIngressStore } from '@/store/kube';
import { dumpKubeObject } from '@/utils/yaml';
import { SaveOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useEffect, useState } from 'react';
import IngressPathEditor from './ingress-path-editor';

const IngressDetail = ({ obj: ingress, open, onClose }: DetailDrawerProps<Ingress>) => {
  if (!ingress || !(ingress instanceof Ingress)) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [draftRules, setDraftRules] = useState<IngressRule[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { items, initialize } = useIngressStore();
  const [msgApi, contextHolder] = message.useMessage();
  const msgKey = 'ingressEditMsg';

  const latest = items.find((it) => it.getId() === ingress.getId()) ?? ingress;

  // Reset editing state when drawer opens/closes or ingress changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setDraftRules([]);
    }
  }, [open]);

  const id = ingress?.getId();
  useEffect(() => {
    setIsEditing(false);
    setDraftRules([]);
  }, [id]);

  const handleSave = async () => {
    try {
      setSubmitting(true);

      const updated: Partial<Ingress> = {
        ...latest,
        spec: {
          ...latest.spec,
          rules: draftRules
        }
      };

      msgApi.loading({ content: 'Updating Ingress...', key: msgKey }, 0);
      const yaml = dumpKubeObject(updated);
      const res = await updateResource(latest.kind, latest.getName(), yaml);
      msgApi.success({
        content: `Updated ${res.data.kind} ${res.data.metadata.name}`,
        key: msgKey
      });

      // Refresh the store to ensure the detail view shows the latest rules immediately
      await initialize(() => {}, true);
      setIsEditing(false);
    } catch (err: any) {
      const resp = buildErrorResponse(err);
      msgApi.error({
        content: `Update failed: ${resp.error.message}`,
        key: msgKey
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <>
      {contextHolder}
      <Drawer open={open} title={`Ingress: ${latest.getName()}`} onClose={onClose}>
        <DrawerPanel>
          <KubeObjectInfoList obj={latest} />

          <div
            className="flex items-center justify-between mt-8 mb-4"
            style={{ minHeight: '32px' }}
          >
            <span className="text-[#262626] font-medium text-base">Rules</span>
            {!isEditing ? (
              <Button type="link" onClick={() => setIsEditing(true)} className="p-0! h-auto">
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button onClick={handleCancel} size="small" type="default">
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={handleSave}
                  icon={<SaveOutlined />}
                  size="small"
                  loading={submitting}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          <IngressPathEditor
            ingress={latest}
            isEditing={isEditing}
            onChange={(rules) => setDraftRules(rules)}
          />
        </DrawerPanel>
      </Drawer>
    </>
  );
};

export default IngressDetail;
