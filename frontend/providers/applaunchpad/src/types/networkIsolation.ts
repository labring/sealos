export type NetworkIsolationRule = ApplicationAllowRule | CidrAllowRule;

export interface ApplicationAllowRule {
  id: string;
  type: 'application';
  sourceWorkspaceId: string;
  sourceWorkspaceName?: string;
  sourceApplicationId: string;
  sourceApplicationName?: string;
}

export interface CidrAllowRule {
  id: string;
  type: 'cidr';
  cidrs: string[];
  allowPublic?: boolean;
}

export interface NetworkIsolationConfig {
  enabled: boolean;
  rules: NetworkIsolationRule[];
}

export interface NetworkIsolationTargetCapabilities {
  hasDomainIngress: boolean;
  hasExternalPort: boolean;
}

export type NetworkIsolationEnforcementState =
  'ready' | 'progressing' | 'degraded' | 'disabled' | 'notConfigured' | 'unsupported';

export type NetworkIsolationScope = 'internal' | 'domain' | 'externalPort' | 'platform';

export interface NetworkIsolationEnforcementIssue {
  code: string;
  scope: NetworkIsolationScope;
  severity: 'info' | 'warning' | 'error';
  message: string;
  conditionType?: string;
  reason?: string;
  owner?: string;
}

export interface NetworkIsolationEnforcement {
  phase: 'Pending' | 'Ready' | 'Degraded' | 'Disabled' | 'NotCreated';
  generation?: number;
  observedGeneration?: number;
  current: boolean;
  overall: NetworkIsolationEnforcementState;
  scopes: {
    internal: NetworkIsolationEnforcementState;
    domain: NetworkIsolationEnforcementState;
    externalPort: NetworkIsolationEnforcementState;
  };
  issues: NetworkIsolationEnforcementIssue[];
}

export interface NetworkIsolationResponse {
  config: NetworkIsolationConfig;
  revision: string;
  target: NetworkIsolationTargetCapabilities & {
    workspaceId: string;
    applicationId: string;
  };
  enforcement: NetworkIsolationEnforcement;
}

export type NetworkIsolationUiStatus = NetworkIsolationEnforcementState;

export const MAX_NETWORK_ISOLATION_RULES = 50;
export const MAX_CIDRS_PER_RULE = 20;

export const createDefaultNetworkIsolationConfig = (): NetworkIsolationConfig => ({
  enabled: false,
  rules: []
});
