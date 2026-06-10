import { describe, expect, it } from 'vitest';
import {
  APP_GENERATED_NAME_MAX_LENGTH,
  APP_NAME_BASE_MAX_LENGTH,
  K8S_RFC1035_NAME_MAX_LENGTH,
  generateAppName,
  isValidAppNameBase,
  isValidGeneratedAppName
} from '@/utils/appNameValidation';

describe('app name validation', () => {
  it('accepts valid user-entered base names up to the reserved suffix budget', () => {
    const maxLengthBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH - 1)}`;

    expect(isValidAppNameBase('a')).toBe(true);
    expect(isValidAppNameBase('app')).toBe(true);
    expect(isValidAppNameBase('app-1')).toBe(true);
    expect(isValidAppNameBase('hello-world')).toBe(true);
    expect(maxLengthBase).toHaveLength(38);
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
    expect(tooLongBase).toHaveLength(39);
    expect(isValidAppNameBase(tooLongBase)).toBe(false);
  });

  it('generates an RFC 1035-safe app name with room for the pod suffix', () => {
    const generatedName = generateAppName('demo');

    expect(generatedName).toMatch(/^demo-[a-z0-9]{8}$/);
    expect(isValidGeneratedAppName(generatedName)).toBe(true);
  });

  it('keeps generated app names and pod names inside the RFC 1035 max length', () => {
    const maxLengthBase = `a${'b'.repeat(APP_NAME_BASE_MAX_LENGTH - 1)}`;
    const generatedName = generateAppName(maxLengthBase);
    const podName = `${generatedName}-${'c'.repeat(15)}`;

    expect(generatedName).toHaveLength(APP_GENERATED_NAME_MAX_LENGTH);
    expect(isValidGeneratedAppName(generatedName)).toBe(true);
    expect(podName).toHaveLength(K8S_RFC1035_NAME_MAX_LENGTH);
    expect(isValidGeneratedAppName(podName)).toBe(false);
    expect(/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(podName)).toBe(true);
  });
});
