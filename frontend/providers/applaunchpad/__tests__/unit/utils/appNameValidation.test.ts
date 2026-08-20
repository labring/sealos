import { describe, expect, it } from 'vitest';
import {
  APP_NAME_BASE_MAX_LENGTH,
  K8S_RFC1035_NAME_MAX_LENGTH,
  getInvalidGeneratedAppNameMessage,
  getInvalidRfc1035ServiceNameMessage,
  generateAppName,
  isValidAppNameBase,
  isValidGeneratedAppName,
  isValidRfc1035Name
} from '@/utils/appNameValidation';

describe('app name validation', () => {
  it('accepts valid user-entered base names up to the reserved suffix budget', () => {
    const maxLengthBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH - 1)}`;

    expect(isValidAppNameBase('a')).toBe(true);
    expect(isValidAppNameBase('app')).toBe(true);
    expect(isValidAppNameBase('app-1')).toBe(true);
    expect(isValidAppNameBase('hello-world')).toBe(true);
    expect(maxLengthBase).toHaveLength(25);
    expect(isValidAppNameBase(maxLengthBase)).toBe(true);
  });

  it('rejects base names that would break RFC 1035 or reserved suffix budgets', () => {
    const tooLongBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH)}`;

    expect(isValidAppNameBase('')).toBe(false);
    expect(isValidAppNameBase('1app')).toBe(false);
    expect(isValidAppNameBase('App')).toBe(false);
    expect(isValidAppNameBase('app_1')).toBe(false);
    expect(isValidAppNameBase('-app')).toBe(false);
    expect(isValidAppNameBase('app-')).toBe(false);
    expect(isValidAppNameBase('app.name')).toBe(false);
    expect(isValidAppNameBase('app name')).toBe(false);
    expect(tooLongBase).toHaveLength(26);
    expect(isValidAppNameBase(tooLongBase)).toBe(false);
  });

  it('uses the user-entered app name without appending a random suffix', () => {
    const generatedName = generateAppName('demo');

    expect(generatedName).toBe('demo');
    expect(isValidGeneratedAppName(generatedName)).toBe(true);
  });

  it('keeps app names, generated nodeport service names, and pod names inside RFC 1035', () => {
    const maxLengthBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH - 1)}`;
    const generatedName = generateAppName(maxLengthBase);
    const serviceName = `${generatedName}-nodeport-${'c'.repeat(12)}`;
    const podName = `${serviceName}-${'d'.repeat(15)}`;

    expect(generatedName).toHaveLength(APP_NAME_BASE_MAX_LENGTH);
    expect(isValidGeneratedAppName(generatedName)).toBe(true);
    expect(serviceName).toHaveLength(47);
    expect(podName).toHaveLength(K8S_RFC1035_NAME_MAX_LENGTH);
    expect(isValidGeneratedAppName(podName)).toBe(false);
    expect(/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(podName)).toBe(true);
  });

  it('reports app names that exceed the generated name budget before apply', () => {
    const tooLongBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH)}`;

    expect(isValidRfc1035Name(tooLongBase)).toBe(true);
    expect(getInvalidGeneratedAppNameMessage(tooLongBase)).toContain(
      `Use ${APP_NAME_BASE_MAX_LENGTH} characters or fewer`
    );
  });

  it('reports invalid service names before the Kubernetes apply step', () => {
    expect(
      getInvalidRfc1035ServiceNameMessage([
        {
          kind: 'Deployment',
          metadata: { name: '111111hello-world' }
        },
        {
          kind: 'Service',
          metadata: { name: '111111hello-world-yanexremmrtr' }
        }
      ])
    ).toContain('Service "111111hello-world-yanexremmrtr" has an invalid name');
  });
});
