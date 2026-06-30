import * as k8s from '@kubernetes/client-node';
import yaml from 'js-yaml';
import { K8sApiDefault } from './kubernetes';
import {
  findMatchingCertificateDomain,
  normalizeCustomDomainCertificateDomains,
  normalizeDomainName
} from '@/utils/custom-domain';

const DATA_SOURCE_NAMESPACE = 'sealos-system';
const DATA_SOURCE_NAME = 'custom-domain-certificate';
const DATA_SOURCE_KEY = 'config.yaml';
const DEFAULT_CERTIFICATE_SECRET_NAME = 'wildcard-cert';
const CERT_MANAGER_GROUP = 'cert-manager.io';
const CERT_MANAGER_VERSION = 'v1';
const CERT_MANAGER_CERTIFICATE_PLURAL = 'certificates';
const HIGRESS_NAMESPACE = 'higress-system';
const HIGRESS_HTTPS_CONFIGMAP_NAME = 'higress-https';
const HIGRESS_CERT_KEY = 'cert';

export type CustomDomainCertificateCoverageStatus =
  'covered' | 'pendingSync' | 'notConfigured' | 'unsupported';

export type CustomDomainCertificateCoverageMissingTarget = 'certificate' | 'higress';

export type CustomDomainCertificateCoverageResult = {
  customDomain: string;
  status: CustomDomainCertificateCoverageStatus;
  matchingDomain?: string;
  missingIn?: CustomDomainCertificateCoverageMissingTarget[];
  reason?: string;
};

type DataSourceDomain = {
  name?: unknown;
};

type DataSourceConfig = {
  domains?: unknown;
  lastAppliedDomains?: unknown;
};

type CertificateCustomObject = {
  metadata?: {
    name?: string;
  };
  spec?: {
    secretName?: string;
    dnsNames?: unknown;
  };
};

type CertificateListBody = {
  items?: CertificateCustomObject[];
};

type HigressCredentialConfig = {
  domains?: unknown;
  tlsSecret?: unknown;
};

type HigressCertConfig = {
  credentialConfig?: unknown;
};

export type CustomDomainCertificateRuntimeState = {
  desiredDomains: string[];
  certificateDnsNames: string[];
  higressDomains: string[];
  certificateFound?: boolean;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const getTlsSecretRef = (tlsSecretName: string) =>
  tlsSecretName.includes('/') ? tlsSecretName : `${DATA_SOURCE_NAMESPACE}/${tlsSecretName}`;

export const parseCustomDomainCertificateDataSource = (rawValue?: string) => {
  if (!rawValue?.trim()) return [];

  const parsed = yaml.load(rawValue) as DataSourceConfig | undefined;
  if (!isPlainObject(parsed)) return [];

  const rawDomains = Array.isArray(parsed.domains) ? parsed.domains : [];
  const domains = rawDomains
    .map((item: DataSourceDomain | string) => {
      if (typeof item === 'string') return item;
      if (!isPlainObject(item)) return '';
      return typeof item.name === 'string' ? item.name : '';
    })
    .filter(Boolean);

  return normalizeCustomDomainCertificateDomains(domains);
};

export const parseHigressCertificateDomains = (
  rawValue: string | undefined,
  tlsSecretName: string
) => {
  if (!rawValue?.trim()) return [];

  const parsed = yaml.load(rawValue) as HigressCertConfig | undefined;
  if (!isPlainObject(parsed) || !Array.isArray(parsed.credentialConfig)) return [];

  const tlsSecretRef = getTlsSecretRef(tlsSecretName);
  const credential = (parsed.credentialConfig as HigressCredentialConfig[]).find(
    (item) => isPlainObject(item) && item.tlsSecret === tlsSecretRef
  );

  return normalizeCustomDomainCertificateDomains(readStringArray(credential?.domains));
};

export const getCustomDomainCertificateCoverageFromState = ({
  customDomain,
  state
}: {
  customDomain: string;
  state: CustomDomainCertificateRuntimeState;
}): CustomDomainCertificateCoverageResult => {
  const normalizedDomain = normalizeDomainName(customDomain);
  const matchingDomain = findMatchingCertificateDomain(normalizedDomain, state.desiredDomains);

  if (!matchingDomain) {
    return {
      customDomain: normalizedDomain,
      status: 'notConfigured'
    };
  }

  const missingIn: CustomDomainCertificateCoverageMissingTarget[] = [];
  if (!findMatchingCertificateDomain(normalizedDomain, state.certificateDnsNames)) {
    missingIn.push('certificate');
  }
  if (!findMatchingCertificateDomain(normalizedDomain, state.higressDomains)) {
    missingIn.push('higress');
  }

  return {
    customDomain: normalizedDomain,
    status: missingIn.length > 0 ? 'pendingSync' : 'covered',
    matchingDomain,
    ...(missingIn.length > 0 ? { missingIn } : {})
  };
};

const findCertificateBySecretName = async (
  customObjectsApi: k8s.CustomObjectsApi,
  tlsSecretName: string
) => {
  const response = (await customObjectsApi.listNamespacedCustomObject(
    CERT_MANAGER_GROUP,
    CERT_MANAGER_VERSION,
    DATA_SOURCE_NAMESPACE,
    CERT_MANAGER_CERTIFICATE_PLURAL
  )) as { body: CertificateListBody };

  const certificates = response.body.items ?? [];
  const matches = certificates.filter(
    (certificate) => certificate.spec?.secretName === tlsSecretName
  );
  if (matches.length > 1) {
    throw new Error(`Multiple Certificates reference ${tlsSecretName}`);
  }

  return matches[0];
};

export const readCustomDomainCertificateRuntimeState = async ({
  tlsSecretName = DEFAULT_CERTIFICATE_SECRET_NAME
}: {
  tlsSecretName?: string;
} = {}): Promise<CustomDomainCertificateRuntimeState> => {
  const kc = K8sApiDefault();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);

  const [dataSourceConfigMap, certificate, higressConfigMap] = await Promise.all([
    coreApi.readNamespacedConfigMap(DATA_SOURCE_NAME, DATA_SOURCE_NAMESPACE),
    findCertificateBySecretName(customObjectsApi, tlsSecretName),
    coreApi.readNamespacedConfigMap(HIGRESS_HTTPS_CONFIGMAP_NAME, HIGRESS_NAMESPACE)
  ]);

  return {
    desiredDomains: parseCustomDomainCertificateDataSource(
      dataSourceConfigMap.body.data?.[DATA_SOURCE_KEY]
    ),
    certificateDnsNames: normalizeCustomDomainCertificateDomains(
      readStringArray(certificate?.spec?.dnsNames)
    ),
    certificateFound: Boolean(certificate),
    higressDomains: parseHigressCertificateDomains(
      higressConfigMap.body.data?.[HIGRESS_CERT_KEY],
      tlsSecretName
    )
  };
};

export const getCustomDomainCertificateCoverage = async ({
  customDomain,
  tlsSecretName = DEFAULT_CERTIFICATE_SECRET_NAME
}: {
  customDomain: string;
  tlsSecretName?: string;
}): Promise<CustomDomainCertificateCoverageResult> => {
  try {
    const state = await readCustomDomainCertificateRuntimeState({ tlsSecretName });
    if (!state.certificateFound) {
      return {
        customDomain: normalizeDomainName(customDomain),
        status: 'unsupported',
        reason: `Certificate for ${tlsSecretName} not found`
      };
    }

    return getCustomDomainCertificateCoverageFromState({
      customDomain,
      state
    });
  } catch (error: any) {
    console.error('[customDomainCertificate] Failed to read runtime state.', error?.body || error);
    return {
      customDomain: normalizeDomainName(customDomain),
      status: 'unsupported',
      reason:
        error?.body?.message || error?.message || 'Custom domain certificate state is unavailable'
    };
  }
};
