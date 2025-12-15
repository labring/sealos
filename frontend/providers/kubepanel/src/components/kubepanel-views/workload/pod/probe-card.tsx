import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Probe } from '@/k8slens/kube-object';
import { ConfigProvider, Input, InputNumber, Select } from 'antd';
import { isEqual } from 'lodash';

interface ProbeCardProps {
  title: string;
  probe?: ExtendedProbe;
  onChange?: (probe?: ExtendedProbe) => void;
  isEditing?: boolean;
}

type ProbeType = 'none' | 'httpGet' | 'tcpSocket' | 'exec' | 'grpc';

export type ExtendedProbe = Probe & {
  grpc?: {
    port: number;
    service?: string;
  };
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseHttpUrl = (
  url: string
): { scheme: string; host?: string; port?: number; path: string } => {
  try {
    // Handle special case like "http://:8080/" where there's no hostname
    const match = url.match(/^(https?):\/\/([^/:]*)?(?::(\d+))?(.*)$/);
    if (match) {
      const [, scheme, host, port, pathAndQuery] = match;
      return {
        scheme: scheme.toUpperCase(),
        host: host || undefined,
        port: port ? parseInt(port) : undefined,
        path: pathAndQuery || '/'
      };
    }

    // Fallback to URL parser for standard URLs
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    return {
      scheme: urlObj.protocol.replace(':', '').toUpperCase(),
      host: urlObj.hostname || undefined,
      port: urlObj.port ? parseInt(urlObj.port) : undefined,
      path: urlObj.pathname || '/'
    };
  } catch {
    return { scheme: 'HTTP', host: undefined, port: undefined, path: '/' };
  }
};

const buildHttpUrl = (scheme: string, host?: string, port?: number, path: string = '/'): string => {
  const protocol = scheme.toLowerCase();
  if (!host) {
    return `${protocol}://:${port || 80}${path}`;
  }
  const portStr = port && port !== 80 && port !== 443 ? `:${port}` : '';
  return `${protocol}://${host}${portStr}${path}`;
};

const ProbeCard = ({ title, probe, onChange, isEditing = false }: ProbeCardProps) => {
  const numberStyles = useMemo(
    () => ({
      input: {
        textAlign: 'center' as const,
        padding: '2px 0',
        height: 22,
        lineHeight: '18px',
        fontSize: 12,
        fontWeight: 600,
        background: '#fff',
        borderRadius: 4,
        border: '1px solid #D9D9D9',
        width: 34,
        minWidth: 34,
        maxWidth: 34
      }
    }),
    []
  );

  const [probeType, setProbeType] = useState<ProbeType>('none');
  const [httpUrl, setHttpUrl] = useState('');
  const [httpFields, setHttpFields] = useState({
    scheme: 'HTTP',
    host: '',
    port: 80 as number | undefined,
    path: '/'
  });
  const [tcpPort, setTcpPort] = useState<number | undefined>(undefined);
  const [grpcFields, setGrpcFields] = useState({
    port: undefined as number | undefined,
    service: ''
  });
  const [execCommand, setExecCommand] = useState('');
  const [timing, setTiming] = useState({
    initialDelaySeconds: 0,
    periodSeconds: 10,
    timeoutSeconds: 1,
    successThreshold: 1,
    failureThreshold: 3
  });

  const deriveProbeType = (target?: ExtendedProbe): ProbeType => {
    if (!target) return 'none';
    if (target.httpGet) return 'httpGet';
    if (target.tcpSocket) return 'tcpSocket';
    if (target.exec) return 'exec';
    if (target.grpc) return 'grpc';
    return 'none';
  };

  const resetDraft = (target?: ExtendedProbe) => {
    setProbeType(deriveProbeType(target));

    setTiming({
      initialDelaySeconds: target?.initialDelaySeconds ?? 0,
      periodSeconds: target?.periodSeconds ?? 10,
      timeoutSeconds: target?.timeoutSeconds ?? 1,
      successThreshold: target?.successThreshold ?? 1,
      failureThreshold: target?.failureThreshold ?? 3
    });

    const httpGet = target?.httpGet;
    setHttpFields({
      scheme: httpGet?.scheme || 'HTTP',
      host: httpGet?.host || '',
      port: toNumberOrUndefined(httpGet?.port) ?? 80,
      path: httpGet?.path || '/'
    });

    // Build URL for editing
    if (httpGet) {
      setHttpUrl(
        buildHttpUrl(
          httpGet.scheme || 'HTTP',
          httpGet.host,
          toNumberOrUndefined(httpGet.port),
          httpGet.path || '/'
        )
      );
    } else {
      setHttpUrl('');
    }

    setTcpPort(toNumberOrUndefined(target?.tcpSocket?.port));
    setExecCommand(target?.exec?.command?.join(' ') || '');
    setGrpcFields({
      port: toNumberOrUndefined(target?.grpc?.port),
      service: target?.grpc?.service || ''
    });
  };

  useEffect(() => {
    // Refresh draft when source probe changes while not editing
    if (!isEditing) {
      resetDraft(probe);
    }
  }, [probe, isEditing]);

  useEffect(() => {
    // Initialize draft when entering edit mode
    if (isEditing) {
      resetDraft(probe);
    }
  }, [isEditing, probe]);

  const draftProbe = useMemo(() => {
    const base = { ...timing } as ExtendedProbe;
    switch (probeType) {
      case 'httpGet':
        return {
          ...base,
          httpGet: {
            scheme: httpFields.scheme || 'HTTP',
            host: httpFields.host || undefined,
            port: httpFields.port ?? 80,
            path: httpFields.path || '/'
          }
        } as ExtendedProbe;
      case 'tcpSocket':
        return {
          ...base,
          tcpSocket: {
            port: tcpPort ?? undefined
          }
        } as ExtendedProbe;
      case 'exec':
        return {
          ...base,
          exec: {
            command: execCommand.trim() ? execCommand.trim().split(/\s+/) : []
          }
        } as ExtendedProbe;
      case 'grpc':
        return {
          ...base,
          grpc: {
            port: grpcFields.port ?? undefined,
            ...(grpcFields.service ? { service: grpcFields.service } : {})
          }
        } as ExtendedProbe;
      default:
        return undefined;
    }
  }, [
    execCommand,
    grpcFields.port,
    grpcFields.service,
    httpFields.host,
    httpFields.path,
    httpFields.port,
    httpFields.scheme,
    probeType,
    tcpPort,
    timing
  ]);

  const displayProbe: ExtendedProbe | undefined = probe;

  const deriveTypeLabel = (type: ProbeType): string => {
    switch (type) {
      case 'httpGet':
        return 'HTTP GET';
      case 'tcpSocket':
        return 'TCP Socket';
      case 'exec':
        return 'Exec';
      case 'grpc':
        return 'gRPC';
      default:
        return 'Null';
    }
  };

  let actionDescription = '';
  if (displayProbe?.httpGet) {
    const { scheme = 'HTTP', host, port, path } = displayProbe.httpGet;
    const url = `${scheme.toLowerCase()}://${host || ''}${typeof port === 'number' || !host ? `:${port}` : ''}${path}`;
    actionDescription = `${url}`;
  } else if (displayProbe?.exec && displayProbe.exec.command) {
    actionDescription = `[${displayProbe.exec.command.join(', ')}]`;
  } else if (displayProbe?.tcpSocket) {
    actionDescription = `:${displayProbe.tcpSocket.port}`;
  } else if (displayProbe?.grpc) {
    actionDescription = `:${displayProbe.grpc.port}`;
  }

  const lastSentRef = useRef<ExtendedProbe | undefined>();

  useEffect(() => {
    if (!isEditing) {
      lastSentRef.current = undefined;
      return;
    }
    if (!isEqual(draftProbe ?? null, lastSentRef.current ?? null)) {
      lastSentRef.current = draftProbe;
      onChange?.(draftProbe);
    }
  }, [draftProbe, isEditing, onChange]);

  if (!displayProbe && !isEditing) {
    return (
      <div className="flex-1 min-w-75 bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E8E8] flex items-center justify-between">
        <div className="text-gray-500 text-xs font-medium">{title}</div>
        <div className="text-gray-400 text-sm">-</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-75 bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E8E8]">
      <div className="text-gray-500 text-xs font-medium mb-2">{title}</div>

      {(isEditing || displayProbe) && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-2" style={{ minHeight: '24px' }}>
            {!isEditing && displayProbe && (
              <>
                <span
                  className="text-[#262626] text-sm font-medium shrink-0 w-28"
                  style={{ paddingLeft: '8px' }}
                >
                  {deriveTypeLabel(deriveProbeType(displayProbe))}
                </span>
                <span
                  className="text-[#262626] text-sm font-medium flex-1 truncate"
                  style={{ paddingLeft: '8px' }}
                >
                  {actionDescription}
                </span>
              </>
            )}

            {isEditing && (
              <>
                <Select
                  className="w-28"
                  size="small"
                  value={probeType}
                  onChange={(val) => setProbeType(val as ProbeType)}
                  options={[
                    { value: 'none', label: 'Null' },
                    { value: 'httpGet', label: 'HTTP GET' },
                    { value: 'tcpSocket', label: 'TCP Socket' },
                    { value: 'exec', label: 'Exec' },
                    { value: 'grpc', label: 'gRPC' }
                  ]}
                />
                {probeType === 'httpGet' && (
                  <Input
                    size="small"
                    placeholder="http://example.com:8080/path (optional host)"
                    className="flex-1"
                    value={httpUrl}
                    onChange={(e) => {
                      setHttpUrl(e.target.value);
                      const parsed = parseHttpUrl(e.target.value);
                      setHttpFields((prev) => ({
                        ...prev,
                        scheme: parsed.scheme,
                        host: parsed.host || '',
                        port: parsed.port,
                        path: parsed.path
                      }));
                    }}
                  />
                )}
                {probeType === 'tcpSocket' && (
                  <InputNumber
                    size="small"
                    min={0}
                    placeholder="Port"
                    className="w-25"
                    value={tcpPort}
                    onChange={(val) => setTcpPort(val ?? undefined)}
                  />
                )}
                {probeType === 'grpc' && (
                  <>
                    <InputNumber
                      size="small"
                      min={0}
                      placeholder="Port"
                      className="w-25"
                      value={grpcFields.port}
                      onChange={(val) =>
                        setGrpcFields((prev) => ({ ...prev, port: val ?? undefined }))
                      }
                    />
                    <Input
                      size="small"
                      placeholder="Service (optional)"
                      className="flex-1 min-w-30"
                      value={grpcFields.service}
                      onChange={(e) =>
                        setGrpcFields((prev) => ({ ...prev, service: e.target.value }))
                      }
                    />
                  </>
                )}
                {probeType === 'exec' && (
                  <Input
                    size="small"
                    placeholder={'Command (e.g. /bin/sh -c "echo ok")'}
                    className="flex-1"
                    value={execCommand}
                    onChange={(e) => setExecCommand(e.target.value)}
                  />
                )}
              </>
            )}
          </div>

          <div className="text-gray-500 text-xs leading-5 flex flex-col gap-1">
            <div className="flex items-center gap-1 flex-wrap" style={{ minHeight: '22px' }}>
              <span>First probe</span>
              {isEditing ? (
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        controlWidth: 36,
                        paddingInlineSM: 0
                      }
                    }
                  }}
                >
                  <InputNumber
                    size="small"
                    min={0}
                    controls={false}
                    bordered={false}
                    styles={numberStyles}
                    className="text-[#262626] text-xs font-semibold text-center"
                    value={timing.initialDelaySeconds}
                    onChange={(val) =>
                      setTiming((prev) => ({ ...prev, initialDelaySeconds: val ?? 0 }))
                    }
                  />
                </ConfigProvider>
              ) : (
                <span className="inline-block w-9 font-semibold text-[#262626] text-center">
                  {displayProbe?.initialDelaySeconds ?? 0}
                </span>
              )}
              <span>s after startup, then every</span>
              {isEditing ? (
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        controlWidth: 36,
                        paddingInlineSM: 0
                      }
                    }
                  }}
                >
                  <InputNumber
                    size="small"
                    min={1}
                    controls={false}
                    bordered={false}
                    styles={numberStyles}
                    className="text-[#262626] text-xs font-semibold text-center"
                    value={timing.periodSeconds}
                    onChange={(val) => setTiming((prev) => ({ ...prev, periodSeconds: val ?? 1 }))}
                  />
                </ConfigProvider>
              ) : (
                <span className="inline-block w-9 font-semibold text-[#262626] text-center">
                  {displayProbe?.periodSeconds ?? 0}
                </span>
              )}
              <span>s with</span>
              {isEditing ? (
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        controlWidth: 36,
                        paddingInlineSM: 0
                      }
                    }
                  }}
                >
                  <InputNumber
                    size="small"
                    min={1}
                    controls={false}
                    bordered={false}
                    styles={numberStyles}
                    className="text-[#262626] text-xs font-semibold text-center"
                    value={timing.timeoutSeconds}
                    onChange={(val) => setTiming((prev) => ({ ...prev, timeoutSeconds: val ?? 1 }))}
                  />
                </ConfigProvider>
              ) : (
                <span className="inline-block w-9 font-semibold text-[#262626] text-center">
                  {displayProbe?.timeoutSeconds ?? 0}
                </span>
              )}
              <span>s timeout.</span>
            </div>

            <div className="flex items-center gap-1 flex-wrap" style={{ minHeight: '22px' }}>
              <span>Status changes after</span>
              {isEditing ? (
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        controlWidth: 36,
                        paddingInlineSM: 0
                      }
                    }
                  }}
                >
                  <InputNumber
                    size="small"
                    min={1}
                    controls={false}
                    bordered={false}
                    styles={numberStyles}
                    className="text-[#262626] text-xs font-semibold text-center"
                    value={timing.successThreshold}
                    onChange={(val) =>
                      setTiming((prev) => ({ ...prev, successThreshold: val ?? 1 }))
                    }
                  />
                </ConfigProvider>
              ) : (
                <span className="inline-block w-9 font-semibold text-[#262626] text-center">
                  {displayProbe?.successThreshold ?? 0}
                </span>
              )}
              <span>success or</span>
              {isEditing ? (
                <ConfigProvider
                  theme={{
                    components: {
                      InputNumber: {
                        controlWidth: 36,
                        paddingInlineSM: 0
                      }
                    }
                  }}
                >
                  <InputNumber
                    size="small"
                    min={1}
                    controls={false}
                    bordered={false}
                    styles={numberStyles}
                    className="text-[#262626] text-xs font-semibold text-center"
                    value={timing.failureThreshold}
                    onChange={(val) =>
                      setTiming((prev) => ({ ...prev, failureThreshold: val ?? 1 }))
                    }
                  />
                </ConfigProvider>
              ) : (
                <span className="inline-block w-9 font-semibold text-[#262626] text-center">
                  {displayProbe?.failureThreshold ?? 0}
                </span>
              )}
              <span>consecutive failures.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProbeCard;
