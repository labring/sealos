import { Secret } from '@/k8slens/kube-object';
import { useSecretStore } from '@/store/kube';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { Drawer } from '@/components/common/drawer/drawer';
import React from 'react';
import { Button, Input, Space } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { entries, isEqual } from 'lodash';
import { dumpKubeObject } from '@/utils/yaml';
import useMessage from 'antd/lib/message/useMessage';
import { updateResource } from '@/api/kubernetes';
import { buildErrorResponse } from '@/services/backend/response';

type RevealableInput = {
  name: string;
  value: string;
  onChange?: (value: string) => void;
};

const SecretDataInput = ({
  name,
  value,
  onChange,
  isComplex,
  revealed
}: RevealableInput & { isComplex?: boolean; revealed: boolean }) => {
  return (
    <div className={`flex flex-col ${isComplex ? 'gap-1' : 'gap-0.5'}`}>
      <span className="text-[#64748B] text-xs font-medium">{name}</span>
      {isComplex ? (
        revealed ? (
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 20 }}
            className="font-mono text-sm bg-[#F4F4F5] border-[#E8E8E8] rounded-md"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        ) : (
          <div className="h-20 bg-[#F4F4F5] border border-[#E8E8E8] rounded-md flex items-center justify-center text-gray-400 text-sm italic select-none">
            Hidden content
          </div>
        )
      ) : revealed ? (
        <Input.Password
          className="font-mono text-sm border-0 bg-transparent px-0 shadow-none"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          visibilityToggle={{ visible: true }}
          iconRender={() => null} // Hide individual toggle
        />
      ) : (
        <Input.Password
          disabled
          className="font-mono text-sm border-0 bg-transparent px-0 shadow-none text-gray-400"
          value="••••••••"
          visibilityToggle={false}
          iconRender={() => null}
        />
      )}
    </div>
  );
};

const SecretDataForm = ({ secret }: { secret: Secret }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [msgApi, contextHolder] = useMessage();
  const { initialize } = useSecretStore();

  // Clean Data Map tracking
  // We need state to track edits to enable/disable button
  // originalData is static reference for comparison.
  const originalData = React.useMemo(() => {
    const map: Record<string, string> = {};
    entries(secret.data).forEach(([key, val]) => {
      map[key] = Buffer.from(val || '', 'base64').toString();
    });
    return map;
  }, [secret.data]);

  const [formValues, setFormValues] = React.useState<Record<string, string>>(originalData);

  // Sync formValues if secret changes externally (though usually drawer remounts)
  React.useEffect(() => {
    setFormValues(originalData);
  }, [originalData]);

  const isModified = !isEqual(originalData, formValues);

  // Process data for hybrid layout based on current form values
  const processedData = React.useMemo(() => {
    return entries(formValues).map(([key, val]) => {
      // Treat as complex (File) if it has newlines or is very long (>100 chars)
      const isComplex = val.includes('\n') || val.length > 100;
      // Treat as long entry (Full width in grid) if distinctively long (>30 chars) or key is long
      const isLong = val.length >= 30 || key.length >= 30;
      return { key, val, isComplex, isLong };
    });
  }, [formValues]);

  const simpleData = processedData.filter((d) => !d.isComplex);
  const complexData = processedData.filter((d) => d.isComplex);

  const handleSave = () => {
    setIsSaving(true);
    // Re-encode values
    const encodedData: Record<string, string> = {};
    entries(formValues).forEach(([key, val]) => {
      encodedData[key] = Buffer.from(val, 'ascii').toString('base64');
    });

    updateResource(
      secret.kind,
      secret.getName(),
      dumpKubeObject<Secret>({
        ...secret,
        data: encodedData
      })
    )
      .then(() => {
        msgApi.success('Saved');
        initialize(() => {}, true);
        // Implicitly originalData will update via parent refresh or we should wait for props update
        // But for UX we just reset saving
      })
      .catch((err) => {
        const errResp = buildErrorResponse(err);
        msgApi.error(errResp.error.message);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <div className="flex flex-col gap-6">
      {contextHolder}

      {/* Global Data Header & Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Data</div>
        <div className="flex items-center gap-2">
          {!isRevealed ? (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setIsRevealed(true)}
              className="px-0"
            >
              Show / Edit
            </Button>
          ) : (
            <>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setFormValues(originalData);
                  setIsRevealed(false);
                }}
              >
                Hide / Cancel
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
            {simpleData.map(({ key, val, isLong }) => (
              <div key={key} className={isLong ? 'col-span-1 md:col-span-2' : 'col-span-1'}>
                <SecretDataInput
                  name={key}
                  // Use formValues implicitly via map
                  value={formValues[key]}
                  revealed={isRevealed}
                  onChange={(newValue) => {
                    setFormValues((prev) => ({ ...prev, [key]: newValue }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {complexData.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-500">Files</div>
          <div className="flex flex-col gap-4">
            {complexData.map(({ key, val }) => (
              <SecretDataInput
                key={key}
                name={key}
                value={formValues[key]}
                isComplex
                revealed={isRevealed}
                onChange={(newValue) => {
                  setFormValues((prev) => ({ ...prev, [key]: newValue }));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inline buttons now moved to header; keep spacer for layout consistency if needed */}
    </div>
  );
};

const SecretDetail = ({ obj: secret, open, onClose }: DetailDrawerProps<Secret>) => {
  if (!secret || !(secret instanceof Secret)) return null;

  const hasData = secret.data && Object.keys(secret.data).length > 0;

  return (
    <Drawer open={open} title={`Secret: ${secret.getName()}`} onClose={onClose}>
      <div className="flex flex-col">
        <DrawerPanel>
          <KubeObjectInfoList obj={secret} />
        </DrawerPanel>

        {hasData && <div className="h-px bg-[#E8E8E8] my-6" />}

        {hasData && (
          <div className="flex flex-col pb-6">
            <SecretDataForm secret={secret} />
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default SecretDetail;
