// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { NetworkSection } from '@/pages/app/edit/components/NetworkSection';
import type { AppEditType } from '@/types/app';
import { json2Ingress, json2Service, yamlString2Objects } from '@/utils/deployYaml2Json';

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/hooks/useClientAppConfig', () => ({
  useClientAppConfig: () => ({ domain: 'example.com', userDomains: [] })
}));
vi.mock('@sealos/shadcn-ui', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  Input: React.forwardRef<HTMLInputElement, any>(function MockInput(props, ref) {
    return <input {...props} ref={ref} />;
  }),
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}));
vi.mock('@sealos/shadcn-ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} />
  )
}));
vi.mock('@sealos/shadcn-ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null
}));
vi.mock('@sealos/shadcn-ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null
}));

afterEach(cleanup);

type Network = AppEditType['networks'][number];
const network = (serviceName?: string): Network => ({
  serviceName,
  networkName: 'demo',
  portName: 'http',
  port: 8000,
  protocol: 'TCP',
  appProtocol: 'HTTP',
  openNodePort: false,
  openPublicDomain: true,
  publicDomain: 'demo-public',
  customDomain: '',
  domain: 'example.com'
});

function setup(networks: Network[]) {
  let form: UseFormReturn<AppEditType>;
  function Harness() {
    form = useForm<AppEditType>({ defaultValues: { appName: 'demo', networks } });
    return <NetworkSection formHook={form} exceededQuotas={[]} handleOpenCostcenter={() => {}} />;
  }
  render(<Harness />);
  return () => form.getValues();
}

const services = (data: AppEditType) => yamlString2Objects(json2Service(data)) as any[];
const ingresses = (data: AppEditType) => yamlString2Objects(json2Ingress(data, [])) as any[];

describe('network Service identity', () => {
  it.each(['demo', undefined])(
    'preserves Service YAML through a public-access round trip (%s)',
    (name) => {
      const getData = setup([network(name)]);
      const beforeServices = services(getData());
      const beforeIngresses = ingresses(getData());
      fireEvent.click(screen.getByRole('switch'));
      expect(services(getData())).toEqual(beforeServices);
      expect(ingresses(getData())).toEqual([]);
      fireEvent.click(screen.getByRole('switch'));
      expect(services(getData())).toEqual(beforeServices);
      expect(ingresses(getData())).toEqual(beforeIngresses);
      expect(ingresses(getData())[0].spec.rules[0].http.paths[0].backend.service.name).toBe(
        beforeServices[0].metadata.name
      );
    }
  );

  it('generates matching Service and Ingress names when enabling a new private application', () => {
    const getData = setup([
      { ...network(), openPublicDomain: false, networkName: '', publicDomain: '' }
    ]);
    const before = services(getData());
    fireEvent.click(screen.getByRole('switch'));
    expect(services(getData())).toEqual(before);
    expect(before[0].metadata.name).toMatch(/^demo-[a-z]{12}$/);
    expect(ingresses(getData())[0].spec.rules[0].http.paths[0].backend.service.name).toBe(
      before[0].metadata.name
    );
  });

  it.each(['WS', 'GRPC', 'HTTP'])('keeps the internal Service when selecting %s', (protocol) => {
    const getData = setup([network('demo')]);
    const before = services(getData());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: protocol } });
    expect(services(getData())).toEqual(before);
    expect(getData().networks[0].appProtocol).toBe(protocol);
  });

  it('does not reuse the ClusterIP name for a port moved into the NodePort group', () => {
    const getData = setup([network('demo'), { ...network('demo'), port: 9000, portName: 'other' }]);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'TCP' } });
    const result = services(getData());
    expect(result).toHaveLength(2);
    expect(result[0].metadata.name).toBe('demo');
    expect(result[1].metadata.name).not.toBe('demo');
    expect(result[1].spec.type).toBe('NodePort');
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(services(getData())).toHaveLength(1);
    expect(services(getData())[0].metadata.name).toBe('demo');
  });

  it('does not reuse a shared NodePort name when moving one port to HTTP', () => {
    const tcp = {
      ...network('demo-nodeport'),
      appProtocol: undefined,
      openNodePort: true,
      openPublicDomain: false,
      nodePort: 30080
    };
    const getData = setup([tcp, { ...tcp, port: 9000, portName: 'other', nodePort: 30090 }]);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'HTTP' } });
    const result = services(getData());
    expect(result).toHaveLength(2);
    expect(result[0].metadata.name).not.toBe('demo-nodeport');
    expect(result[1].metadata.name).toBe('demo-nodeport');
    expect(result[0].spec.ports[0].nodePort).toBeUndefined();
  });
});
