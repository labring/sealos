import { Secret } from '@/k8slens/kube-object';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Drawer } from '@/components/common/drawer/drawer';
import React from 'react';
import { Button, Input, Space } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { entries } from 'lodash';
import { dumpKubeObject } from '@/utils/yaml';
import useMessage from 'antd/lib/message/useMessage';
import { updateResource } from '@/api/kubernetes';
import { buildErrorResponse } from '@/services/backend/response';

type RevealableInput = {
  name: string;
  initValue: string;
  onChange?: (value: string) => void;
};

const SecretDataInput = ({ name, initValue, onChange }: RevealableInput) => {
  const [revealed, setRevealed] = React.useState(false);
  const [value, setValue] = React.useState(initValue);
  return (
    <div>
      <div className="mb-1">{name}</div>
      <Space>
        <Input.TextArea
          disabled={!revealed}
          autoSize={{ maxRows: 20 }}
          styles={{
            textarea: {
              fontFamily: 'monospace',
              lineHeight: 1.2,
              width: '478px'
            }
          }}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e.target.value);
          }}
          value={revealed ? value : ''}
        />
        <Button
          icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          type="text"
          onClick={() => setRevealed(!revealed)}
        />
      </Space>
    </div>
  );
};

const SecretDataForm = ({ secret }: { secret: Secret }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [msgApi, contextHolder] = useMessage();
  const dataMap = React.useRef<Partial<Record<string, string>>>(secret.data).current;

  return (
    <>
      {contextHolder}
      {entries(secret.data).map(([name, value]) => (
        <SecretDataInput
          key={name}
          name={name}
          initValue={Buffer.from(value || '', 'base64').toString()}
          onChange={(value) => {
            dataMap[name] = Buffer.from(value, 'ascii').toString('base64');
          }}
        />
      ))}
      <Button
        style={{ width: 'max-content' }}
        loading={isSaving}
        onClick={() => {
          setIsSaving(true);
          updateResource(
            secret.kind,
            secret.getName(),
            dumpKubeObject<Secret>({
              ...secret,
              data: dataMap
            })
          )
            .then(() => {
              msgApi.success('Saved');
            })
            .catch((err) => {
              const errResp = buildErrorResponse(err);
              msgApi.error(errResp.error.message);
            })
            .finally(() => {
              setIsSaving(false);
            });
        }}
      >
        Save
      </Button>
    </>
  );
};

const SecretDetail = ({ obj: secret, open, onClose }: DetailDrawerProps<Secret>) => {
  if (!secret || !(secret instanceof Secret)) return null;

  return (
    <Drawer open={open} title={`Secret: ${secret.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={secret} />
      </DrawerPanel>
      <DrawerPanel title="Data">
        <SecretDataForm secret={secret} />
      </DrawerPanel>
    </Drawer>
  );
};

export default SecretDetail;
